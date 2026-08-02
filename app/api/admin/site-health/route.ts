import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { buildSiteHealthReport } from "@/lib/admin/site-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const report = await buildSiteHealthReport();
  return NextResponse.json(report, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="moonx-site-health-${report.beijingDate}.json"`,
    },
  });
}
