import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { getBitgetRuntimeState } from "@/lib/bitget/demo-runtime";
import { runPredictionAutoTrader } from "@/lib/trading-signals/prediction-auto-trader";
import { syncMemberAiTradingDeskSnapshot } from "@/lib/trading-signals/member-ai-trading-desk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const now = new Date();
  try {
    const runtime = await getBitgetRuntimeState(now);
    if (runtime.paused) {
      return NextResponse.json(
        { error: `服务器执行已暂停：${runtime.pauseReason || "等待管理员恢复"}` },
        { status: 409 }
      );
    }
    if (!runtime.serverHealthy || runtime.quoteAgeSeconds == null || runtime.quoteAgeSeconds > 180) {
      const age = runtime.quoteAgeSeconds == null ? "未知" : `${Math.floor(runtime.quoteAgeSeconds / 60)}分钟`;
      return NextResponse.json(
        { error: `行情或服务器心跳未通过新鲜度检查，自动执行已暂停（行情延迟：${age}）。请等待服务器运行时恢复后再重试。` },
        { status: 409 }
      );
    }
    const report = await runPredictionAutoTrader(now, {
      source: "ADMIN",
      forceFullScan: true,
    });
    let memberDeskSync = "OK";
    try {
      await syncMemberAiTradingDeskSnapshot(now);
    } catch (error) {
      memberDeskSync = error instanceof Error ? error.message : "同步失败";
    }
    return NextResponse.json({ ...report, memberDeskSync });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "策略检查失败" },
      { status: 500 }
    );
  }
}
