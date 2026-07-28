import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "订单列表已迁移至 app_metadata.pending_payment，请使用 /admin/payments。" },
    { status: 410 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "请使用 POST/PATCH /api/payments/submit 审核付款。" },
    { status: 410 }
  );
}
