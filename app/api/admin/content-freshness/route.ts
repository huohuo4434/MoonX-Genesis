import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { getStoredContentFreshnessReport, runContentFreshnessSelfCheck } from "@/lib/automation/content-freshness";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const report = await getStoredContentFreshnessReport() ?? await runContentFreshnessSelfCheck({ repair: false });
  return NextResponse.json({ ok: true, report }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const report = await runContentFreshnessSelfCheck({ repair: true });
  return NextResponse.json({ ok: report.status === "OK", report }, { status: report.status === "OK" ? 200 : 207, headers: { "Cache-Control": "no-store" } });
}
