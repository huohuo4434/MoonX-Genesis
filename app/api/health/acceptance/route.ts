import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { acceptanceReportFreshness } from "@/lib/health/acceptance-freshness-core";

/** Public read of latest smoke acceptance summary (no secrets). */
export async function GET() {
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "service unavailable" }, { status: 503 });
  }
  const { data, error } = await admin.storage.from("moonx_mvp").download("acceptance-latest.json");
  if (error || !data) {
    return NextResponse.json({ ok: false, error: "no acceptance report yet" }, { status: 404 });
  }
  try {
    const json = JSON.parse(await data.text()) as Record<string, unknown>;
    const servedAt = new Date();
    const freshness = acceptanceReportFreshness({ reportAt: json.at, servedAt });
    return NextResponse.json({
      ...json,
      servedAt: servedAt.toISOString(),
      ...freshness,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid report" }, { status: 500 });
  }
}
