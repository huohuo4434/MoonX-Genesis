import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { acceptanceReportFreshness } from "@/lib/health/acceptance-freshness-core";
import { buildLiveAcceptanceReport } from "@/lib/health/live-acceptance";

/** Public read of latest smoke acceptance summary (no secrets). */
export async function GET() {
  const live = await buildLiveAcceptanceReport();
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, live, historicalAcceptance: null, error: "historical report unavailable" }, { status: 503 });
  }
  const { data, error } = await admin.storage.from("moonx_mvp").download("acceptance-latest.json");
  if (error || !data) {
    return NextResponse.json({ ok: live.overall !== "RED", live, historicalAcceptance: null }, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const json = JSON.parse(await data.text()) as Record<string, unknown>;
    const servedAt = new Date();
    const freshness = acceptanceReportFreshness({ reportAt: json.at, servedAt });
    return NextResponse.json({ ok: live.overall !== "RED", live, historicalAcceptance: {
      servedAt: servedAt.toISOString(),
      ...freshness,
    } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: live.overall !== "RED", live, historicalAcceptance: null, historicalError: "invalid report" }, { headers: { "Cache-Control": "no-store" } });
  }
}
