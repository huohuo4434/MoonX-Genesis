/**
 * Locked price-level snapshots for published forecasts.
 * BTC uses Asia/Shanghai natural-day OHLC from hourly bars.
 */

import {
  quoteSanityFailure,
  resolveCanonicalQuoteSymbol,
} from "@/lib/market-data/quote-symbols";

export type DailyAccuracyMarketLite = "CRYPTO" | "US" | "CN" | "HK" | "US_FUTURES";

export type PriceLevelReason =
  | "上一自然日低点"
  | "上一自然日高点"
  | "上一交易日低点"
  | "上一交易日高点"
  | "近期结构低点"
  | "近期结构高点"
  | "ATR风险边界"
  | "人工复核";

export type ConfirmationMethod =
  | "瞬间触及"
  | "15分钟收盘"
  | "30分钟收盘"
  | "1小时收盘"
  | "日线收盘"
  | "30分钟内未收回";

export type LockedPriceLevel = {
  levelType: "support" | "resistance";
  levelPrice: number;
  levelReason: PriceLevelReason;
  sourceTimestamp: string;
  display: string;
  displayShort: string;
};

export type ForecastPriceSnapshot = {
  previousClose: number;
  previousHigh: number;
  previousLow: number;
  currentPrice?: number;
  recentSupport: number;
  recentResistance: number;
  atr14?: number;
  priceDataSource: string;
  priceSnapshotAt: string;
  support: LockedPriceLevel;
  resistance: LockedPriceLevel;
  confirmationMethod: ConfirmationMethod;
  unitLabel: string;
  rollGapManualReview?: boolean;
};

export type PriceLevelTexts = {
  supportLevels: string[];
  resistanceLevels: string[];
  invalidation: string;
  confirmation: string;
  priceSnapshot: ForecastPriceSnapshot;
  priceDataSourceLabel: string;
  priceSnapshotAtLabel: string;
};

function toDateKeyInTz(tsSeconds: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(tsSeconds * 1000));
}

export function roundBtcUsd(price: number): number {
  return Math.round(price / 10) * 10;
}

export function formatAssetPrice(
  price: number,
  asset: "BTC" | "SSE" | "HSTECH" | "SPX" | "NDX" | "GLD" | "WTI" | "CN_STOCK"
): { raw: number; display: string; unit: string } {
  if (asset === "BTC") {
    const raw = roundBtcUsd(price);
    return { raw, display: `${raw.toLocaleString("en-US")}美元`, unit: "美元" };
  }
  if (asset === "SSE" || asset === "HSTECH" || asset === "NDX") {
    const raw = Math.round(price);
    return { raw, display: `${raw.toLocaleString("en-US")}点`, unit: "点" };
  }
  if (asset === "SPX") {
    const raw = Math.round(price * 10) / 10;
    const text = Number.isInteger(raw) ? String(raw) : raw.toFixed(1);
    return { raw, display: `${text}点`, unit: "点" };
  }
  if (asset === "GLD" || asset === "WTI") {
    const raw = Math.round(price * 100) / 100;
    return { raw, display: `${raw.toFixed(2)}美元`, unit: "美元" };
  }
  // CN stock
  const raw = Math.round(price * 100) / 100;
  return { raw, display: `${raw.toFixed(2)}元`, unit: "元" };
}

export function assetKeyFromSymbol(symbol: string): Parameters<typeof formatAssetPrice>[1] {
  const s = symbol.toUpperCase();
  if (s === "BTC" || s === "BTC-USD") return "BTC";
  if (s === "000001.SS" || s === "SSEC" || s === "SSE") return "SSE";
  if (s === "HSTECH" || s === "3033.HK" || s === "HSTECH.HK" || s === "^HSTECH") return "HSTECH";
  if (s === "SPX" || s === "^GSPC") return "SPX";
  if (s === "NDX" || s === "^NDX") return "NDX";
  if (s === "GLD") return "GLD";
  if (s === "WTI" || s === "CL=F") return "WTI";
  return "CN_STOCK";
}

export function defaultConfirmationMethod(symbol: string): ConfirmationMethod {
  const key = assetKeyFromSymbol(symbol);
  if (key === "BTC" || key === "WTI") return "1小时收盘";
  if (key === "CN_STOCK") return "30分钟内未收回";
  return "30分钟收盘";
}

