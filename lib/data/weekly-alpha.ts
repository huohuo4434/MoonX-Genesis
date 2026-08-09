import "server-only";

import { assertWeeklyAlphaCalendar20260810 } from "@/lib/calendar/weekly-alpha-calendar";
import { WEEKLY_ALPHA_20260810_BASE } from "@/lib/data/weekly-alpha-20260810";
import { fetchRecentDailyBarsForForecast, type DailyMarketBar } from "@/lib/market-data/daily-prices";
import type { DailyAccuracyMarket } from "@/types/daily-accuracy";
import type { WeeklyAlphaEntry, WeeklyAlphaIssue, WeeklyAlphaTechnical } from "@/types/weekly-alpha";

const DATA_MAP: Record<string, { quoteSymbol: string; market: DailyAccuracyMarket; priceStyle: "USD" | "POINTS" }> = {
  btc: { quoteSymbol: "BTC-USD", market: "CRYPTO", priceStyle: "USD" },
  msft: { quoteSymbol: "MSFT", market: "US", priceStyle: "USD" },
  googl: { quoteSymbol: "GOOGL", market: "US", priceStyle: "USD" },
  sp500: { quoteSymbol: "^GSPC", market: "US", priceStyle: "POINTS" },
};

function roundFor(value: number, style: "USD" | "POINTS"): number {
  if (style === "POINTS") return Math.round(value * 10) / 10;
  if (value >= 10_000) return Math.round(value / 10) * 10;
  if (value >= 1_000) return Math.round(value);
  return Math.round(value * 100) / 100;
}

function formatPrice(value: number, style: "USD" | "POINTS"): string {
  const rounded = roundFor(value, style);
  if (style === "POINTS") return `${rounded.toLocaleString("en-US", { maximumFractionDigits: 1 })}点`;
  return `$${rounded.toLocaleString("en-US", { maximumFractionDigits: rounded >= 1000 ? 0 : 2 })}`;
}

function atr14(bars: DailyMarketBar[]): number {
  if (bars.length < 2) return 0;
  const rows = bars.slice(-15);
  const trs: number[] = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]!;
    const row = rows[i]!;
    trs.push(Math.max(row.high - row.low, Math.abs(row.high - prev.close), Math.abs(row.low - prev.close)));
  }
  return trs.length ? trs.reduce((a, b) => a + b, 0) / trs.length : 0;
}

function swingValues(bars: DailyMarketBar[], side: "LOW" | "HIGH"): number[] {
  const values: number[] = [];
  for (let i = 2; i < bars.length - 2; i++) {
    const row = bars[i]!;
    const neighbors = [bars[i - 2]!, bars[i - 1]!, bars[i + 1]!, bars[i + 2]!];
    if (side === "LOW" && neighbors.every((n) => row.low <= n.low)) values.push(row.low);
    if (side === "HIGH" && neighbors.every((n) => row.high >= n.high)) values.push(row.high);
  }
  return values;
}

function dedupeNearby(values: number[], tolerance: number): number[] {
  const result: number[] = [];
  for (const value of values) {
    if (!result.some((seen) => Math.abs(seen - value) <= tolerance)) result.push(value);
  }
  return result;
}

