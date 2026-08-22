// MOOX_V72065_MEMBER_DAILY_LIVE_LEVELS
import type { DailyForecast } from "@/types/daily-forecast";
import {
  assetKeyFromSymbol,
  formatAssetPrice,
} from "@/lib/market-data/price-levels";
import { listDailyVerificationResults } from "@/lib/data/daily-accuracy-store";
import {
  getIntradayTechnicalLevelMap,
  type IntradayTechnicalLevels,
} from "@/lib/market-data/intraday-chan-levels";

export type MemberDailyTechnicalView = {
  support: string;
  resistance: string;
  invalidation: string;
  source: "CHAN_4H" | "SWING_4H" | "CHAN_1H" | "SWING_1H" | "FALLBACK" | "VERIFIED_OHLC" | "FORECAST_SNAPSHOT" | "LOCKED_LEVELS" | "UNAVAILABLE";
};

type Ohlc = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

function normalizeSymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (s === "SHCOMP" || s === "000001.SS" || s === "SSE") return "SSEC";
  if (s === "GLD" || s === "XAU" || s === "GC=F") return "GOLD";
  if (s === "SI" || s === "SI=F" || s === "XAG") return "SILVER";
  if (s === "CL" || s === "CL=F") return "WTI";
  return s;
}

function symbolAliases(symbol: string): Set<string> {
  const key = normalizeSymbol(symbol);
  const aliases: Record<string, string[]> = {
    BTC: ["BTC"],
    ETH: ["ETH"],
    SPX: ["SPX", "^GSPC"],
    NDX: ["NDX", "^NDX"],
    SSEC: ["SSEC", "SHCOMP", "000001.SS", "SSE"],
    HSTECH: ["HSTECH", "^HSTECH", "3033.HK"],
    GOLD: ["GOLD", "GLD", "XAU", "XAUUSD", "GC=F"],
    SILVER: ["SILVER", "SI", "XAG", "SI=F", "SLV"],
    WTI: ["WTI", "CL", "CL=F"],
  };
  return new Set((aliases[key] ?? [key]).map((item) => item.toUpperCase()));
}

function containsPrice(text: string | undefined): boolean {
  if (!text) return false;
  return /\d/.test(text) && !/行情数据异常|待补充|暂缺|待补算/u.test(text);
}

function stripLevel(text: string): string {
  return text
    .replace(/^(第一|第二|第三)?(支撑|压力)(区|位)?[：:]\s*/u, "")
    .replace(/[（(]来源：[^）)]*[）)]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function trueRange(current: Ohlc, previous?: Ohlc): number {
  if (!previous) return Math.max(current.high - current.low, current.close * 0.008);
  return Math.max(
    current.high - current.low,
    Math.abs(current.high - previous.close),
    Math.abs(current.low - previous.close)
  );
}

function averageRange(bars: Ohlc[]): number {
  if (!bars.length) return 0;
  let sum = 0;
  for (let i = 0; i < bars.length; i += 1) {
    const current = bars[i];
    if (!current) continue;
    sum += trueRange(current, i > 0 ? bars[i - 1] : undefined);
  }
  return sum / bars.length;
}

function localSwingLows(bars: Ohlc[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < bars.length - 1; i += 1) {
    const prev = bars[i - 1];
    const current = bars[i];
    const next = bars[i + 1];
    if (!prev || !current || !next) continue;
    if (current.low <= prev.low && current.low <= next.low) out.push(current.low);
  }
  return out;
}

function localSwingHighs(bars: Ohlc[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < bars.length - 1; i += 1) {
    const prev = bars[i - 1];
    const current = bars[i];
    const next = bars[i + 1];
    if (!prev || !current || !next) continue;
    if (current.high >= prev.high && current.high >= next.high) out.push(current.high);
  }
  return out;
}

function nearestBelow(values: number[], price: number): number | undefined {
  return values.filter((value) => value < price).sort((a, b) => b - a)[0];
}

function nearestAbove(values: number[], price: number): number | undefined {
  return values.filter((value) => value > price).sort((a, b) => a - b)[0];
}

function levelSymbol(symbol: string): string {
  const normalized = normalizeSymbol(symbol);
  return normalized === "SSEC" ? "SSEC" : normalized;
}

function formatZone(base: number, width: number, symbol: string, type: "support" | "resistance", lastClose: number): string {
  const asset = assetKeyFromSymbol(levelSymbol(symbol));
  const minGap = Math.max(width * 0.35, Math.abs(lastClose) * 0.0005);
  let low = base - width;
  let high = base + width;

  if (type === "support") {
    high = Math.min(high, lastClose - minGap);
    if (low >= high) low = high - Math.max(width, minGap);
  } else {
    low = Math.max(low, lastClose + minGap);
    if (high <= low) high = low + Math.max(width, minGap);
  }

  const a = formatAssetPrice(Math.min(low, high), asset).display;
  const b = formatAssetPrice(Math.max(low, high), asset).display;
  return a === b ? a : `${a}—${b}`;
}

function invalidationFor(direction: string, support: string, resistance: string): string {
  if (/上涨|回升|看涨/u.test(direction)) return `跌破 ${support}`;
  if (/下跌|回落|看跌/u.test(direction)) return `站上 ${resistance}`;
  return `上破 ${resistance} / 下破 ${support}`;
}

export function deriveMemberDailyTechnicalViewFromBars(
  forecast: Pick<DailyForecast, "symbol" | "direction" | "directionLabel">,
  barsInput: Ohlc[]
): MemberDailyTechnicalView | null {
  const bars = barsInput
    .filter((bar) => [bar.open, bar.high, bar.low, bar.close].every((value) => Number.isFinite(value) && value > 0))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12);
  const last = bars.at(-1);
  if (!last) return null;

  const atr = Math.max(averageRange(bars), last.close * 0.004);
  const width = Math.max(atr * 0.12, last.close * 0.0012);

  const swingLows = localSwingLows(bars);
  const swingHighs = localSwingHighs(bars);
  const allLows = bars.map((bar) => bar.low);
  const allHighs = bars.map((bar) => bar.high);

  const supportBase =
    nearestBelow(swingLows, last.close) ??
    nearestBelow(allLows, last.close) ??
    last.close - atr * 0.8;
  const resistanceBase =
    nearestAbove(swingHighs, last.close) ??
    nearestAbove(allHighs, last.close) ??
    last.close + atr * 0.8;

  const support = formatZone(supportBase, width, forecast.symbol, "support", last.close);
  const resistance = formatZone(resistanceBase, width, forecast.symbol, "resistance", last.close);
  const direction = forecast.directionLabel || forecast.direction;

  return {
    support,
    resistance,
    invalidation: invalidationFor(direction, support, resistance),
    source: "VERIFIED_OHLC",
  };
}

