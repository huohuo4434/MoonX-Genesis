import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { listUserDevices, MEMBER_DEVICE_COOKIE } from "@/lib/auth/device-security";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getAccessUser();
  if (!access.authenticated || !access.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const cookieStore = await cookies();
  const result = await listUserDevices({
    userId: access.userId,
    deviceToken: cookieStore.get(MEMBER_DEVICE_COOKIE)?.value,
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
