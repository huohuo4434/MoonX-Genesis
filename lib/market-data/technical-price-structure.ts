/**
 * Technical Price Structure Engine
 * Support/resistance zones from real OHLC structure.
 */
import {
  assetKeyFromSymbol,
  formatAssetPrice,
  type ConfirmationMethod,
  type DailyAccuracyMarketLite,
  type ForecastPriceSnapshot,
  type PriceLevelTexts,
} from "@/lib/market-data/price-levels";
import { resolveCanonicalQuoteSymbol } from "@/lib/market-data/quote-symbols";

export const TECHNICAL_PRICE_DATA_UNAVAILABLE =
  "TECHNICAL_PRICE_DATA_UNAVAILABLE";

export type OhlcBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

type TechnicalZone = {
  low: number;
  high: number;
  score: number;
  sources: string[];
};

function toDateKeyInTz(tsSeconds: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(tsSeconds * 1000));
}

function yahooCandidates(quoteSymbol: string): string[] {
  const upper = quoteSymbol.toUpperCase();
  if (/HSTECH|3033|3032/.test(upper)) {
    return [...new Set([quoteSymbol, "^HSTECH"])];
  }
  return [quoteSymbol];
}

async function fetchYahooDailyOnce(
  quoteSymbol: string,
  asOfDate: string
): Promise<{
  bars: OhlcBar[];
  dataSource: string;
}> {
  const day = new Date(`${asOfDate}T12:00:00Z`);
  const period1 = Math.floor(
    (day.getTime() - 240 * 24 * 60 * 60 * 1000) / 1000
  );
  const period2 = Math.floor(
    (day.getTime() + 2 * 24 * 60 * 60 * 1000) / 1000
  );

  const encoded = encodeURIComponent(quoteSymbol);
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}` +
    `?interval=1d&period1=${period1}&period2=${period2}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MoonX/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(
      `${TECHNICAL_PRICE_DATA_UNAVAILABLE}: Yahoo HTTP ${res.status} for ${quoteSymbol}`
    );
  }

  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        meta?: {
          exchangeTimezoneName?: string;
        };
        indicators?: {
          quote?: Array<{
            open?: (number | null)[];
            high?: (number | null)[];
            low?: (number | null)[];
            close?: (number | null)[];
          }>;
        };
      }>;
    };
  };

  const result = json.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];

  if (!result?.timestamp?.length || !quote) {
    throw new Error(
      `${TECHNICAL_PRICE_DATA_UNAVAILABLE}: empty chart for ${quoteSymbol}`
    );
  }

  const tz = result.meta?.exchangeTimezoneName ?? "UTC";
  const bars: OhlcBar[] = [];

  for (let i = 0; i < result.timestamp.length; i++) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];

    if (
      open == null ||
      high == null ||
      low == null ||
      close == null ||
      ![open, high, low, close].every(Number.isFinite)
    ) {
      continue;
    }

    bars.push({
      date: toDateKeyInTz(
        result.timestamp[i]!,
        tz.includes("/") ? tz : "UTC"
      ),
      open,
      high,
      low,
      close,
    });
  }

  bars.sort((a, b) => a.date.localeCompare(b.date));

  const before = bars.filter((bar) => bar.date < asOfDate);

  return {
    bars: before.length ? before : bars.filter((bar) => bar.date <= asOfDate),
    dataSource: `yahoo-finance-1d:${quoteSymbol}`,
  };
}

