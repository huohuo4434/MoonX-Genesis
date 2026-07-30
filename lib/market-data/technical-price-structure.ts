/**
 * Technical Price Structure Engine
 * Support/resistance zones from real OHLC structure — never previous-day H/L alone,
 * never I Ching, never "放量突破" / fuzzy prior-day language.
 */
import {
  assetKeyFromSymbol,
  defaultConfirmationMethod,
  formatAssetPrice,
  type ConfirmationMethod,
  type DailyAccuracyMarketLite,
  type ForecastPriceSnapshot,
  type PriceLevelTexts,
} from "@/lib/market-data/price-levels";
import { resolveCanonicalQuoteSymbol } from "@/lib/market-data/quote-symbols";

export const TECHNICAL_PRICE_DATA_UNAVAILABLE = "TECHNICAL_PRICE_DATA_UNAVAILABLE";

export type OhlcBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

function toDateKeyInTz(tsSeconds: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(tsSeconds * 1000));
}

async function fetchYahooDaily(quoteSymbol: string, asOfDate: string): Promise<{
  bars: OhlcBar[];
  dataSource: string;
}> {
  const day = new Date(`${asOfDate}T12:00:00Z`);
  const period1 = Math.floor((day.getTime() - 120 * 864e5) / 1000);
  const period2 = Math.floor((day.getTime() + 864e5) / 1000);
  const encoded = encodeURIComponent(quoteSymbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&period1=${period1}&period2=${period2}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MOOX/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${TECHNICAL_PRICE_DATA_UNAVAILABLE}: Yahoo HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const ts: number[] = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  const tz =
    result?.meta?.exchangeTimezoneName ||
    (/HSTECH|3033|\.SS|\.HK/i.test(quoteSymbol) ? "Asia/Shanghai" : "America/New_York");
  if (!ts.length || !quote) throw new Error(`${TECHNICAL_PRICE_DATA_UNAVAILABLE}: empty chart`);

  const bars: OhlcBar[] = [];
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
  const before = bars.filter((b) => b.date < asOfDate);
  if (before.length < 20) {
    throw new Error(`${TECHNICAL_PRICE_DATA_UNAVAILABLE}: need >=20 bars before ${asOfDate}`);
  }
  return { bars: before, dataSource: `yahoo-finance-1d:${quoteSymbol}` };
}

function ema(values: number[], period: number): number[] {
  const out: number[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    if (prev == null) {
      if (i + 1 < period) {
        out.push(NaN);
        continue;
      }
      const seed = values.slice(i + 1 - period, i + 1).reduce((a, b) => a + b, 0) / period;
      prev = seed;
      out.push(seed);
    } else {
      prev = v * k + prev * (1 - k);
      out.push(prev);
    }
  }
  return out;
}

function macdLine(closes: number[]): { macd: number[]; signal: number[]; hist: number[] } {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macd = closes.map((_, i) =>
    Number.isFinite(ema12[i]!) && Number.isFinite(ema26[i]!) ? ema12[i]! - ema26[i]! : NaN
  );
  const signal = ema(
    macd.map((v) => (Number.isFinite(v) ? v : 0)),
    9
  );
  const hist = macd.map((v, i) =>
    Number.isFinite(v) && Number.isFinite(signal[i]!) ? v - signal[i]! : NaN
  );
  return { macd, signal, hist };
}

function atr14(bars: OhlcBar[]): number {
  if (bars.length < 15) return Math.abs(bars.at(-1)!.high - bars.at(-1)!.low);
  let sum = 0;
  const slice = bars.slice(-15);
  for (let i = 1; i < slice.length; i++) {
    const cur = slice[i]!;
    const prev = slice[i - 1]!;
    sum += Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
  }
  return sum / 14;
}

type Swing = { price: number; index: number; kind: "high" | "low"; touches: number };

function findSwings(bars: OhlcBar[], lookback: number): Swing[] {
  const slice = bars.slice(-lookback);
  const swings: Swing[] = [];
  for (let i = 2; i < slice.length - 2; i++) {
    const h = slice[i]!.high;
    const l = slice[i]!.low;
    if (h >= slice[i - 1]!.high && h >= slice[i - 2]!.high && h >= slice[i + 1]!.high && h >= slice[i + 2]!.high) {
      swings.push({ price: h, index: i, kind: "high", touches: 1 });
    }
    if (l <= slice[i - 1]!.low && l <= slice[i - 2]!.low && l <= slice[i + 1]!.low && l <= slice[i + 2]!.low) {
      swings.push({ price: l, index: i, kind: "low", touches: 1 });
    }
  }
  return swings;
}

function clusterZones(
  swings: Swing[],
  atr: number,
  kind: "high" | "low",
  lastClose: number
): Array<{ low: number; high: number; score: number; sources: string[] }> {
  const pts = swings.filter((s) => s.kind === kind).map((s) => s.price);
  if (!pts.length) return [];
  const width = Math.max(atr * 0.35, lastClose * 0.002);
  const sorted = [...pts].sort((a, b) => a - b);
  const clusters: Array<{ low: number; high: number; members: number[] }> = [];
  for (const p of sorted) {
    const hit = clusters.find((c) => p >= c.low - width && p <= c.high + width);
    if (hit) {
      hit.members.push(p);
      hit.low = Math.min(hit.low, p);
      hit.high = Math.max(hit.high, p);
    } else {
      clusters.push({ low: p, high: p, members: [p] });
    }
  }
  return clusters
    .map((c) => {
      const mid = (c.low + c.high) / 2;
      const sources: string[] = [];
      let score = 0;
      if (c.members.length >= 2) {
        score += 2;
        sources.push("多次触碰波段高低点");
      } else {
        score += 1;
        sources.push("近期有效波段点");
      }
      const span = c.high - c.low;
      if (span <= width * 1.5 && c.members.length >= 2) {
        score += 1;
        sources.push("密集成交/平台区");
      }
      // Prefer zones on the correct side of last close for labeling later
      void mid;
      return { low: Math.min(...c.members) - width * 0.25, high: Math.max(...c.members) + width * 0.25, score, sources };
    })
    .filter((z) => z.score >= 2)
    .sort((a, b) => b.score - a.score);
}

function formatZone(
  low: number,
  high: number,
  asset: Parameters<typeof formatAssetPrice>[1],
  label: string,
  sources: string[]
): string {
  const a = formatAssetPrice(Math.min(low, high), asset);
  const b = formatAssetPrice(Math.max(low, high), asset);
  const src = sources.slice(0, 3).join("；");
  return `${label}：${a.display.replace(a.unit, "")}—${b.display}（来源：${src}）`;
}

export async function buildTechnicalPriceStructure(input: {
  symbol: string;
  quoteSymbol: string;
  market: DailyAccuracyMarketLite;
  assetName: string;
  directionLabel: string;
  forecastDate: string;
  publishedAt: string;
}): Promise<PriceLevelTexts> {
  const quoteSymbol = resolveCanonicalQuoteSymbol(
    /HSTECH|3033|3032/i.test(input.quoteSymbol) ? "HSTECH" : "",
    input.quoteSymbol
  );
  const { bars, dataSource } = await fetchYahooDaily(quoteSymbol, input.forecastDate);
  const bars20 = bars.slice(-20);
  const bars60 = bars.slice(-60);
  if (bars20.length < 20) {
    throw new Error(`${TECHNICAL_PRICE_DATA_UNAVAILABLE}: insufficient structure bars`);
  }

  const closes = bars60.map((b) => b.close);
  const atr = atr14(bars60);
  const ema60 = ema(closes, 60);
  const lastEma = ema60.at(-1);
  const last = bars60.at(-1)!;
  const { macd, hist } = macdLine(closes);
  const lastMacd = macd.at(-1);
  const lastHist = hist.at(-1);

  const swings20 = findSwings(bars20, 20);
  const swings60 = findSwings(bars60, Math.min(60, bars60.length));
  const supportClusters = [
    ...clusterZones(swings20, atr, "low", last.close),
    ...clusterZones(swings60, atr, "low", last.close),
  ]
    .filter((z) => z.high <= last.close * 1.01)
    .sort((a, b) => b.high - a.high);

  const resistClusters = [
    ...clusterZones(swings20, atr, "high", last.close),
    ...clusterZones(swings60, atr, "high", last.close),
  ]
    .filter((z) => z.low >= last.close * 0.99)
    .sort((a, b) => a.low - b.low);

  // EMA60 confluence
  if (Number.isFinite(lastEma)) {
    const e = lastEma!;
    const band = atr * 0.4;
    if (e < last.close) {
      supportClusters.unshift({
        low: e - band,
        high: e + band * 0.3,
        score: 2,
        sources: ["EMA60动态支撑", "中期均线共振"],
      });
    } else {
      resistClusters.unshift({
        low: e - band * 0.3,
        high: e + band,
        score: 2,
        sources: ["EMA60动态压力", "中期均线共振"],
      });
    }
  }

  // MACD zero-axis / momentum note only as confluence tag on nearest zone
  if (Number.isFinite(lastMacd) && Number.isFinite(lastHist)) {
    const tag =
      lastMacd! >= 0
        ? lastHist! >= 0
          ? "MACD零轴上方动能仍在"
          : "MACD零轴上方动能衰减"
        : lastHist! < 0
          ? "MACD零轴下方动能偏弱"
          : "MACD零轴下方动能修复";
    if (supportClusters[0]) supportClusters[0].sources.push(tag);
    else if (resistClusters[0]) resistClusters[0].sources.push(tag);
  }

  const supports = supportClusters.filter((z) => z.score >= 2).slice(0, 2);
  const resists = resistClusters.filter((z) => z.score >= 2).slice(0, 2);

  if (!supports.length || !resists.length) {
    throw new Error(`${TECHNICAL_PRICE_DATA_UNAVAILABLE}: no confluence zones`);
  }

  // Ensure support below resistance
  if (supports[0]!.high >= resists[0]!.low) {
    throw new Error(`${TECHNICAL_PRICE_DATA_UNAVAILABLE}: inverted structure`);
  }

  const asset = assetKeyFromSymbol(input.symbol);
  const method: ConfirmationMethod =
    asset === "BTC" || asset === "WTI" ? "1小时收盘" : asset === "CN_STOCK" ? "日线收盘" : "4小时收盘" as ConfirmationMethod;
  // defaultConfirmationMethod doesn't have 4h — use 1h / 日线 / 30m from existing set
  const confirmMethod: ConfirmationMethod =
    asset === "BTC" || asset === "WTI"
      ? "1小时收盘"
      : asset === "SSE" || asset === "HSTECH" || asset === "CN_STOCK"
        ? "日线收盘"
        : "30分钟收盘";

  const supportLevels = supports.map((z, i) =>
    formatZone(z.low, z.high, asset, i === 0 ? "第一支撑区" : "第二支撑区", z.sources)
  );
  const resistanceLevels = resists.map((z, i) =>
    formatZone(z.low, z.high, asset, i === 0 ? "第一压力区" : "第二压力区", z.sources)
  );

  const s0 = supports[0]!;
  const r0 = resists[0]!;
  const sLow = formatAssetPrice(s0.low, asset).display;
  const sHigh = formatAssetPrice(s0.high, asset).display;
  const rLow = formatAssetPrice(r0.low, asset).display;
  const rHigh = formatAssetPrice(r0.high, asset).display;

  const confirmation = `${confirmMethod === "日线收盘" ? "日线" : confirmMethod === "1小时收盘" ? "1小时" : "30分钟"}K线收盘站上${rLow}—${rHigh}压力区上沿${rHigh}，确认突破有效。`;
  const invalidation = `${confirmMethod === "日线收盘" ? "日线" : confirmMethod === "1小时收盘" ? "1小时" : "30分钟"}K线收盘跌破${sLow}—${sHigh}支撑区下沿${sLow}，原「${input.directionLabel}」判断失效。`;

  const supportFmt = formatAssetPrice(s0.low, asset);
  const resistFmt = formatAssetPrice(r0.high, asset);

  const snap: ForecastPriceSnapshot = {
    previousClose: formatAssetPrice(last.close, asset).raw,
    previousHigh: formatAssetPrice(last.high, asset).raw,
    previousLow: formatAssetPrice(last.low, asset).raw,
    currentPrice: formatAssetPrice(last.close, asset).raw,
    recentSupport: supportFmt.raw,
    recentResistance: resistFmt.raw,
    atr14: atr,
    priceDataSource: dataSource,
    priceSnapshotAt: input.publishedAt,
    support: {
      levelType: "support",
      levelPrice: supportFmt.raw,
      levelReason: "近期结构低点",
      sourceTimestamp: last.date,
      display: supportLevels[0]!,
      displayShort: supportFmt.display,
    },
    resistance: {
      levelType: "resistance",
      levelPrice: resistFmt.raw,
      levelReason: "近期结构高点",
      sourceTimestamp: last.date,
      display: resistanceLevels[0]!,
      displayShort: resistFmt.display,
    },
    confirmationMethod: confirmMethod,
    unitLabel: supportFmt.unit,
  };

  void method;
  void defaultConfirmationMethod;

  return {
    supportLevels,
    resistanceLevels,
    confirmation,
    invalidation,
    priceSnapshot: snap,
    priceDataSourceLabel: dataSource,
    priceSnapshotAtLabel: input.publishedAt,
  };
}
