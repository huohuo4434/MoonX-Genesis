import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  getMemberAiTradingDeskSettings,
  syncMemberAiTradingDeskSnapshot,
  updateMemberAiTradingDeskSettings,
} from "@/lib/trading-signals/member-ai-trading-desk";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  return NextResponse.json(await getMemberAiTradingDeskSettings());
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const settings = await updateMemberAiTradingDeskSettings({
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      showCurrentPositions:
        typeof body.showCurrentPositions === "boolean"
          ? body.showCurrentPositions
          : undefined,
      showTradeHistory:
        typeof body.showTradeHistory === "boolean" ? body.showTradeHistory : undefined,
      showAbsolutePnl:
        typeof body.showAbsolutePnl === "boolean" ? body.showAbsolutePnl : undefined,
      historyLimit:
        typeof body.historyLimit === "number" ? body.historyLimit : undefined,
    });
    await syncMemberAiTradingDeskSnapshot();
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 500 }
    );
  }
}
