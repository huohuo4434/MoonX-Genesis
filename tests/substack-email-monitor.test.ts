import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractEmailAddress,
  prepareSubstackEmails,
  processedMessageIdsAfterIngest,
  SUBSTACK_ALLOWED_SENDER,
  SUBSTACK_MONITOR_BASELINE_ISO,
} from "../lib/research/substack-email-core";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const now = new Date("2026-08-23T09:00:00.000Z");

function validEmail(overrides: Record<string, unknown> = {}) {
  return {
    messageId: "gmail-message-1",
    threadId: "gmail-thread-1",
    from: `AgentMat <${SUBSTACK_ALLOWED_SENDER}>`,
    subject: "BTC cycle update for September",
    date: "2026-08-23T08:00:00.000Z",
    bodyText: "BTC remains inside a defined cycle window. Exact levels are stated in the subscriber email.",
    sourceUrl: "https://agentmat.substack.com/p/example",
    ...overrides,
  };
}

test("sender extraction is exact and the allowlist accepts only AgentMat publication mail", () => {
  assert.equal(extractEmailAddress("AgentMat <agentmat@substack.com>"), SUBSTACK_ALLOWED_SENDER);
  assert.equal(extractEmailAddress("other@substack.com"), "other@substack.com");
  const prepared = prepareSubstackEmails([validEmail(), validEmail({ messageId: "evil", from: "AgentMat <evil@example.com>" })], now);
  assert.equal(prepared.accepted.length, 1);
  assert.equal(prepared.rejected[0]?.reason, "SENDER_NOT_ALLOWED");
});

test("baseline, future dates, duplicate ids and non-research subjects fail closed", () => {
  const prepared = prepareSubstackEmails([
    validEmail({ messageId: "old", date: SUBSTACK_MONITOR_BASELINE_ISO }),
    validEmail({ messageId: "future", date: "2026-08-23T10:00:01.000Z" }),
    validEmail({ messageId: "receipt", subject: "Your payment receipt from AgentMat" }),
    validEmail({ messageId: "same" }),
    validEmail({ messageId: "same" }),
  ], now);
  assert.equal(prepared.accepted.length, 1);
  assert.deepEqual(prepared.rejected.map((row) => row.reason), ["BEFORE_BASELINE", "FUTURE_DATE", "NON_RESEARCH_EMAIL", "DUPLICATE_IN_BATCH"]);
});

test("accepted mail is anonymous, internal, research-only and not executable", () => {
  const prepared = prepareSubstackEmails([validEmail()], now).accepted[0];
  assert.ok(prepared);
  assert.equal(prepared.username, "cycle_forecaster_internal");
  assert.equal(prepared.parsed.publicSourceLabel, "周期预测师");
  assert.equal(prepared.parsed.visibility, "internal");
  assert.equal(prepared.parsed.consensusEligible, false);
  assert.equal(prepared.parsed.directionAuthority, false);
  assert.equal(prepared.parsed.directTradingAllowed, false);
  assert.doesNotMatch(JSON.stringify(prepared.parsed), /agentmat/i);
});

test("only exact processed ids are acknowledged and a future-dated rejection remains retryable", () => {
  const prepared = prepareSubstackEmails([
    validEmail({ messageId: "accepted" }),
    validEmail({ messageId: "future", date: "2026-08-23T10:00:01.000Z" }),
    validEmail({ messageId: "receipt", subject: "Your payment receipt from AgentMat" }),
  ], now);
  assert.deepEqual(processedMessageIdsAfterIngest(prepared.accepted, prepared.rejected).sort(), ["accepted", "receipt"]);
});

test("route and Apps Script keep separate secrets, exact filtering and retry-safe labels", () => {
  const route = read("app/api/internal/substack-intelligence/ingest/route.ts");
  const server = read("lib/research/substack-email-ingest.server.ts");
  const script = read("tools/substack-monitor/Code.gs");
  const manifest = read("tools/substack-monitor/appsscript.json");
  const xSignals = read("lib/trading-signals/external-analyst-signals.ts");
  assert.match(route, /MOOX_SUBSTACK_INGEST_SECRET/);
  assert.doesNotMatch(route, /CRON_SECRET|MOOX_X_COLLECTOR_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /Buffer\.byteLength\(rawBody, "utf8"\) > MAX_BODY_BYTES/);
  assert.match(script, /from:agentmat@substack\.com/);
  assert.match(script, /sender !== MOOX_AGENTMAT_SENDER/);
  assert.match(script, /everyMinutes\(30\)/);
  assert.doesNotMatch(script, /-label:|addLabel\(/);
  assert.match(script, /processedMessageIds/);
  assert.match(script, /MOOX_MAX_REQUEST_BYTES = 1750000/);
  assert.match(script, /url !== MOOX_EXPECTED_INGEST_URL/);
  assert.match(script, /gmail\.googleapis\.com\/gmail\/v1\/users\/me/);
  assert.doesNotMatch(script, /GmailApp/);
  assert.match(manifest, /"serviceId": "gmail"/);
  assert.match(manifest, /"version": "v1"/);
  assert.match(manifest, /https:\/\/www\.googleapis\.com\/auth\/gmail\.readonly/);
  assert.doesNotMatch(manifest, /https:\/\/mail\.google\.com\//);
  assert.match(server, /ON CONFLICT \(source, post_id\) DO NOTHING/);
  assert.ok((xSignals.match(/source <> 'SUBSTACK_CYCLE'/g) ?? []).length >= 3);
  const combined = `${route}\n${server}\n${script}`;
  assert.doesNotMatch(combined, /placeBitget|submitOrder|executeOrder|LIVE1000|paptrading/);
});
