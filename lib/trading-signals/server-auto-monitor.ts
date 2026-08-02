import "server-only";

import { syncBitgetDemoOrders } from "@/lib/bitget/demo-connector";
import {
  AUTOMATIC_SIGNAL_PRICE_SYMBOLS,
  getTradingSignalLivePrices,
  isTradingSignalAutoPriceSupported,
  tradingSignalPriceKey,
  type TradingSignalLivePrice,
} from "@/lib/market-data/trading-signal-live-prices";
import {
  getTradingV2Snapshot,
  monitorTradeSignal,
} from "@/lib/trading-signals/v2-store";

export type TradingSignalAutoMonitorRow = {
  signalId: string;
  symbol: string;
  price: number | null;
  provider: string | null;
  recommendation: string;
  message: string;
  executedActions: string[];
};

export type TradingSignalAutoMonitorReport = {
  ok: true;
  generatedAt: string;
  supportedSymbols: string[];
  prices: TradingSignalLivePrice[];
  warnings: string[];
  monitoredSignals: number;
  results: TradingSignalAutoMonitorRow[];
  bitgetDemo: Awaited<ReturnType<typeof syncBitgetDemoOrders>> | null;
  note: string;
};

export async function runTradingSignalServerMonitor(): Promise<TradingSignalAutoMonitorReport> {
  const snapshot = await getTradingV2Snapshot();
  const signals = snapshot.actionableSignals.filter(
    (signal) =>
      ["ARMED", "TRIGGERED", "ACTIVE", "TAKE_PROFIT"].includes(signal.status) &&
      isTradingSignalAutoPriceSupported(signal.symbol)
  );

  const market = await getTradingSignalLivePrices(signals.map((signal) => signal.symbol));
  const priceMap = new Map(
    market.prices.map((row) => [row.normalizedSymbol, row] as const)
  );
  const results: TradingSignalAutoMonitorRow[] = [];

  for (const signal of signals) {
    const ticker = priceMap.get(tradingSignalPriceKey(signal.symbol));
    if (!ticker) {
      results.push({
        signalId: signal.id,
        symbol: signal.symbol,
        price: null,
        provider: null,
        recommendation: "SKIPPED",
        message: "本轮没有取得有效实时价格。",
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

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    supportedSymbols: [...AUTOMATIC_SIGNAL_PRICE_SYMBOLS],
    prices: market.prices,
    warnings: market.warnings,
    monitoredSignals: signals.length,
    results,
    bitgetDemo,
    note:
      "服务器自动获取行情并补齐入场、止损和目标。止盈可自动执行；4小时或日线确认止损只生成纪律提醒，确认收盘后再执行止损。",
  };
}
