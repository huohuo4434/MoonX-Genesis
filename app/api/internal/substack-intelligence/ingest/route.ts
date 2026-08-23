import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prepareSubstackEmails, processedMessageIdsAfterIngest } from "@/lib/research/substack-email-core";
import { ingestPreparedSubstackEmails } from "@/lib/research/substack-email-ingest.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 2_000_000;

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function requestSecret(request: NextRequest): string {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.MOOX_SUBSTACK_INGEST_SECRET?.trim() ?? "";
  if (configuredSecret.length < 32) {
    return NextResponse.json({ ok: false, error: "SUBSTACK_INGEST_NOT_CONFIGURED" }, { status: 503 });
  }
  const suppliedSecret = requestSecret(request);
  if (!suppliedSecret || !safeEqual(suppliedSecret, configuredSecret)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }
  const body = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const prepared = prepareSubstackEmails(body.emails, new Date());
  const checkedAt = String(body.checkedAt ?? "").trim();

  try {
    const report = await ingestPreparedSubstackEmails(prepared.accepted, checkedAt);
    return NextResponse.json({
      ok: true,
      report: {
        ...report,
        processedMessageIds: processedMessageIdsAfterIngest(prepared.accepted, prepared.rejected),
        rejectedEmails: prepared.rejected.length,
        truncatedEmails: prepared.truncatedCount,
        rejectionReasons: prepared.rejected.reduce<Record<string, number>>((counts, row) => {
          counts[row.reason] = (counts[row.reason] ?? 0) + 1;
          return counts;
        }, {}),
      },
    });
  } catch (error) {
    console.error("[substack-ingest] failed", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    return NextResponse.json({ ok: false, error: "INGEST_FAILED" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "METHOD_NOT_ALLOWED" }, { status: 405 });
}
