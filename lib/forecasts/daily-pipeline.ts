/**
 * Beijing-time daily forecast pipeline from weekly Liu Yao sources.
 * 19:30 draft → 19:50 revise → 20:00 lock. Idempotent per market/date/version.
 */
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import { getBeijingClock } from "@/lib/calendar/publish-windows";
import { getNextForecastDate } from "@/lib/calendar/next-trading-day";
import { generateDailyFromWeekly, marketMeta, reviseAsNewVersion } from "@/lib/forecasts/weekly-to-daily";
import type { MarketSnapshot } from "@/lib/forecasts/market-progress";
import {
  ensureCanonicalWeeklySourcesInDb,
  getWeeklySourceForMarketDate,
  upsertGeneratedDaily,
} from "@/lib/weekly-source/store";
import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";
import { ALL_WEEKLY_ANALYSES } from "@/lib/data/published-weekly-analysis-20260727";
import type { WeeklyForecastSourceRecord } from "@/lib/weekly-source/types";
import type { WeeklyAnalysisRecord } from "@/types/weekly-analysis";
import { findCanonicalWeeklySource } from "@/lib/weekly-source/canonical-six";

export const CORE_DAILY_MARKETS = ["BTC", "SPX", "NDX", "SHCOMP", "HSTECH", "GLD", "WTI"] as const;

export type PipelinePhase = "idle" | "draft" | "revise" | "lock";

export function resolvePipelinePhase(now = new Date()): PipelinePhase {
  const { totalMinutes } = getBeijingClock(now);
  if (totalMinutes >= 20 * 60) return "lock";
  if (totalMinutes >= 19 * 60 + 50) return "revise";
  if (totalMinutes >= 19 * 60 + 30) return "draft";
  return "idle";
}

function analysisAsWeeklySource(
  marketCode: string,
  forecastDate: string
): WeeklyForecastSourceRecord | null {
  const code =
    marketCode === "SHCOMP" || marketCode === "SSEC"
      ? ["SHCOMP", "000001.SS", "SSEC"]
      : marketCode === "GLD"
        ? ["GLD", "Gold"]
        : [marketCode];
  const hit = ALL_WEEKLY_ANALYSES.find((w: WeeklyAnalysisRecord) => {
    const display = w.displaySymbol ?? "";
    const symbol = w.symbol ?? "";
    return (
      code.includes(display) ||
      code.includes(symbol) ||
      (marketCode === "SHCOMP" && symbol === "000001.SS")
    );
  });
  if (!hit) return null;
  if (!(hit.weekStart <= forecastDate && hit.weekEnd >= forecastDate)) return null;
  return {
    id: hit.id,
    marketCode: marketCode === "SHCOMP" ? "SHCOMP" : marketCode,
    periodStart: hit.weekStart,
    periodEnd: hit.weekEnd,
    primaryHexagram: null,
    changedHexagram: null,
    movingLines: [],
    specialPatterns: [],
    weeklyDirection: hit.overallDirection,
    weeklyPath: hit.weeklyPath,
    interpretation: hit.headline,
    riskSummary: (hit.risks ?? []).join("；") || hit.invalidation,
    sourceType: "WEEKLY_ANALYSIS",
    version: hit.version,
    status: "LOCKED",
    publishedAt: hit.publishedAt,
    lockedAt: hit.publishedAt,
    createdAt: hit.publishedAt,
    updatedAt: hit.updatedAt,
  };
}

async function resolveWeekly(
  marketCode: string,
  forecastDate: string
): Promise<WeeklyForecastSourceRecord | null> {
  const fromDb = await getWeeklySourceForMarketDate(marketCode, forecastDate);
  if (fromDb) return fromDb;
  return analysisAsWeeklySource(marketCode, forecastDate);
}

function emptySnapshot(): MarketSnapshot {
  return {
    lastPrice: null,
    previousClose: null,
    weekOpen: null,
    weekHigh: null,
    weekLow: null,
    nearestSupport: null,
    nearestResistance: null,
    atr: null,
    weekReturnPct: null,
  };
}

/** Best-effort quote pull — never fabricates levels when unavailable. */
async function loadSnapshot(): Promise<MarketSnapshot> {
  // Live quote wiring is optional; revision rules still apply when snapshot fields are present.
  return emptySnapshot();
}

export type PipelineReport = {
  phase: PipelinePhase;
  beijingDate: string;
  upserted: string[];
  skipped: string[];
  errors: Array<{ market: string; error: string }>;
  records: GeneratedDailyForecastRecord[];
};

export async function runDailyForecastPipeline(input?: {
  now?: Date;
  forcePhase?: PipelinePhase;
  targetDateByMarket?: Partial<Record<string, string>>;
  forceDraftDate?: string;
}): Promise<PipelineReport> {
  const now = input?.now ?? new Date();
  const phase = input?.forcePhase ?? resolvePipelinePhase(now);
  const beijingDate = getBeijingTodayKey(now);
  const report: PipelineReport = {
    phase,
    beijingDate,
    upserted: [],
    skipped: [],
    errors: [],
    records: [],
  };

  await ensureCanonicalWeeklySourcesInDb();

  if (phase === "idle" && !input?.forcePhase && !input?.forceDraftDate) {
    return report;
  }

  for (const market of CORE_DAILY_MARKETS) {
    try {
      const meta = marketMeta(market);
      const target =
        input?.targetDateByMarket?.[market] ??
        input?.forceDraftDate ??
        getNextForecastDate(meta.legacyMarket, beijingDate);
      const weekly = await resolveWeekly(market, target);
      if (!weekly) {
        report.skipped.push(`${market}:no-weekly-source`);
        continue;
      }

      const snapshot =
        phase === "revise" || phase === "lock" ? await loadSnapshot() : emptySnapshot();

      let status: GeneratedDailyForecastRecord["status"] = "DRAFT";
      if (phase === "lock") status = "LOCKED";
      else if (phase === "revise") status = "DRAFT";

      let record = generateDailyFromWeekly({
        weekly,
        forecastDate: target,
        version: 1,
        status,
        snapshot,
      });

      // If revise detects invalidation with an existing locked V1, create V2
      if (phase === "revise" && record.marketProgressStatus === "INVALIDATED") {
        record = reviseAsNewVersion(record, weekly, snapshot);
      }

      if (phase === "lock") {
        record = {
          ...record,
          status: "LOCKED",
          publishedAt: record.publishedAt ?? now.toISOString(),
          lockedAt: now.toISOString(),
        };
      }

      const saved = await upsertGeneratedDaily(record);
      report.records.push(saved.record);
      report.upserted.push(saved.record.id);
    } catch (err) {
      report.errors.push({
        market,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return report;
}

/** Pure helper for tests — generate without I/O. */
export function generateCoreMarketsFromWeeklyPure(
  forecastDate: string,
  status: GeneratedDailyForecastRecord["status"] = "LOCKED"
): GeneratedDailyForecastRecord[] {
  const out: GeneratedDailyForecastRecord[] = [];
  for (const market of CORE_DAILY_MARKETS) {
    const weekly =
      findCanonicalWeeklySource(market, forecastDate) ?? analysisAsWeeklySource(market, forecastDate);
    if (!weekly) continue;
    out.push(
      generateDailyFromWeekly({
        weekly,
        forecastDate,
        version: 1,
        status,
        snapshot: emptySnapshot(),
      })
    );
  }
  return out;
}