async function fetchYahooChart(quoteSymbol: string, interval: string, period1: number, period2: number) {
  const encoded = encodeURIComponent(quoteSymbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=${interval}&period1=${period1}&period2=${period2}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MoonX/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status} for ${quoteSymbol}`);
  return res.json();
}

/** Aggregate Yahoo 1h bars into Asia/Shanghai natural-day OHLC. */
export async function fetchBtcBeijingDayOhlc(dayKey: string): Promise<{
  open: number;
  high: number;
  low: number;
  close: number;
  dataSource: string;
  barCount: number;
}> {
  const start = new Date(`${dayKey}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 36 * 3600 * 1000);
  const period1 = Math.floor((start.getTime() - 6 * 3600 * 1000) / 1000);
  const period2 = Math.floor(end.getTime() / 1000);
  const json = await fetchYahooChart("BTC-USD", "1h", period1, period2);
  const result = json?.chart?.result?.[0];
  const ts: number[] = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  if (!ts.length || !quote) throw new Error("BTC小时线为空");

  let open: number | null = null;
  let high = -Infinity;
  let low = Infinity;
  let close: number | null = null;
  let barCount = 0;
  for (let i = 0; i < ts.length; i++) {
    const day = toDateKeyInTz(ts[i]!, "Asia/Shanghai");
    if (day !== dayKey) continue;
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    if ([o, h, l, c].some((x: unknown) => x == null || !Number.isFinite(x as number))) continue;
    if (open == null) open = o as number;
    high = Math.max(high, h as number);
    low = Math.min(low, l as number);
    close = c as number;
    barCount += 1;
  }
  if (open == null || close == null || !Number.isFinite(high) || !Number.isFinite(low) || barCount < 1) {
    throw new Error(`无法计算BTC北京时间自然日OHLC：${dayKey}`);
  }
  return { open, high, low, close, dataSource: "yahoo-finance-1h-BJ", barCount };
}

