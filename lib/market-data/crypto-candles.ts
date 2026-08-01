import "server-only";

import { getChinaDateKey } from "@/lib/date/china-date";
import type {
  PredictionAutoSymbol,
  PredictionMarketContext,
} from "@/types/prediction-auto-trader";

type BitgetCandleEnvelope = {
  code?: string;
  msg?: string;
  data?: string[][];
};

const BITGET_SYMBOLS: Record<PredictionAutoSymbol, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
};

function percent(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return Math.max(0, (numerator / denominator) * 100);
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = 10_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function getCrypto15mMarketContext(
  symbol: PredictionAutoSymbol,
  now = new Date()
): Promise<PredictionMarketContext> {
  const sourceSymbol = BITGET_SYMBOLS[symbol];
  const query = new URLSearchParams({
    category: "USDT-FUTURES",
    symbol: sourceSymbol,
    interval: "15m",
    type: "market",
    limit: "100",
  });
  const response = await fetchWithTimeout(
    `https://api.bitget.com/api/v3/market/candles?${query.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "MoonX-Prediction-Auto-Trader/1.0",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Bitget 15分钟行情HTTP ${response.status}`);
  }

  const payload = (await response.json()) as BitgetCandleEnvelope;
  if (payload.code !== "00000" || !Array.isArray(payload.data)) {
    throw new Error(payload.msg || "Bitget 15分钟行情返回异常");
  }

  const dayKey = getChinaDateKey(now);
  const dayStart = Date.parse(`${dayKey}T00:00:00+08:00`);
  const rows = payload.data
    .map((row) => ({
      timestamp: Number(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
    }))
    .filter(
      (row) =>
        Number.isFinite(row.timestamp) &&
        row.timestamp >= dayStart &&
        Number.isFinite(row.open) &&
        Number.isFinite(row.high) &&
        Number.isFinite(row.low) &&
        Number.isFinite(row.close) &&
        row.open > 0 &&
        row.high > 0 &&
        row.low > 0 &&
        row.close > 0
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  if (!rows.length) {
    throw new Error(`${symbol}今日尚未取得有效15分钟K线`);
  }

  const first = rows[0];
  const latest = rows[rows.length - 1];
  if (!first || !latest) throw new Error(`${symbol}行情数据不完整`);

  const sessionHigh = Math.max(...rows.map((row) => row.high));
  const sessionLow = Math.min(...rows.map((row) => row.low));
  const sessionOpen = first.open;
  const currentPrice = latest.close;

  return {
    symbol,
    sourceSymbol,
    provider: "BITGET",
    interval: "15m",
    capturedAt: new Date(latest.timestamp).toISOString(),
    candleCount: rows.length,
    sessionOpen,
    sessionHigh,
    sessionLow,
    currentPrice,
    dipPct: percent(sessionOpen - sessionLow, sessionOpen),
    reboundPct: percent(currentPrice - sessionLow, sessionLow),
    rallyPct: percent(sessionHigh - sessionOpen, sessionOpen),
    reversalPct: percent(sessionHigh - currentPrice, sessionHigh),
    lastCloses: rows.slice(-3).map((row) => row.close),
  };
}
