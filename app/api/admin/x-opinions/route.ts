import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { getXOpinionMatrix, setXOpinionApproval } from "@/lib/trading-signals/x-opinion-matrix";
import type { XOpinionApprovalStatus } from "@/types/x-opinion-matrix";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const url = new URL(request.url);
  const lookbackDays = Number(url.searchParams.get("days") ?? 7);
  const matrix = await getXOpinionMatrix({ lookbackDays });
  return NextResponse.json({ ok: true, matrix }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const statusRaw = String(body.status ?? "PENDING").toUpperCase();
  const status: XOpinionApprovalStatus = statusRaw === "APPROVED" || statusRaw === "REJECTED" ? statusRaw : "PENDING";
  try {
    const approval = await setXOpinionApproval({
      username: String(body.username ?? ""),
      postId: String(body.postId ?? ""),
      symbol: String(body.symbol ?? ""),
      status,
      weightPct: Number(body.weightPct ?? 5),
      displayAllowed: Boolean(body.displayAllowed),
      note: typeof body.note === "string" ? body.note : null,
    });
    return NextResponse.json({ ok: true, approval });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
