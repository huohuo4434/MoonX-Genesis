import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  clearMemberLease,
  listUserDevices,
  logoutOtherDevices,
  revokeUserDevice,
} from "@/lib/auth/device-security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = request.nextUrl.searchParams.get("userId")?.trim();
  if (!userId) return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  return NextResponse.json(await listUserDevices({ userId }));
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await request.json().catch(() => null)) as
    | { userId?: string; deviceId?: string; action?: "revoke-all" | "clear-lease" }
    | null;
  const userId = body?.userId?.trim();
  if (!userId) return NextResponse.json({ error: "缺少 userId" }, { status: 400 });

  if (body?.action === "clear-lease") {
    await clearMemberLease({ userId, actorUserId: admin.id });
    return NextResponse.json({ ok: true });
  }
  if (body?.action === "revoke-all") {
    const count = await logoutOtherDevices({ userId, actorUserId: admin.id });
    await clearMemberLease({ userId, actorUserId: admin.id });
    return NextResponse.json({ ok: true, count });
  }
  if (!body?.deviceId) return NextResponse.json({ error: "缺少 deviceId" }, { status: 400 });
  const ok = await revokeUserDevice({ userId, deviceId: body.deviceId, actorUserId: admin.id });
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
