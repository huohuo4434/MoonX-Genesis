import { NextResponse } from "next/server";

/** Legacy storage membership API — use /api/admin/users/membership */
export async function GET() {
  return NextResponse.json({ error: "请使用 /admin/users" }, { status: 410 });
}

export async function PATCH() {
  return NextResponse.json({ error: "请使用 /api/admin/users/membership" }, { status: 410 });
}
