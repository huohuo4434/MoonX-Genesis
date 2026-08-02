import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/permissions";
import { getMemberAiTradingDeskSnapshot } from "@/lib/trading-signals/member-ai-trading-desk";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!(await requireMember())) {
    return NextResponse.json({ error: "会员权限不足" }, { status: 403 });
  }
  try {
    return NextResponse.json(await getMemberAiTradingDeskSnapshot());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取失败" },
      { status: 500 }
    );
  }
}
