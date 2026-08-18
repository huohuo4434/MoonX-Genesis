import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST() {
  return NextResponse.json({
    ok: false,
    migrated: true,
    message: "旧预测自动交易已停止直接下单。请使用 /admin/live-trading；现有仓位管理不会因新开仓暂停而停止。",
    newOrdersPlaced: 0,
  }, { status: 409 });
}
