import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  ingestExternalAnalystCollectorPosts,
  type ExternalAnalystFeedPostInput,
} from "@/lib/trading-signals/external-analyst-signals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 1_000_000;
const MAX_POSTS = 120;

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function requestSecret(request: NextRequest): string {
  const authorization = request.headers.get("authorization") ?? "";
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim();
  return request.headers.get("x-moox-collector-secret")?.trim() ?? "";
}

function normalizePosts(value: unknown): ExternalAnalystFeedPostInput[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_POSTS).flatMap((row): ExternalAnalystFeedPostInput[] => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    const username = String(item.username ?? item.author ?? "").replace(/^@/, "").trim();
    const id = String(item.id ?? item.postId ?? item.tweetId ?? "").trim();
    const text = String(item.text ?? item.content ?? "").replace(/\u0000/g, "").trim();
    const createdAt = String(item.createdAt ?? item.created_at ?? item.postedAt ?? "").trim();
    const url = String(item.url ?? "").trim();
    if (!username || !id || !text || !createdAt) return [];
    return [{ username, id, text, createdAt, url: url || undefined }];
  });
}

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.MOOX_X_COLLECTOR_SECRET?.trim() ?? "";
  if (configuredSecret.length < 24) {
    return NextResponse.json({ ok: false, error: "COLLECTOR_NOT_CONFIGURED" }, { status: 503 });
  }

  const suppliedSecret = requestSecret(request);
  if (!suppliedSecret || !safeEqual(suppliedSecret, configuredSecret)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const body = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const posts = normalizePosts(body.posts);
  const collector = body.collector && typeof body.collector === "object"
    ? body.collector as Record<string, unknown>
    : {};

  try {
    const report = await ingestExternalAnalystCollectorPosts({
      posts,
      collectorId: String(collector.id ?? collector.version ?? "moox-windows-x-collector"),
      checkedAt: String(collector.checkedAt ?? body.checkedAt ?? ""),
    });
    return NextResponse.json({
      ok: report.errors.length === 0 || report.storedPosts > 0,
      report,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "INGEST_FAILED",
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "METHOD_NOT_ALLOWED" }, { status: 405 });
}
