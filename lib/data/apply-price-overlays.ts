/**
 * Apply locked price-level overlays onto forecast records at read time.
 * Snapshots are frozen in price-level-overlays.json — never live-recalculated for history.
 */
import overlays from "@/lib/data/price-level-overlays.json";
import type { DailyForecast } from "@/types/daily-forecast";
import type { WeeklyAnalysisRecord } from "@/types/weekly-analysis";
import type {
  MemberStockDailyForecast,
  MemberStockWeeklyAnalysis,
} from "@/types/member-stock";
import type { ForecastPriceSnapshot } from "@/lib/market-data/price-levels";

type DailyOverlay = {
  supportLevels?: string[];
  resistanceLevels?: string[];
  invalidation?: string;
  confirmation?: string;
  priceSnapshot?: ForecastPriceSnapshot;
  priceDataSourceLabel?: string;
  priceSnapshotAtLabel?: string;
};

type LevelOverlay = DailyOverlay & {
  keySupport?: string[];
  keyResistance?: string[];
  expectedPath?: string;
};

const dailyMap = overlays.daily as Record<string, DailyOverlay>;
const weeklyMap = overlays.weekly as Record<string, LevelOverlay>;
const stockDailyMap = overlays.stockDaily as Record<string, LevelOverlay>;
const stockWeeklyMap = overlays.stockWeekly as Record<string, LevelOverlay>;

export function applyDailyPriceOverlay(f: DailyForecast): DailyForecast {
  const o = dailyMap[f.id];
  if (!o) return f;
  return {
    ...f,
    supportLevels: o.supportLevels ?? f.supportLevels,
    resistanceLevels: o.resistanceLevels ?? f.resistanceLevels,
    invalidation: o.invalidation ?? f.invalidation,
    confirmation: o.confirmation ?? f.confirmation,
    priceSnapshot: o.priceSnapshot ?? f.priceSnapshot,
    priceDataSourceLabel: o.priceDataSourceLabel ?? f.priceDataSourceLabel,
    priceSnapshotAtLabel: o.priceSnapshotAtLabel ?? f.priceSnapshotAtLabel,
  };
}

export function applyWeeklyPriceOverlay(w: WeeklyAnalysisRecord): WeeklyAnalysisRecord {
  const o = weeklyMap[w.id];
  if (!o) return w;
  return {
    ...w,
    keySupport: o.keySupport ?? w.keySupport,
    keyResistance: o.keyResistance ?? w.keyResistance,
    invalidation: o.invalidation ?? w.invalidation,
    confirmation: o.confirmation,
    priceSnapshot: o.priceSnapshot as ForecastPriceSnapshot | undefined,
    priceDataSourceLabel: o.priceDataSourceLabel,
    priceSnapshotAtLabel: o.priceSnapshotAtLabel,
  };
}

export function applyStockDailyPriceOverlay(f: MemberStockDailyForecast): MemberStockDailyForecast {
  const o = stockDailyMap[f.id];
  if (!o) return f;
  return {
    ...f,
    keySupport: o.keySupport ?? f.keySupport,
    keyResistance: o.keyResistance ?? f.keyResistance,
    invalidation: o.invalidation ?? f.invalidation,
    confirmation: o.confirmation,
    expectedPath: o.expectedPath ?? f.expectedPath,
    priceSnapshot: o.priceSnapshot as ForecastPriceSnapshot | undefined,
    priceDataSourceLabel: o.priceDataSourceLabel,
    priceSnapshotAtLabel: o.priceSnapshotAtLabel,
  };
}

export function applyStockWeeklyPriceOverlay(w: MemberStockWeeklyAnalysis): MemberStockWeeklyAnalysis {
  const o = stockWeeklyMap[w.id];
  if (!o) return w;
  return {
    ...w,
    keySupport: o.keySupport ?? w.keySupport,
    keyResistance: o.keyResistance ?? w.keyResistance,
    invalidation: o.invalidation ?? w.invalidation,
    confirmation: o.confirmation,
    priceSnapshot: o.priceSnapshot as ForecastPriceSnapshot | undefined,
    priceDataSourceLabel: o.priceDataSourceLabel,
    priceSnapshotAtLabel: o.priceSnapshotAtLabel,
  };
}

export function getBtcJul27BeijingLevels() {
  return overlays.btcJul27 as {
    highRaw: number;
    lowRaw: number;
    highDisplay: string;
    lowDisplay: string;
    dataSource: string;
  };
}