async function fetchYahooDaily(
  quoteSymbol: string,
  asOfDate: string
): Promise<{
  bars: OhlcBar[];
  dataSource: string;
}> {
  let best:
    | {
        bars: OhlcBar[];
        dataSource: string;
      }
    | undefined;
  let lastError: unknown;

  for (const candidate of yahooCandidates(quoteSymbol)) {
    try {
      const result = await fetchYahooDailyOnce(candidate, asOfDate);

      if (!best || result.bars.length > best.bars.length) {
        best = result;
      }

      if (result.bars.length >= 20) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (best?.bars.length) {
    return best;
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        `${TECHNICAL_PRICE_DATA_UNAVAILABLE}: no daily bars for ${quoteSymbol}`
      );
}

function ema(values: number[], period: number): number[] {
  const out: number[] = [];
  const k = 2 / (period + 1);
  let previous: number | null = null;

  for (let i = 0; i < values.length; i++) {
    const value = values[i]!;

    if (previous == null) {
      if (i + 1 < period) {
        out.push(Number.NaN);
        continue;
      }

      const seed =
        values
          .slice(i + 1 - period, i + 1)
          .reduce((sum, item) => sum + item, 0) / period;

      previous = seed;
      out.push(seed);
      continue;
    }

    previous = value * k + previous * (1 - k);
    out.push(previous);
  }

  return out;
}

function macdLine(closes: number[]): {
  macd: number[];
  signal: number[];
  hist: number[];
} {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);

  const macd = closes.map((_, index) =>
    Number.isFinite(ema12[index]!) && Number.isFinite(ema26[index]!)
      ? ema12[index]! - ema26[index]!
      : Number.NaN
  );

  const signal = ema(
    macd.map((value) => (Number.isFinite(value) ? value : 0)),
    9
  );

  const hist = macd.map((value, index) =>
    Number.isFinite(value) && Number.isFinite(signal[index]!)
      ? value - signal[index]!
      : Number.NaN
  );

  return { macd, signal, hist };
}

function atr14(bars: OhlcBar[]): number {
  if (!bars.length) {
    return 0;
  }

  if (bars.length < 2) {
    return Math.max(
      Math.abs(bars[0]!.high - bars[0]!.low),
      Math.abs(bars[0]!.close) * 0.01
    );
  }

  if (bars.length < 15) {
    const ranges = bars.map((bar) => Math.abs(bar.high - bar.low));
    return (
      ranges.reduce((sum, value) => sum + value, 0) /
      Math.max(ranges.length, 1)
    );
  }

  let sum = 0;
  const slice = bars.slice(-15);

  for (let i = 1; i < slice.length; i++) {
    const current = slice[i]!;
    const previous = slice[i - 1]!;

    sum += Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
  }

  return sum / 14;
}

type Swing = {
  price: number;
  index: number;
  kind: "high" | "low";
  touches: number;
};

function findSwings(bars: OhlcBar[], lookback: number): Swing[] {
  const slice = bars.slice(-lookback);
  const swings: Swing[] = [];

  for (let i = 2; i < slice.length - 2; i++) {
    const high = slice[i]!.high;
    const low = slice[i]!.low;

    if (
      high >= slice[i - 1]!.high &&
      high >= slice[i - 2]!.high &&
      high >= slice[i + 1]!.high &&
      high >= slice[i + 2]!.high
    ) {
      swings.push({
        price: high,
        index: i,
        kind: "high",
        touches: 1,
      });
    }

    if (
      low <= slice[i - 1]!.low &&
      low <= slice[i - 2]!.low &&
      low <= slice[i + 1]!.low &&
      low <= slice[i + 2]!.low
    ) {
      swings.push({
        price: low,
        index: i,
        kind: "low",
        touches: 1,
      });
    }
  }

  return swings;
}

function clusterZones(
  swings: Swing[],
  atr: number,
  kind: "high" | "low",
  lastClose: number
): TechnicalZone[] {
  const points = swings
    .filter((swing) => swing.kind === kind)
    .map((swing) => swing.price);

  if (!points.length) {
    return [];
  }

  const width = Math.max(atr * 0.35, lastClose * 0.002);
  const sorted = [...points].sort((a, b) => a - b);
  const clusters: Array<{
    low: number;
    high: number;
    members: number[];
  }> = [];

  for (const point of sorted) {
    const hit = clusters.find(
      (cluster) =>
        point >= cluster.low - width && point <= cluster.high + width
    );

    if (hit) {
      hit.members.push(point);
      hit.low = Math.min(hit.low, point);
      hit.high = Math.max(hit.high, point);
    } else {
      clusters.push({
        low: point,
        high: point,
        members: [point],
      });
    }
  }

  return clusters
    .map((cluster) => {
      const sources: string[] = [];
      let score = 0;

      if (cluster.members.length >= 2) {
        score += 2;
        sources.push("多次触碰形成结构");
      } else {
        score += 1;
        sources.push("有效波段结构");
      }

      if (
        cluster.high - cluster.low <= width * 1.5 &&
        cluster.members.length >= 2
      ) {
        score += 1;
        sources.push("价格密集区");
      }

      return {
        low: Math.min(...cluster.members) - width * 0.25,
        high: Math.max(...cluster.members) + width * 0.25,
        score,
        sources,
      };
    })
    .filter((zone) => zone.score >= 2)
    .sort((a, b) => b.score - a.score);
}

function fallbackSupport(
  bars: OhlcBar[],
  atr: number,
  lastClose: number
): TechnicalZone {
  const recent = bars.slice(-20);
  const base = Math.min(...recent.map((bar) => bar.low));
  const width = Math.max(atr * 0.3, lastClose * 0.002);

  return {
    low: Math.min(base - width * 0.25, lastClose - width * 1.2),
    high: Math.min(base + width * 0.25, lastClose - width * 0.2),
    score: 2,
    sources: ["近阶段低位结构", "波动率区间"],
  };
}

function fallbackResistance(
  bars: OhlcBar[],
  atr: number,
  lastClose: number
): TechnicalZone {
  const recent = bars.slice(-20);
  const base = Math.max(...recent.map((bar) => bar.high));
  const width = Math.max(atr * 0.3, lastClose * 0.002);

  return {
    low: Math.max(base - width * 0.25, lastClose + width * 0.2),
    high: Math.max(base + width * 0.25, lastClose + width * 1.2),
    score: 2,
    sources: ["近阶段高位结构", "波动率区间"],
  };
}

function normalizePrimaryZones(
  support: TechnicalZone,
  resistance: TechnicalZone,
  lastClose: number,
  atr: number
): {
  support: TechnicalZone;
  resistance: TechnicalZone;
} {
  if (support.high < resistance.low) {
    return { support, resistance };
  }

  const gap = Math.max(atr * 0.4, lastClose * 0.003);

  return {
    support: {
      ...support,
      low: Math.min(support.low, lastClose - gap * 1.4),
      high: Math.min(support.high, lastClose - gap * 0.25),
      sources: [...support.sources, "区间顺序校正"],
    },
    resistance: {
      ...resistance,
      low: Math.max(resistance.low, lastClose + gap * 0.25),
      high: Math.max(resistance.high, lastClose + gap * 1.4),
      sources: [...resistance.sources, "区间顺序校正"],
    },
  };
}

function formatZone(
  low: number,
  high: number,
  asset: Parameters<typeof formatAssetPrice>[1],
  label: string,
  sources: string[]
): string {
  const lowPrice = formatAssetPrice(Math.min(low, high), asset);
  const highPrice = formatAssetPrice(Math.max(low, high), asset);
  const sourceText = sources.slice(0, 3).join("；");

  return `${label}：${lowPrice.display.replace(
    lowPrice.unit,
    ""
  )}—${highPrice.display}（来源：${sourceText}）`;
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
  const canonicalQuoteSymbol = resolveCanonicalQuoteSymbol(
    /HSTECH|3033|3032/i.test(input.quoteSymbol) ? "HSTECH" : "",
    input.quoteSymbol
  );

  const { bars, dataSource } = await fetchYahooDaily(
    canonicalQuoteSymbol,
    input.forecastDate
  );

  if (bars.length < 3) {
    throw new Error(
      `${TECHNICAL_PRICE_DATA_UNAVAILABLE}: insufficient structure bars`
    );
  }

  const bars20 = bars.slice(-Math.min(20, bars.length));
  const bars60 = bars.slice(-Math.min(60, bars.length));
  const last = bars60.at(-1)!;
  const closes = bars60.map((bar) => bar.close);
  const atr = Math.max(atr14(bars60), Math.abs(last.close) * 0.002);
  const emaPeriod = Math.min(60, Math.max(3, closes.length));
  const emaValues = ema(closes, emaPeriod);
  const lastEma = emaValues.at(-1);
  const { macd, hist } = macdLine(closes);
  const lastMacd = macd.at(-1);
  const lastHist = hist.at(-1);

  const swings20 = findSwings(bars20, bars20.length);
  const swings60 = findSwings(bars60, bars60.length);

  const supportClusters = [
    ...clusterZones(swings20, atr, "low", last.close),
    ...clusterZones(swings60, atr, "low", last.close),
  ]
    .filter((zone) => zone.high <= last.close * 1.01)
    .sort((a, b) => b.high - a.high);

  const resistanceClusters = [
    ...clusterZones(swings20, atr, "high", last.close),
    ...clusterZones(swings60, atr, "high", last.close),
  ]
    .filter((zone) => zone.low >= last.close * 0.99)
    .sort((a, b) => a.low - b.low);

  if (Number.isFinite(lastEma)) {
    const emaValue = lastEma!;
    const band = atr * 0.4;

    if (emaValue < last.close) {
      supportClusters.unshift({
        low: emaValue - band,
        high: emaValue + band * 0.3,
        score: 2,
        sources: ["中期均线支撑", "均线共振"],
      });
    } else {
      resistanceClusters.unshift({
        low: emaValue - band * 0.3,
        high: emaValue + band,
        score: 2,
        sources: ["中期均线压力", "均线共振"],
      });
    }
  }

  if (Number.isFinite(lastMacd) && Number.isFinite(lastHist)) {
    const tag =
      lastMacd! >= 0
        ? lastHist! >= 0
          ? "MACD零轴上方动能仍在"
          : "MACD零轴上方动能衰减"
        : lastHist! < 0
          ? "MACD零轴下方动能偏弱"
          : "MACD零轴下方动能修复";

    if (supportClusters[0]) {
      supportClusters[0].sources.push(tag);
    } else if (resistanceClusters[0]) {
      resistanceClusters[0].sources.push(tag);
    }
  }

  const supportCandidates = supportClusters
    .filter((zone) => zone.score >= 2)
    .slice(0, 2);

  const resistanceCandidates = resistanceClusters
    .filter((zone) => zone.score >= 2)
    .slice(0, 2);

  if (!supportCandidates.length) {
    supportCandidates.push(fallbackSupport(bars20, atr, last.close));
  }

  if (!resistanceCandidates.length) {
    resistanceCandidates.push(
      fallbackResistance(bars20, atr, last.close)
    );
  }

  const normalized = normalizePrimaryZones(
    supportCandidates[0]!,
    resistanceCandidates[0]!,
    last.close,
    atr
  );

  supportCandidates[0] = normalized.support;
  resistanceCandidates[0] = normalized.resistance;

  const asset = assetKeyFromSymbol(input.symbol);

  const confirmationMethod: ConfirmationMethod =
    asset === "BTC" || asset === "WTI"
      ? "1小时收盘"
      : asset === "SSE" ||
          asset === "HSTECH" ||
          asset === "CN_STOCK"
        ? "日线收盘"
        : "30分钟收盘";

  const supportLevels = supportCandidates.map((zone, index) =>
    formatZone(
      zone.low,
      zone.high,
      asset,
      index === 0 ? "第一支撑区" : "第二支撑区",
      zone.sources
    )
  );

  const resistanceLevels = resistanceCandidates.map((zone, index) =>
    formatZone(
      zone.low,
      zone.high,
      asset,
      index === 0 ? "第一压力区" : "第二压力区",
      zone.sources
    )
  );

  const firstSupport = supportCandidates[0]!;
  const firstResistance = resistanceCandidates[0]!;

  const supportLow = formatAssetPrice(firstSupport.low, asset).display;
  const supportHigh = formatAssetPrice(firstSupport.high, asset).display;
  const resistanceLow = formatAssetPrice(firstResistance.low, asset).display;
  const resistanceHigh = formatAssetPrice(firstResistance.high, asset).display;

  const periodText =
    confirmationMethod === "日线收盘"
      ? "日线"
      : confirmationMethod === "1小时收盘"
        ? "1小时"
        : "30分钟";

  const confirmation =
    `${periodText}K线收盘站上${resistanceLow}—${resistanceHigh}` +
    `压力区上沿${resistanceHigh}，确认突破有效。`;

  const invalidation =
    `${periodText}K线收盘跌破${supportLow}—${supportHigh}` +
    `支撑区下沿${supportLow}，原「${input.directionLabel}」判断失效。`;

  const supportPrice = formatAssetPrice(firstSupport.low, asset);
  const resistancePrice = formatAssetPrice(firstResistance.high, asset);

  const priceSnapshot: ForecastPriceSnapshot = {
    previousClose: formatAssetPrice(last.close, asset).raw,
    previousHigh: formatAssetPrice(last.high, asset).raw,
    previousLow: formatAssetPrice(last.low, asset).raw,
    currentPrice: formatAssetPrice(last.close, asset).raw,
    recentSupport: supportPrice.raw,
    recentResistance: resistancePrice.raw,
    atr14: atr,
    priceDataSource: dataSource,
    priceSnapshotAt: input.publishedAt,
    support: {
      levelType: "support",
      levelPrice: supportPrice.raw,
      levelReason: "近期结构低点",
      sourceTimestamp: last.date,
      display: supportLevels[0]!,
      displayShort: supportPrice.display,
    },
    resistance: {
      levelType: "resistance",
      levelPrice: resistancePrice.raw,
      levelReason: "近期结构高点",
      sourceTimestamp: last.date,
      display: resistanceLevels[0]!,
      displayShort: resistancePrice.display,
    },
    confirmationMethod,
    unitLabel: supportPrice.unit,
  };

  return {
    supportLevels,
    resistanceLevels,
    confirmation,
    invalidation,
    priceSnapshot,
    priceDataSourceLabel: dataSource,
    priceSnapshotAtLabel: input.publishedAt,
  };
}
