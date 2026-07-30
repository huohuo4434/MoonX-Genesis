/**
 * Beijing-time daily forecast pipeline from weekly Liu Yao sources.
 * Continuous autonomous forecast pipeline. Idempotent per market/date/version.
 */
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import { getCurrentSessionDate, getNextForecastDate } from "@/lib/calendar/next-trading-day";
import { buildLockedLevelsForAsset, validatePublishedPriceLevels } from "@/lib/market-data/price-levels";
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

export function resolvePipelinePhase(_now = new Date()): PipelinePhase {
  // Continuous publication: every scheduled run may create/refresh a locked forecast.
  // Admin review is an optional override, never a dependency.
  return "lock";
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
  const candidates = ALL_WEEKLY_ANALYSES.filter((w: WeeklyAnalysisRecord) => {
    const display = w.displaySymbol ?? "";
    const symbol = w.symbol ?? "";
    return (
      code.includes(display) ||
      code.includes(symbol) ||
      (marketCode === "SHCOMP" && symbol === "000001.SS")
    );
  });
  const exact = candidates.find((w) => w.weekStart <= forecastDate && w.weekEnd >= forecastDate);
  const prior = candidates
    .filter((w) => w.weekEnd < forecastDate)
    .sort((a, b) => b.weekEnd.localeCompare(a.weekEnd))[0];
  const dayGap = prior
    ? Math.round(
        (Date.parse(`${forecastDate}T00:00:00Z`) - Date.parse(`${prior.weekEnd}T00:00:00Z`)) /
          86_400_000
      )
    : Number.POSITIVE_INFINITY;
  const hit = exact ?? (dayGap <= 7 ? prior : undefined);
  if (!hit) return null;
  const continuity = !exact;
  return {
    id: continuity ? `${hit.id}-CONTINUITY-${forecastDate}` : hit.id,
    marketCode: marketCode === "SHCOMP" ? "SHCOMP" : marketCode,
    periodStart: continuity ? forecastDate : hit.weekStart,
    periodEnd: continuity ? forecastDate : hit.weekEnd,
    primaryHexagram: null,
    changedHexagram: null,
    movingLines: [],
    specialPatterns: [],
    weeklyDirection: hit.overallDirection,
    weeklyPath: continuity
      ? `新周正式研究尚未生成，暂沿用最近周度背景：${hit.weeklyPath}`
      : hit.weeklyPath,
    interpretation: continuity
      ? `过渡预测（低置信度）：${hit.headline}`
      : hit.headline,
    riskSummary: [
      continuity ? "过渡预测仅用于避免页面空白，新周研究生成后自动替换。" : "",
      (hit.risks ?? []).join("；") || hit.invalidation,
    ].filter(Boolean).join("；"),
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


function verificationMarket(market: ReturnType<typeof marketMeta>["legacyMarket"]):
  | "CRYPTO"
  | "US"
  | "CN"
  | "HK"
  | "US_FUTURES" {
  if (market === "crypto") return "CRYPTO";
  if (market === "cn") return "CN";
  if (market === "hk") return "HK";
  if (market === "commodity") return "US_FUTURES";
  return "US";
}

async function buildTechnicalLevelsWithRetry(input: {
  marketCode: string;
  direction: string;
  forecastDate: string;
  publishedAt: string;
  attempts: number;
}) {
  const meta = marketMeta(input.marketCode);
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= input.attempts; attempt += 1) {
    try {
      const levels = await buildLockedLevelsForAsset({
        symbol: input.marketCode === "SHCOMP" ? "SSEC" : input.marketCode,
        quoteSymbol: meta.quoteSymbol,
        market: verificationMarket(meta.legacyMarket),
        assetName: meta.assetName,
        directionLabel: input.direction,
        forecastDate: input.forecastDate,
        publishedAt: input.publishedAt,
      });
      const errors = validatePublishedPriceLevels({
        supportLevels: levels.supportLevels,
        resistanceLevels: levels.resistanceLevels,
        confirmation: levels.confirmation,
        invalidation: levels.invalidation,
        priceSnapshot: levels.priceSnapshot,
      });
      if (errors.length) throw new Error(errors.join("；"));
      return levels;
    } catch (error) {
      lastError = error;
      if (attempt < input.attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_500));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("TECHNICAL_PRICE_DATA_UNAVAILABLE");
}

export type PipelineReport = {
  phase: PipelinePhase;
  beijingDate: string;
  upserted: string[];
  skipped: string[];
  warnings: Array<{ market: string; date: string; error: string }>;
  errors: Array<{ market: string; date?: string; error: string }>;
  records: GeneratedDailyForecastRecord[];
};

function targetDatesForMarket(input: {
  market: string;
  beijingDate: string;
  targetDateByMarket?: Partial<Record<string, string>>;
  forceDraftDate?: string;
}): string[] {
  const forced = input.targetDateByMarket?.[input.market] ?? input.forceDraftDate;
  if (forced) return [forced];

  const meta = marketMeta(input.market);
  const currentSession = getCurrentSessionDate(meta.legacyMarket, input.beijingDate);
  const nextSession = getNextForecastDate(meta.legacyMarket, input.beijingDate);
  const targets: string[] = [];

  // Only publish a "today" row when that calendar date is an actual session for the market.
  // Crypto is always a session; equities/commodities skip weekends and holidays.
  if (currentSession === input.beijingDate) targets.push(currentSession);
  targets.push(nextSession);
  return [...new Set(targets)];
}

export async function runDailyForecastPipeline(input?: {
  now?: Date;
  forcePhase?: PipelinePhase;
  targetDateByMarket?: Partial<Record<string, string>>;
  forceDraftDate?: string;
}): Promise<PipelineReport> {
  const now = input?.now ?? new Date();
  const phase = input?.forcePhase ?? resolvePipelinePhase();
  const beijingDate = getBeijingTodayKey(now);
  const report: PipelineReport = {
    phase,
    beijingDate,
    upserted: [],
    skipped: [],
    warnings: [],
    errors: [],
    records: [],
  };

  await ensureCanonicalWeeklySourcesInDb();

  if (phase === "idle" && !input?.forcePhase && !input?.forceDraftDate) {
    return report;
  }

  for (const market of CORE_DAILY_MARKETS) {
    const targets = targetDatesForMarket({
      market,
      beijingDate,
      targetDateByMarket: input?.targetDateByMarket,
      forceDraftDate: input?.forceDraftDate,
    });

    for (const target of targets) {
      try {
        const weekly = await resolveWeekly(market, target);
        if (!weekly) {
          report.skipped.push(`${market}:${target}:no-weekly-source`);
          continue;
        }

        const snapshot =
          phase === "revise" || phase === "lock" ? await loadSnapshot() : emptySnapshot();

        let status: GeneratedDailyForecastRecord["status"] = "DRAFT";
        if (phase === "lock") status = "LOCKED";

        let record = generateDailyFromWeekly({
          weekly,
          forecastDate: target,
          version: 1,
          status,
          snapshot,
        });

        if (phase === "revise" && record.marketProgressStatus === "INVALIDATED") {
          record = reviseAsNewVersion(record, weekly, snapshot);
        }

        // Technical levels are best-effort. Direction/path must still publish when the
        // market-data provider is temporarily unavailable; empty level fields are hidden
        // by the UI and may later be filled by the automatic retry or admin override.
        try {
          const technical = await buildTechnicalLevelsWithRetry({
            marketCode: market,
            direction: record.direction,
            forecastDate: target,
            publishedAt: now.toISOString(),
            attempts: phase === "lock" ? 3 : 2,
          });
          record = {
            ...record,
            supportLevels: technical.supportLevels,
            resistanceLevels: technical.resistanceLevels,
            confirmationLevel: technical.confirmation,
            invalidationLevel: technical.invalidation,
            technicalEvidence: [
              "裸K波段与平台结构；EMA60；MACD零轴与动能共振",
              `行情来源 ${technical.priceDataSourceLabel}`,
              `快照 ${technical.priceSnapshotAtLabel}`,
            ].join("。"),
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          report.warnings.push({ market, date: target, error: message });
          record = {
            ...record,
            supportLevels: [],
            resistanceLevels: [],
            confirmationLevel: null,
            invalidationLevel: null,
            technicalEvidence: "技术价位数据暂不可用；方向与路径照常发布，点位栏暂不展示。",
          };
        }

        if (phase === "lock") {
          record = {
            ...record,
            status: "LOCKED",
            publishedAt: now.toISOString(),
            lockedAt: now.toISOString(),
          };
        }

        const saved = await upsertGeneratedDaily(record);
        report.records.push(saved.record);
        report.upserted.push(saved.record.id);
      } catch (err) {
        report.errors.push({
          market,
          date: target,
          error: err instanceof Error ? err.message : String(err),
        });
      }
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