export async function fetchPreviousSessionOhlc(input: {
  quoteSymbol: string;
  market: DailyAccuracyMarketLite;
  asOfDate: string; // forecast date — previous session before this
}): Promise<{
  previous: { date: string; open: number; high: number; low: number; close: number };
  recentBars: Array<{ date: string; open: number; high: number; low: number; close: number }>;
  dataSource: string;
}> {
  const quoteSymbol = resolveCanonicalQuoteSymbol(
    /HSTECH|3033|3032/i.test(input.quoteSymbol) ? "HSTECH" : "",
    input.quoteSymbol
  );

  if (input.market === "CRYPTO" || quoteSymbol === "BTC-USD") {
    // previous Beijing natural day
    const d = new Date(`${input.asOfDate}T12:00:00+08:00`);
    d.setDate(d.getDate() - 1);
    const prevKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
    const ohlc = await fetchBtcBeijingDayOhlc(prevKey);
    return {
      previous: {
        date: prevKey,
        open: ohlc.open,
        high: ohlc.high,
        low: ohlc.low,
        close: ohlc.close,
      },
      recentBars: [
        {
          date: prevKey,
          open: ohlc.open,
          high: ohlc.high,
          low: ohlc.low,
          close: ohlc.close,
        },
      ],
      dataSource: ohlc.dataSource,
    };
  }

  const day = new Date(`${input.asOfDate}T12:00:00Z`);
  const period1 = Math.floor((day.getTime() - 40 * 864e5) / 1000);
  const period2 = Math.floor((day.getTime() + 864e5) / 1000);
  const json = await fetchYahooChart(quoteSymbol, "1d", period1, period2);
  const result = json?.chart?.result?.[0];
  const ts: number[] = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  const tz =
    result?.meta?.exchangeTimezoneName ||
    (input.market === "CN" || input.market === "HK" ? "Asia/Shanghai" : "America/New_York");
  if (!ts.length || !quote) throw new Error(`日线为空：${quoteSymbol}`);

  const bars: Array<{ date: string; open: number; high: number; low: number; close: number }> = [];
  for (let i = 0; i < ts.length; i++) {
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    if ([o, h, l, c].some((x: unknown) => x == null || !Number.isFinite(x as number))) continue;
    bars.push({
      date: toDateKeyInTz(ts[i]!, tz.includes("/") ? tz : "UTC"),
      open: o as number,
      high: h as number,
      low: l as number,
      close: c as number,
    });
  }
  bars.sort((a, b) => a.date.localeCompare(b.date));
  const before = bars.filter((b) => b.date < input.asOfDate);
  let previous = before[before.length - 1];
  // Sparse index feeds (e.g. HSTECH.HK) may only return the latest bar — use meta previous close.
  if (!previous || before.length === 0) {
    const metaPrev = result?.meta?.chartPreviousClose ?? result?.meta?.previousClose;
    if (typeof metaPrev === "number" && Number.isFinite(metaPrev) && metaPrev > 0) {
      const d = new Date(`${input.asOfDate}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 1);
      const prevKey = toDateKeyInTz(Math.floor(d.getTime() / 1000), tz.includes("/") ? tz : "UTC");
      previous = {
        date: prevKey,
        open: metaPrev,
        high: metaPrev,
        low: metaPrev,
        close: metaPrev,
      };
    }
  }
  // IPO / first session: use the as-of session bar itself when no prior trade day exists.
  if (!previous) {
    previous = bars.find((b) => b.date === input.asOfDate) ?? bars[0];
  }
  if (!previous) throw new Error(`无上一交易日：${quoteSymbol} @ ${input.asOfDate}`);

  const sanity = quoteSanityFailure({
    symbol: /HSTECH/i.test(quoteSymbol) ? "HSTECH" : "",
    quoteSymbol,
    close: previous.close,
    previousClose: before.length >= 2 ? before[before.length - 2]!.close : undefined,
    high: previous.high,
    low: previous.low,
  });
  if (sanity) throw new Error(sanity);

  const recentBars = before.length ? before.slice(-20) : bars.slice(0, 20);

  // WTI roll-gap heuristic
  if (quoteSymbol === "CL=F" && before.length >= 2) {
    const prev2 = before[before.length - 2]!;
    const gap = Math.abs(previous.open - prev2.close) / Math.max(prev2.close, 1e-6);
    if (gap > 0.08) {
      throw new Error("WTI连续合约疑似换月跳空，改为人工复核");
    }
  }

  return { previous, recentBars, dataSource: `yahoo-finance-1d:${quoteSymbol}` };
}

export function buildPriceLevelTexts(input: {
  symbol: string;
  assetName: string;
  directionLabel: string;
  previousHigh: number;
  previousLow: number;
  previousClose: number;
  previousDate: string;
  dataSource: string;
  snapshotAt: string;
  atr14?: number;
  isBeijingNaturalDay?: boolean;
  confirmationMethod?: ConfirmationMethod;
}): PriceLevelTexts {
  const asset = assetKeyFromSymbol(input.symbol);
  const method = input.confirmationMethod ?? defaultConfirmationMethod(input.symbol);
  const supportReason: PriceLevelReason = input.isBeijingNaturalDay
    ? "上一自然日低点"
    : "上一交易日低点";
  const resistReason: PriceLevelReason = input.isBeijingNaturalDay
    ? "上一自然日高点"
    : "上一交易日高点";

  const supportFmt = formatAssetPrice(input.previousLow, asset);
  const resistFmt = formatAssetPrice(input.previousHigh, asset);

  const support: LockedPriceLevel = {
    levelType: "support",
    levelPrice: supportFmt.raw,
    levelReason: supportReason,
    sourceTimestamp: input.previousDate,
    display: `${supportFmt.display}（${supportReason}）`,
    displayShort: supportFmt.display,
  };
  const resistance: LockedPriceLevel = {
    levelType: "resistance",
    levelPrice: resistFmt.raw,
    levelReason: resistReason,
    sourceTimestamp: input.previousDate,
    display: `${resistFmt.display}（${resistReason}）`,
    displayShort: resistFmt.display,
  };

  const snap: ForecastPriceSnapshot = {
    previousClose: formatAssetPrice(input.previousClose, asset).raw,
    previousHigh: resistFmt.raw,
    previousLow: supportFmt.raw,
    recentSupport: supportFmt.raw,
    recentResistance: resistFmt.raw,
    atr14: input.atr14,
    priceDataSource: input.dataSource,
    priceSnapshotAt: input.snapshotAt,
    support,
    resistance,
    confirmationMethod: method,
    unitLabel: supportFmt.unit,
  };

  const methodPhrase =
    method === "30分钟内未收回"
      ? `并且30分钟内未重新站上该价位`
      : method === "1小时收盘"
        ? `并且1小时K线收盘仍低于${support.displayShort}`
        : method === "30分钟收盘"
          ? `并且30分钟K线收盘仍低于${support.displayShort}`
          : method === "15分钟收盘"
            ? `并且15分钟K线收盘仍低于${support.displayShort}`
            : method === "日线收盘"
              ? `并且日线收盘仍低于${support.displayShort}`
              : `并且瞬间跌破后未收回${support.displayShort}`;

  const methodPhraseUp =
    method === "30分钟内未收回"
      ? `并且30分钟内持续运行于该价位上方`
      : method === "1小时收盘"
        ? `并且1小时K线收盘站稳${resistance.displayShort}`
        : method === "30分钟收盘"
          ? `并且30分钟K线收盘站稳${resistance.displayShort}`
          : method === "15分钟收盘"
            ? `并且15分钟K线收盘站稳${resistance.displayShort}`
            : method === "日线收盘"
              ? `并且日线收盘站稳${resistance.displayShort}`
              : `并且站稳${resistance.displayShort}`;

  const dir = input.directionLabel || "原判断";
  const invalidation = `若价格跌破${support.displayShort}，${methodPhrase}，${dir}判断失效。`;
  const confirmation = `若价格突破${resistance.displayShort}，${methodPhraseUp}，方向进一步增强。`;

  const snapshotAtLabel = input.snapshotAt;
  return {
    supportLevels: [support.display],
    resistanceLevels: [resistance.display],
    invalidation,
    confirmation,
    priceSnapshot: snap,
    priceDataSourceLabel: input.dataSource,
    priceSnapshotAtLabel: snapshotAtLabel,
  };
}

export async function buildLockedLevelsForAsset(input: {
  symbol: string;
  quoteSymbol: string;
  market: DailyAccuracyMarketLite;
  assetName: string;
  directionLabel: string;
  forecastDate: string;
  publishedAt: string;
}): Promise<PriceLevelTexts> {
  // Prefer structure-based zones; never use previous-session H/L alone.
  const { buildTechnicalPriceStructure } = await import(
    "@/lib/market-data/technical-price-structure"
  );
  return buildTechnicalPriceStructure(input);
}

const BANNED_FUZZY =
  /放量突破|缩量回踩|前一交易日(高|低)点|上一交易日(高|低)点|上一自然日(高|低)点|昨日(高|低)点|前一日|7月\d+日(高|低)点|\d+月\d+日(高|低)点|盘中低点|资金承接区|上方压力区|本周前高|近期支撑|无法快速收回|周初低点|周内高点|关键低点|关键高点|跌破前|突破前|前高|前低|重要位置|关注附近|观察高低点/;

export function validatePublishedPriceLevels(input: {
  supportLevels?: string[];
  resistanceLevels?: string[];
  invalidation?: string;
  confirmation?: string;
  priceSnapshot?: ForecastPriceSnapshot | null;
  ichingText?: string;
}): string[] {
  const errors: string[] = [];

  if (!input.supportLevels?.length) {
    errors.push("缺少支撑区间");
  }

  if (!input.resistanceLevels?.length) {
    errors.push("缺少压力区间");
  }

  const blob =
    `${input.supportLevels?.join("") ?? ""}` +
    `${input.resistanceLevels?.join("") ?? ""}` +
    `${input.invalidation ?? ""}` +
    `${input.confirmation ?? ""}` +
    `${input.ichingText ?? ""}`;

  if (BANNED_FUZZY.test(blob)) {
    errors.push("仍含禁止的模糊价位表达");
  }

  // 自动预测允许：
  // 1. 无行情源
  // 2. 无快照时间
  // 3. 无确认条件
  // 4. 六爻自然语言描述

  return errors;
}

export { BANNED_FUZZY };