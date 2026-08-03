import { NextRequest, NextResponse } from "next/server";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { revokeUserDevice } from "@/lib/auth/device-security";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  const access = await getAccessUser();
  if (!access.authenticated || !access.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const { deviceId } = await context.params;
  const ok = await revokeUserDevice({
    userId: access.userId,
    deviceId,
    actorUserId: access.userId,
  });
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
