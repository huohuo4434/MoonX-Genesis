import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  getBitgetApiSecurity,
  getBitgetDemoEnvironment,
  getBitgetDemoMarketQuotes,
  syncBitgetServerClock,
  testBitgetDemoConnection,
} from "@/lib/bitget/demo-client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const environment = getBitgetDemoEnvironment();
    if (environment.mode !== "LIVE_EXPERIMENT") {
      return NextResponse.json({ error: "当前不是LIVE_EXPERIMENT模式" }, { status: 400 });
    }

    const [clock, connection, security, quotes] = await Promise.all([
      syncBitgetServerClock(true),
      testBitgetDemoConnection(),
      getBitgetApiSecurity(),
      getBitgetDemoMarketQuotes(["BTCUSDT"]),
    ]);

    const btc = connection.symbols.find((row) => row.symbol === "BTCUSDT");
    const quote = quotes.find((row) => row.symbol === "BTCUSDT");
    const funds = connection.detectedUsdt ?? connection.equityUsdt ?? connection.availableUsdt ?? 0;

    const checks = [
      { id: "configured", label: "LIVE API密钥已配置", ok: environment.configured, detail: environment.apiKeyMasked },
      { id: "execution", label: "实盘执行总开关", ok: environment.executionAllowed, detail: environment.executionAllowed ? "已开启" : "未开启" },
      { id: "confirmation", label: "真实亏损确认", ok: environment.liveConfirmationAccepted, detail: environment.liveConfirmationAccepted ? "已确认" : "未确认" },
      { id: "clock", label: "Bitget服务器时钟", ok: clock.safe, detail: `偏差 ${clock.offsetMs}ms` },
      { id: "account", label: "UTA账户可读取", ok: funds > 0, detail: `检测权益 ${funds.toFixed(2)} USDT` },
      { id: "trade-permission", label: "UTA交易权限", ok: security.tradingPermission, detail: security.tradingPermission ? "具备" : "缺失" },
      { id: "manage-permission", label: "UTA管理权限", ok: security.managementPermission, detail: security.managementPermission ? "具备" : "缺失" },
      { id: "withdrawal", label: "API无提币权限", ok: !security.withdrawalPermission, detail: security.withdrawalPermission ? "危险：检测到提币权限" : "未检测到提币权限" },
      { id: "ip-whitelist", label: "API IP白名单", ok: security.ipWhitelistConfigured, detail: security.ipWhitelistConfigured ? `已绑定${security.ipWhitelist.length}个IP` : "未绑定：服务器将fail-closed拒绝实盘新开仓" },
      { id: "btc-contract", label: "BTCUSDT合约参数", ok: Boolean(btc?.available), detail: btc ? `最小量 ${btc.minTradeNum} · 步长 ${btc.sizeMultiplier} · 状态 ${btc.symbolStatus}` : "未读取到BTCUSDT合约" },
      { id: "btc-quote", label: "BTCUSDT实时行情", ok: Boolean(quote?.price && quote.price > 0), detail: quote ? `${quote.price} @ ${quote.capturedAt}` : "未读取到报价" },
    ];

    return NextResponse.json({
      ok: checks.every((item) => item.ok),
      mode: environment.mode,
      writeAttempted: false,
      finalSubmission: "BLOCKED_BY_DESIGN",
      summary: checks.every((item) => item.ok)
        ? "实盘下单前置链路全部可用；本诊断按设计不会提交真实订单。"
        : "至少一项实盘下单前置条件未通过；请先处理红色项目。",
      checks,
      securityMessage: security.message,
      account: {
        availableUsdt: connection.availableUsdt,
        equityUsdt: connection.equityUsdt,
        detectedUsdt: connection.detectedUsdt,
        accountMode: connection.accountMode,
        accountLevel: connection.accountLevel,
        holdMode: connection.holdMode,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "实盘下单链路诊断失败",
        writeAttempted: false,
        finalSubmission: "BLOCKED_BY_DESIGN",
      },
      { status: 500 }
    );
  }
}
