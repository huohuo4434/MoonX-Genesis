import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  getTradingV2Snapshot,
  monitorTradeSignal,
} from "@/lib/trading-signals/v2-store";
import {
  getCryptoLivePrices,
  isAutoCryptoSymbol,
} from "@/lib/market-data/crypto-live-prices";
import { syncBitgetDemoOrders } from "@/lib/bitget/demo-connector";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const snapshot = await getTradingV2Snapshot();
    const signals = snapshot.actionableSignals.filter(
      (signal) =>
        ["ARMED", "TRIGGERED", "ACTIVE", "TAKE_PROFIT"].includes(
          signal.status
        ) && isAutoCryptoSymbol(signal.symbol)
    );

    const market = await getCryptoLivePrices(
      signals.map((signal) => signal.symbol)
    );
    const priceMap = new Map(
      market.prices.map((row) => [row.symbol, row] as const)
    );

    const results: Array<{
      signalId: string;
      symbol: string;
      price: number | null;
      provider: string | null;
      recommendation: string;
      message: string;
      executedActions: string[];
    }> = [];

    for (const signal of signals) {
      const key = signal.symbol.trim().toUpperCase().replace(/[-_/]/g, "");
      const normalized =
        key === "BTC" || key === "BTCUSDT"
          ? "BTC"
          : key === "ETH" || key === "ETHUSDT"
            ? "ETH"
            : key === "HYPE" || key === "HYPEUSDT"
              ? "HYPE"
              : null;
      const ticker = normalized ? priceMap.get(normalized) : null;

      if (!ticker) {
        results.push({
          signalId: signal.id,
          symbol: signal.symbol,
          price: null,
          provider: null,
          recommendation: "SKIPPED",
          message: "没有取得有效实时价格。",
          executedActions: [],
        });
        continue;
      }

      try {
        const monitored = await monitorTradeSignal({
          signalId: signal.id,
          price: ticker.price,
          confirmed: false,
          execute: true,
        });
        results.push({
          signalId: signal.id,
          symbol: signal.symbol,
          price: ticker.price,
          provider: ticker.provider,
          recommendation: monitored.recommendation,
          message: monitored.message,
          executedActions: monitored.executedActions,
        });
      } catch (error) {
        results.push({
          signalId: signal.id,
          symbol: signal.symbol,
          price: ticker.price,
          provider: ticker.provider,
          recommendation: "ERROR",
          message: error instanceof Error ? error.message : "自动监控失败",
          executedActions: [],
        });
      }
    }

    let bitgetDemo: Awaited<ReturnType<typeof syncBitgetDemoOrders>> | null = null;
    try {
      bitgetDemo = await syncBitgetDemoOrders();
    } catch (error) {
      market.warnings.push(
        `Bitget Demo同步异常：${error instanceof Error ? error.message : "未知错误"}`
      );
    }

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      intervalSeconds: 30,
      supportedSymbols: ["BTC", "ETH", "HYPE"],
      prices: market.prices,
      warnings: market.warnings,
      monitoredSignals: signals.length,
      results,
      bitgetDemo,
      note:
        "止盈可自动执行；4小时或日线确认止损只生成纪律提醒，确认收盘后再执行止损。",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "自动行情监控失败" },
      { status: 500 }
    );
  }
}
