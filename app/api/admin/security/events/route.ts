import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { listSecurityEvents } from "@/lib/auth/device-security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = request.nextUrl.searchParams.get("userId")?.trim() || undefined;
  const events = await listSecurityEvents({ userId, limit: 100 });
  return NextResponse.json({ events }, { headers: { "Cache-Control": "no-store" } });
}
