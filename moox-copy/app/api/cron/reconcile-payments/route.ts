import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, skipped: true, message: "自动对账已停用" });
}
