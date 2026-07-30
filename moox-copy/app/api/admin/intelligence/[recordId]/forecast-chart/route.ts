import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { getResearchRecord } from "@/lib/data/research-records";
import { buildWtiExtForecastChartV1 } from "@/lib/data/wti-forecast-chart-draft";
import { WTI_EXT_PATH_RECORD_ID } from "@/lib/data/wti-path-ext-20260807";

export const dynamic = "force-dynamic";

/**
 * Admin-only forecast chart payload.
 * Non-admin callers (including members) receive 404 — never 403 with body hints.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ recordId: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const { recordId } = await context.params;
  const record = await getResearchRecord(recordId);
  if (!record) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const chart =
    record.forecastChart ??
    (recordId === WTI_EXT_PATH_RECORD_ID ? buildWtiExtForecastChartV1() : null);

  if (!chart?.enabled) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json({
    recordId,
    chart,
  });
}