function snapshotView(forecast: DailyForecast): MemberDailyTechnicalView | null {
  const snapshot = forecast.priceSnapshot;
  if (!snapshot) return null;
  const supportValue = snapshot.recentSupport || snapshot.support?.levelPrice;
  const resistanceValue = snapshot.recentResistance || snapshot.resistance?.levelPrice;
  if (
    typeof supportValue !== "number" ||
    typeof resistanceValue !== "number" ||
    !Number.isFinite(supportValue) ||
    !Number.isFinite(resistanceValue) ||
    supportValue <= 0 ||
    resistanceValue <= 0
  ) return null;
  const asset = assetKeyFromSymbol(levelSymbol(forecast.symbol));
  const support = formatAssetPrice(supportValue, asset).display;
  const resistance = formatAssetPrice(resistanceValue, asset).display;
  const direction = forecast.directionLabel || forecast.direction;
  return {
    support,
    resistance,
    invalidation: invalidationFor(direction, support, resistance),
    source: "FORECAST_SNAPSHOT",
  };
}

function lockedView(forecast: DailyForecast): MemberDailyTechnicalView | null {
  const supportRaw = forecast.supportLevels?.[0];
  const resistanceRaw = forecast.resistanceLevels?.[0];
  if (!containsPrice(supportRaw) || !containsPrice(resistanceRaw)) return null;
  const support = stripLevel(supportRaw!);
  const resistance = stripLevel(resistanceRaw!);
  const direction = forecast.directionLabel || forecast.direction;
  return {
    support,
    resistance,
    invalidation: invalidationFor(direction, support, resistance),
    source: "LOCKED_LEVELS",
  };
}

export async function buildMemberDailyTechnicalViews(
  forecasts: DailyForecast[]
): Promise<Record<string, MemberDailyTechnicalView>> {
  // Gao Shan hierarchy: the headline levels come from the 4H center/segment
  // map. 1H is only a tactical fallback. Load each unique market once for both
  // today and tomorrow, and cache successful snapshots for five minutes.
  const uniqueSymbols = [...new Set(forecasts.map((forecast) => normalizeSymbol(forecast.symbol)))];
  const [intraday, results] = await Promise.all([
    getIntradayTechnicalLevelMap(uniqueSymbols).catch((): Record<string, IntradayTechnicalLevels> => ({})),
    listDailyVerificationResults().catch(() => []),
  ]);
  const output: Record<string, MemberDailyTechnicalView> = {};

  for (const forecast of forecasts) {
    const live = intraday[normalizeSymbol(forecast.symbol)];
    if (live && live.source !== "UNAVAILABLE") {
      const direction = forecast.directionLabel || forecast.direction;
      output[forecast.id] = {
        support: live.support,
        resistance: live.resistance,
        invalidation: invalidationFor(direction, live.support, live.resistance),
        source: live.source,
      };
      continue;
    }
    const aliases = symbolAliases(forecast.symbol);
    const byDate = new Map<string, { bar: Ohlc; verifiedAt: string }>();

    for (const result of results) {
      if (result.isSystemTest) continue;
      if (result.forecastDate >= forecast.forecastForDate) continue;
      if (!aliases.has(String(result.symbol ?? "").trim().toUpperCase())) continue;

      const open = result.actualOpen ?? result.previousClose;
      const high = result.actualHigh;
      const low = result.actualLow;
      const close = result.actualClose;
      if (
        typeof high !== "number" ||
        typeof low !== "number" ||
        ![open, high, low, close].every((value) => Number.isFinite(value) && value > 0)
      ) continue;

      const current = byDate.get(result.forecastDate);
      if (!current || result.verifiedAt > current.verifiedAt) {
        byDate.set(result.forecastDate, {
          bar: { date: result.forecastDate, open, high, low, close },
          verifiedAt: result.verifiedAt,
        });
      }
    }

    const bars = [...byDate.values()].map((row) => row.bar);
    const derived = deriveMemberDailyTechnicalViewFromBars(forecast, bars);
    output[forecast.id] =
      derived ??
      snapshotView(forecast) ??
      lockedView(forecast) ?? {
        support: "—",
        resistance: "—",
        invalidation: "—",
        source: "UNAVAILABLE",
      };
  }

  return output;
}
