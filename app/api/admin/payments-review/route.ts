import { NextResponse } from "next/server";

/** Legacy storage payment review — use PATCH /api/payments/submit */
export async function GET() {
  return NextResponse.json({ error: "请使用 /admin/payments" }, { status: 410 });
}

export async function PATCH() {
  return NextResponse.json({ error: "请使用 PATCH /api/payments/submit" }, { status: 410 });
}
