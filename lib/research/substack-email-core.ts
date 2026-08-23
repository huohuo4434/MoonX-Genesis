import { createHash } from "node:crypto";

export const SUBSTACK_MONITOR_BASELINE_ISO = "2026-08-22T04:35:16.763Z";
export const SUBSTACK_ALLOWED_SENDER = "agentmat@substack.com";
export const SUBSTACK_INTERNAL_SOURCE = "SUBSTACK_CYCLE";
export const SUBSTACK_INTERNAL_RESEARCHER = "cycle_forecaster_internal";

const MAX_EMAILS_PER_BATCH = 20;
const MAX_MESSAGE_ID = 240;
const MAX_SUBJECT = 300;
const MAX_BODY_TEXT = 150_000;
const MAX_SOURCE_URL = 2_000;
const IGNORED_SUBJECT = /(?:welcome to agentmat|payment receipt|subscriptions? for you to give away|verification code|new follower on substack|confirm your subscription|unsubscribe)/i;

export type SubstackEmailInput = {
  messageId: string;
  threadId?: string;
  from: string;
  subject: string;
  date: string;
  bodyText: string;
  sourceUrl?: string;
};

export type PreparedSubstackEmail = {
  id: string;
  source: typeof SUBSTACK_INTERNAL_SOURCE;
  username: typeof SUBSTACK_INTERNAL_RESEARCHER;
  postId: string;
  postUrl: string;
  postedAt: string;
  text: string;
  parsed: Record<string, unknown>;
};

export type RejectedSubstackEmail = {
  messageId: string;
  reason: "MALFORMED_EMAIL" | "SENDER_NOT_ALLOWED" | "BEFORE_BASELINE" | "FUTURE_DATE" | "NON_RESEARCH_EMAIL" | "DUPLICATE_IN_BATCH";
};

export function processedMessageIdsAfterIngest(
  accepted: PreparedSubstackEmail[],
  rejected: RejectedSubstackEmail[],
): string[] {
  const processed = new Set(accepted.map((email) => email.postId));
  for (const row of rejected) {
    if (row.reason !== "FUTURE_DATE" && row.messageId !== "UNKNOWN") processed.add(row.messageId);
  }
  return [...processed];
}

export function extractEmailAddress(value: string): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  const bracketed = normalized.match(/<([^<>\s]+@[^<>\s]+)>/);
  if (bracketed?.[1]) return bracketed[1];
  const plain = normalized.match(/(?:^|\s)([^\s<>]+@[^\s<>]+)(?:$|\s)/);
  return plain?.[1] ?? normalized;
}

function cleanText(value: unknown, maximum: number): string {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, maximum);
}

function safeSourceUrl(value: unknown): string {
  const candidate = cleanText(value, MAX_SOURCE_URL);
  if (!candidate) return "https://agentmat.substack.com/";
  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || (hostname !== "agentmat.substack.com" && hostname !== "substack.com")) {
      return "https://agentmat.substack.com/";
    }
    url.hash = "";
    return url.toString();
  } catch {
    return "https://agentmat.substack.com/";
  }
}

function contentHash(subject: string, bodyText: string): string {
  return createHash("sha256").update(`${subject}\n${bodyText}`, "utf8").digest("hex");
}

export function prepareSubstackEmails(input: unknown, now = new Date()): {
  accepted: PreparedSubstackEmail[];
  rejected: RejectedSubstackEmail[];
  truncatedCount: number;
} {
  const rows = Array.isArray(input) ? input : [];
  const bounded = rows.slice(0, MAX_EMAILS_PER_BATCH);
  const rejected: RejectedSubstackEmail[] = [];
  const accepted: PreparedSubstackEmail[] = [];
  const seen = new Set<string>();
  const baselineMs = Date.parse(SUBSTACK_MONITOR_BASELINE_ISO);
  const futureLimitMs = now.getTime() + 10 * 60_000;

  for (const raw of bounded) {
    const row = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const messageId = cleanText(row.messageId, MAX_MESSAGE_ID);
    const threadId = cleanText(row.threadId, MAX_MESSAGE_ID);
    const sender = extractEmailAddress(cleanText(row.from, 500));
    const subject = cleanText(row.subject, MAX_SUBJECT);
    const bodyText = cleanText(row.bodyText, MAX_BODY_TEXT);
    const postedAtMs = Date.parse(cleanText(row.date, 100));

    if (!messageId || !subject || !bodyText || !Number.isFinite(postedAtMs)) {
      rejected.push({ messageId: messageId || "UNKNOWN", reason: "MALFORMED_EMAIL" });
      continue;
    }
    if (seen.has(messageId)) {
      rejected.push({ messageId, reason: "DUPLICATE_IN_BATCH" });
      continue;
    }
    seen.add(messageId);
    if (sender !== SUBSTACK_ALLOWED_SENDER) {
      rejected.push({ messageId, reason: "SENDER_NOT_ALLOWED" });
      continue;
    }
    if (postedAtMs <= baselineMs) {
      rejected.push({ messageId, reason: "BEFORE_BASELINE" });
      continue;
    }
    if (postedAtMs > futureLimitMs) {
      rejected.push({ messageId, reason: "FUTURE_DATE" });
      continue;
    }
    if (IGNORED_SUBJECT.test(subject)) {
      rejected.push({ messageId, reason: "NON_RESEARCH_EMAIL" });
      continue;
    }

    const digest = contentHash(subject, bodyText);
    accepted.push({
      id: `substack-${createHash("sha256").update(messageId).digest("hex").slice(0, 32)}`,
      source: SUBSTACK_INTERNAL_SOURCE,
      username: SUBSTACK_INTERNAL_RESEARCHER,
      postId: messageId,
      postUrl: safeSourceUrl(row.sourceUrl),
      postedAt: new Date(postedAtMs).toISOString(),
      text: bodyText,
      parsed: {
        kind: "SUBSTACK_EMAIL_RESEARCH",
        publicSourceLabel: "周期预测师",
        subject,
        threadId: threadId || null,
        contentHash: digest,
        visibility: "internal",
        reviewStatus: "PENDING_REVIEW",
        researchOnly: true,
        consensusEligible: false,
        directionAuthority: false,
        directTradingAllowed: false,
        historicalRewriteAllowed: false,
        originalExplicitness: "UNREVIEWED",
      },
    });
  }

  return {
    accepted,
    rejected,
    truncatedCount: Math.max(0, rows.length - bounded.length),
  };
}
