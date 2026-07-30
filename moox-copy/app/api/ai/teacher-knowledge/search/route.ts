import { NextRequest, NextResponse } from "next/server";
import { searchForAiReader } from "@/lib/teacher-knowledge/search";
import { logAiReaderAccess } from "@/lib/teacher-knowledge/store";

export const dynamic = "force-dynamic";

const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(key: string, limit = 60): boolean {
  const now = Date.now();
  const row = rateMap.get(key);
  if (!row || row.resetAt < now) {
    rateMap.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (row.count >= limit) return false;
  row.count += 1;
  return true;
}

/**
 * Read-only AI retrieval. Requires MOONX_AI_READER_KEY.
 * Never returns full raw transcripts. No write methods.
 */
export async function GET(req: NextRequest) {
  const key = process.env.MOONX_AI_READER_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "AI reader not configured" }, { status: 503 });
  }
  const provided =
    req.headers.get("x-moonx-ai-key") ||
    req.nextUrl.searchParams.get("key") ||
    "";
  if (provided !== key) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRate(`${ip}:${provided.slice(0, 6)}`)) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q.trim()) return NextResponse.json({ error: "q required" }, { status: 400 });

  const categories = (req.nextUrl.searchParams.get("categories") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const limit = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 10)));

  await logAiReaderAccess(q, ip);
  const result = await searchForAiReader({
    q,
    asset: req.nextUrl.searchParams.get("asset") || undefined,
    timeframe: req.nextUrl.searchParams.get("timeframe") || undefined,
    categories: categories.length ? categories : undefined,
    limit,
  });

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
