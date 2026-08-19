// MOOX_V7206_CRYPTO_DERIVATIVES_DASHBOARD
import "server-only";

import { loadChanCandles } from "@/lib/market-data/chan-market-data";
import { loadChanInstrumentCatalog } from "@/lib/market-data/chan-instrument-catalog.server";
import { resolveChanInstrument } from "@/lib/market-data/chan-instrument-catalog";
import { analyzeChanStructure } from "@/lib/trading-signals/chan-structure-core";
import { deriveChanStage } from "@/lib/trading-signals/chan-stage-core";

export type CryptoDerivativesRow = {
  symbol: "BTC" | "ETH" | "SOL" | "HYPE";
  price: number | null;
  chanStageZh: string;
  chanStatusZh: string;
  chanConfirmation: number | null;
  chanInvalidation: number | null;
  fundingRate: number | null;
  openInterest: number | null;
  longShortRatio: number | null;
  longRatio: number | null;
  shortRatio: number | null;
  crowdingZh: string;
  sourceZh: string;
  updatedAt: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function num(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function publicBitget(path: string, query: Record<string, string>): Promise<Record<string, unknown>> {
  const params = new URLSearchParams(query);
  const response = await fetch(`https://api.bitget.com${path}?${params}`, {
    cache: "no-store",
    headers: { Accept: "application/json", "User-Agent": "MOOX-Crypto-Structure/1.0" },
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
  if (!response?.ok) return {};
  return record(await response.json().catch(() => null));
}

function firstData(payload: Record<string, unknown>): Record<string, unknown> {
  const data = payload.data;
  if (Array.isArray(data)) return record(data[0]);
  const direct = record(data);
  const list = array(direct.list);
  return list.length ? record(list[0]) : direct;
}

function crowdingText(funding: number | null, longShort: number | null): string {
  if (funding === null && longShort === null) return "多空拥挤数据暂缺";
  if ((funding ?? 0) > 0.0005 && (longShort ?? 1) > 1.35) return "多头较拥挤，追多需谨慎";
  if ((funding ?? 0) < -0.0005 && (longShort ?? 1) < 0.75) return "空头较拥挤，留意反向挤压";
  if ((longShort ?? 1) > 1.2) return "多头略占优，尚未极端拥挤";
  if ((longShort ?? 1) < 0.85) return "空头略占优，尚未极端拥挤";
  return "多空接近平衡";
}

export async function loadCryptoDerivativesDashboard(now = new Date()): Promise<CryptoDerivativesRow[]> {
  const symbols = ["BTC", "ETH", "SOL", "HYPE"] as const;
  const catalog = await loadChanInstrumentCatalog().catch(() => ({ instruments: [], source: "FALLBACK" as const }));

  return Promise.all(symbols.map(async (symbol): Promise<CryptoDerivativesRow> => {
    const bitgetSymbol = `${symbol}USDT`;
    const instrument = resolveChanInstrument(bitgetSymbol, catalog.instruments)
      ?? resolveChanInstrument(symbol, catalog.instruments);
    const [market, fundingPayload, oiPayload, ratioPayload] = await Promise.all([
      instrument
        ? loadChanCandles({ symbol: instrument.symbol, timeframe: "4H", instrument, capturedNowMs: now.getTime(), timeoutMs: 4500 }).catch(() => null)
        : Promise.resolve(null),
      publicBitget("/api/v3/market/current-fund-rate", { category: "USDT-FUTURES", symbol: bitgetSymbol }),
      publicBitget("/api/v3/market/open-interest", { category: "USDT-FUTURES", symbol: bitgetSymbol }),
      publicBitget("/api/v3/market/futures-long-short", { symbol: bitgetSymbol, period: "4h" }),
    ]);

    const candles = market?.candles ?? [];
    const structure = analyzeChanStructure(candles);
    const stage = deriveChanStage(structure);
    const latest = candles.at(-1);
    const funding = firstData(fundingPayload);
    const oi = firstData(oiPayload);
    const ratio = firstData(ratioPayload);
    const longRatio = num(ratio.longAccountRatio, ratio.longRatio, ratio.buyRatio);
    const shortRatio = num(ratio.shortAccountRatio, ratio.shortRatio, ratio.sellRatio);
    const explicitRatio = num(ratio.longShortRatio, ratio.ratio);
    const derivedRatio = longRatio !== null && shortRatio !== null && shortRatio > 0 ? longRatio / shortRatio : null;
    const longShortRatio = explicitRatio ?? derivedRatio;
    const fundingRate = num(funding.fundingRate, funding.currentFundingRate, funding.rate);
    const openInterest = num(oi.openInterest, oi.openInterestUsd, oi.holdingAmount, oi.amount);

    return {
      symbol,
      price: latest?.close ?? null,
      chanStageZh: stage.labelZh,
      chanStatusZh: stage.waitingFor,
      chanConfirmation: stage.confirmation,
      chanInvalidation: stage.invalidation,
      fundingRate,
      openInterest,
      longShortRatio,
      longRatio,
      shortRatio,
      crowdingZh: crowdingText(fundingRate, longShortRatio),
      sourceZh: market?.candles.length ? `闭合4H K线 · ${instrument?.provider ?? "公开行情"}；衍生品数据 · Bitget公开市场` : "衍生品公开市场数据",
      updatedAt: now.toISOString(),
    };
  }));
}