function buildExecutionTechnical(
  entry: WeeklyAlphaEntry,
  rawBars: DailyMarketBar[],
  style: "USD" | "POINTS"
): WeeklyAlphaTechnical {
  const bars = rawBars
    .filter((bar) => bar.date < WEEKLY_ALPHA_20260810_BASE.weekStart)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-80);
  if (bars.length < 20) throw new Error("WEEKLY_ALPHA_TECHNICAL_INSUFFICIENT_BARS");

  const visible = bars.slice(-32);
  const structure = bars.slice(-60);
  const last = structure.at(-1)!;
  const atr = Math.max(atr14(structure), last.close * 0.003);
  const tolerance = atr * 0.6;
  const lows = dedupeNearby(
    swingValues(structure, "LOW").filter((value) => value < last.close).sort((a, b) => b - a),
    tolerance
  );
  const highs = dedupeNearby(
    swingValues(structure, "HIGH").filter((value) => value > last.close).sort((a, b) => a - b),
    tolerance
  );

  const fallbackLow20 = Math.min(...structure.slice(-20).map((bar) => bar.low));
  const fallbackLow60 = Math.min(...structure.map((bar) => bar.low));
  const fallbackHigh20 = Math.max(...structure.slice(-20).map((bar) => bar.high));
  const fallbackHigh60 = Math.max(...structure.map((bar) => bar.high));
  const supportCenters = dedupeNearby([...lows, fallbackLow20, fallbackLow60].filter((v) => v < last.close), tolerance).slice(0, 2);
  const resistanceCenters = dedupeNearby([...highs, fallbackHigh20, fallbackHigh60].filter((v) => v > last.close), tolerance).slice(0, 2);

  if (!supportCenters.length) supportCenters.push(last.close - atr * 1.5);
  if (!resistanceCenters.length) resistanceCenters.push(last.close + atr * 1.5);

  const zone = (center: number) => ({ low: Math.max(0, center - atr * 0.28), high: center + atr * 0.28 });
  const supports = supportCenters.map(zone);
  const resistances = resistanceCenters.map(zone);
  const supportText = supports.map((item, index) => `S${index + 1} ${formatPrice(item.low, style)}–${formatPrice(item.high, style)}`);
  const resistanceText = resistances.map((item, index) => `R${index + 1} ${formatPrice(item.low, style)}–${formatPrice(item.high, style)}`);
  const s1 = supports[0]!;
  const s2 = supports[1] ?? supports[0]!;
  const r1 = resistances[0]!;

  return {
    status: "READY",
    support: supportText,
    resistance: resistanceText,
    confirmation: {
      zh: `执行确认：回踩S1后重新收回，或日内/日线有效突破R1后不快速跌回。技术确认只负责选位置，不改本期${entry.directionLabel.zh}方向。`,
      en: `Execution confirmation: reclaim S1 after a pullback, or break R1 without a fast failure. This changes execution quality, not the locked ${entry.directionLabel.en.toLowerCase()} direction.`,
    },
    invalidation: {
      zh: `执行失效：价格持续跌破${formatPrice(s2.low, style)}附近的第二支撑并形成更低高点/更低低点；仅暂停/调整执行，不倒改锁定周卦。`,
      en: `Execution invalidation: sustained trade below the second support near ${formatPrice(s2.low, style)} with lower highs/lows. Pause or resize execution; do not rewrite the locked weekly reading.`,
    },
    bars: visible.map(({ date, open, high, low, close }) => ({ date, open, high, low, close })),
    supportNumeric: (s1.low + s1.high) / 2,
    resistanceNumeric: (r1.low + r1.high) / 2,
    lastClose: last.close,
    snapshotLabel: {
      zh: `真实日K执行层 · 截止${last.date} · 周报发布前冻结`,
      en: `Real daily-candle execution layer · through ${last.date} · frozen pre-week`,
    },
    note: {
      zh: `S/R由发布前真实日K摆动高低点与ATR生成；最近收盘${formatPrice(last.close, style)}。`,
      en: `S/R is generated from pre-week real daily swing points and ATR; latest close ${formatPrice(last.close, style)}.`,
    },
  };
}

async function enrichEntry(entry: WeeklyAlphaEntry): Promise<WeeklyAlphaEntry> {
  if (entry.slug === "spcx") return entry;
  const config = DATA_MAP[entry.slug];
  if (!config) return entry;
  try {
    const bars = await fetchRecentDailyBarsForForecast({
      quoteSymbol: config.quoteSymbol,
      market: config.market,
      asOfDate: WEEKLY_ALPHA_20260810_BASE.weekStart,
    });
    return { ...entry, technical: buildExecutionTechnical(entry, bars, config.priceStyle) };
  } catch (error) {
    console.error("weekly alpha execution layer unavailable", entry.slug, error);
    return {
      ...entry,
      technical: {
        ...entry.technical,
        status: "UNAVAILABLE",
        support: [],
        resistance: [],
        bars: [],
        snapshotLabel: { zh: "真实行情暂不可用", en: "Real market data temporarily unavailable" },
        confirmation: { zh: "行情源恢复前不生成假支撑/压力。", en: "No synthetic levels are generated while the market-data source is unavailable." },
        invalidation: { zh: "行情源恢复前不生成假失效位。", en: "No synthetic invalidation level is generated while market data is unavailable." },
        note: { zh: "MOOX宁可空缺，也不使用猜测价格。", en: "MOOX leaves the field blank rather than guessing a price." },
      },
    };
  }
}

export async function buildWeeklyAlphaIssue(weekStart: string): Promise<WeeklyAlphaIssue | null> {
  if (weekStart !== WEEKLY_ALPHA_20260810_BASE.weekStart) return null;
  try {
    assertWeeklyAlphaCalendar20260810();
  } catch (error) {
    console.error("weekly alpha publication blocked by calendar gate", error);
    return null;
  }
  const entries = await Promise.all(WEEKLY_ALPHA_20260810_BASE.entries.map((entry) => enrichEntry(entry as WeeklyAlphaEntry)));
  return { ...WEEKLY_ALPHA_20260810_BASE, entries } as WeeklyAlphaIssue;
}
