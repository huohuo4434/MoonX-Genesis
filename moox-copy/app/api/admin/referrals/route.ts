import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/membership";
import { getAdminReferralRows } from "@/lib/referral/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await getAdminReferralRows();
  return NextResponse.json({ ok: true, data: rows });
}
