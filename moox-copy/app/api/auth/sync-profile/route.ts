import { NextResponse } from "next/server";
import { ensureProfileForUser } from "@/lib/auth/admin-bootstrap";
import { getCurrentUser } from "@/lib/auth/permissions";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    await ensureProfileForUser(user.id, user.email);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "同步账户信息失败" }, { status: 500 });
  }
}
