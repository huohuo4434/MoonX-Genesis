import { NextResponse } from "next/server";

/** Auto chain payment orders disabled — use /checkout manual review flow. */
export async function POST() {
  return NextResponse.json(
    {
      error: "自动链上订单已停用，请前往 /pricing 选择套餐并在 /checkout 提交交易哈希。",
      redirect: "/pricing",
    },
    { status: 410 }
  );
}
