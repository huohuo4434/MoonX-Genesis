/**
 * Beijing-time daily forecast pipeline from weekly Liu Yao sources.
 * Continuous autonomous forecast pipeline. Idempotent per market/date/version.
 */
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import { getCurrentSessionDate, getNextForecastDate } from "@/lib/calendar/next-trading-day";
import { buildLockedLevelsForAsset, validatePublishedPriceLevels } from "@/lib/market-data/price-levels";
import { generateDailyFromWeekly, marketMeta } from "@/lib/forecasts/weekly-to-daily";
import {
  buildClosedMarketProgressSnapshot,
  dailyTechnicalInputPolicy,
  decideDailyPipelineEvidenceGate,
  persistDailyRevision,
  withAuthoritativeDailyLatest,
} from "@/lib/forecasts/daily-rolling-core";
import type { MarketSnapshot } from "@/lib/forecasts/market-progress";
import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";
import { listAllWeeklyAnalyses } from "@/lib/data/weekly-analysis";
import { listEthPeriodForecasts } from "@/lib/data/conviction/eth-forecasts";
import { listBtcPeriodForecasts20260801 } from "@/lib/data/conviction/btc-forecasts-20260801";
import { getCryptoPointGuidanceForDate } from "@/lib/forecasts/crypto-point-guidance";
import type { WeeklyForecastSourceRecord } from "@/lib/weekly-source/types";
import type { WeeklyAnalysisRecord } from "@/types/weekly-analysis";
import { findCanonicalWeeklySource } from "@/lib/weekly-source/canonical-six";
import { validateGeneratedDailyPublication } from "@/lib/content/publication-quality-gate";
import {
  applyXIntelligenceToGeneratedDaily,
  buildXIntelligenceAutoWeight,
  findXIntelligenceSummaryForMarket,
} from "@/lib/trading-signals/x-intelligence-overlay";

import { applyQimenFirstToGeneratedDaily } from "./qimen-first-policy"; // MOOX_QIMEN_FIRST_V72005_IMPORT

export const CORE_DAILY_MARKETS = ["BTC", "ETH", "SPX", "NDX", "SHCOMP", "HSTECH", "GLD", "SILVER", "WTI"] as const;
export const AUTOMATED_DAILY_MARKETS = [...CORE_DAILY_MARKETS] as const;

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
        ? ["GLD", "Gold", "GOLD", "XAU", "GC=F"]
        : marketCode === "SILVER"
          ? ["SILVER", "SI", "SI=F", "SLV"]
          : [marketCode];
  const candidates = listAllWeeklyAnalyses().filter((w: WeeklyAnalysisRecord) => {
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
    specialPatterns: continuity ? ["CONTINUITY_LOW_CONFIDENCE_RESEARCH_ONLY"] : [],
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
    status: continuity ? "PUBLISHED" : "LOCKED",
    publishedAt: hit.publishedAt,
    lockedAt: continuity ? null : hit.publishedAt,
    createdAt: hit.publishedAt,
    updatedAt: hit.updatedAt,
  };
}

function btcResearchAsWeeklySource(
  forecastDate: string
): WeeklyForecastSourceRecord | null {
  const hit = listBtcPeriodForecasts20260801()
    .filter(
      (item) =>
        item.forecastType.startsWith("WEEK") &&
        item.periodStart <= forecastDate &&
        item.periodEnd >= forecastDate
    )
    .sort((a, b) => b.version - a.version)[0];
  if (!hit) return null;

  const pointGate = getCryptoPointGuidanceForDate("BTC", forecastDate);
  const weeklyDirection =
    pointGate && hit.forecastType === "WEEK" ? "先跌后涨" : hit.direction;
  const pointText = pointGate
    ? `关键点位卦：${pointGate.threshold.toLocaleString("en-US")}以4小时收盘判定；${pointGate.summary}`
    : "";

  return {
    id: pointGate ? `${hit.id}-POINT-${pointGate.threshold}` : hit.id,
    marketCode: "BTC",
    periodStart: hit.periodStart,
    periodEnd: hit.periodEnd,
    primaryHexagram: hit.ichingEvidence.primaryHexagram || null,
    changedHexagram: hit.ichingEvidence.changingHexagram ?? null,
    movingLines: [],
    specialPatterns: pointGate ? [pointGate.specialPattern] : [],
    weeklyDirection,
    weeklyPath: [hit.expectedPath, pointText].filter(Boolean).join("；"),
    interpretation: [hit.summary, pointGate?.movingSummary].filter(Boolean).join("；"),
    riskSummary: [hit.risks.join("；") || hit.riskLevel, pointGate?.invalidationRule]
      .filter(Boolean)
      .join("；"),
    sourceType: "LIUYAO_WEEKLY",
    version: hit.version,
    status: "LOCKED",
    publishedAt: hit.publishedAt,
    lockedAt: hit.lockedAt,
    createdAt: hit.publishedAt,
    updatedAt: hit.lockedAt,
  };
}

function ethResearchAsWeeklySource(
  forecastDate: string
): WeeklyForecastSourceRecord | null {
  const hit = listEthPeriodForecasts()
    .filter(
      (item) =>
        item.forecastType.startsWith("WEEK") &&
        item.periodStart <= forecastDate &&
        item.periodEnd >= forecastDate
    )
    .sort((a, b) => b.version - a.version)[0];
  if (!hit) return null;

  const pointGate = getCryptoPointGuidanceForDate("ETH", forecastDate);
  const pointText = pointGate
    ? `关键点位卦：${pointGate.threshold.toLocaleString("en-US")}以4小时收盘判定；${pointGate.summary}`
    : "";

  return {
    id: pointGate ? `${hit.id}-POINT-${pointGate.threshold}` : hit.id,
    marketCode: "ETH",
    periodStart: hit.periodStart,
    periodEnd: hit.periodEnd,
    primaryHexagram: hit.ichingEvidence.primaryHexagram || null,
    changedHexagram: hit.ichingEvidence.changingHexagram ?? null,
    movingLines: [],
    specialPatterns: pointGate ? [pointGate.specialPattern] : [],
    weeklyDirection: hit.direction,
    weeklyPath: [hit.expectedPath, pointText].filter(Boolean).join("；"),
    interpretation: [hit.summary, pointGate?.movingSummary].filter(Boolean).join("；"),
    riskSummary: [hit.risks.join("；") || hit.riskLevel, pointGate?.invalidationRule]
      .filter(Boolean)
      .join("；"),
    sourceType: "LIUYAO_WEEKLY",
    version: hit.version,
    status: "LOCKED",
    publishedAt: hit.publishedAt,
    lockedAt: hit.lockedAt,
    createdAt: hit.publishedAt,
    updatedAt: hit.lockedAt,
  };
}

async function resolveWeekly(
  marketCode: string,
  forecastDate: string
): Promise<WeeklyForecastSourceRecord | null> {
  const { getWeeklySourceForMarketDate } = await import("@/lib/weekly-source/store");
  const normalized = marketCode.toUpperCase();
  // BTC/ETH use the current locked research files first. This avoids stale database
  // rows and keeps the auto trader aligned with the user's latest weekly hexagrams.
  if (normalized === "BTC") {
    const btc = btcResearchAsWeeklySource(forecastDate);
    if (btc) return btc;
  }
  if (normalized === "ETH") {
    const eth = ethResearchAsWeeklySource(forecastDate);
    if (eth) return eth;
  }
  const fromDb = await getWeeklySourceForMarketDate(normalized, forecastDate);
  if (fromDb) return fromDb;
  return analysisAsWeeklySource(normalized, forecastDate);
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

/** Only bars strictly before the forecast date are treated as closed evidence. */
async function loadSnapshot(
  marketCode: string,
  forecastDate: string,
  weekly: WeeklyForecastSourceRecord
): Promise<MarketSnapshot | null> {
  // Keep this server-only adapter out of the module's pure export import graph.
  const { fetchRecentDailyBarsForForecast } = await import("@/lib/market-data/daily-prices");
  const meta = marketMeta(marketCode);
  const bars = await fetchRecentDailyBarsForForecast({
    quoteSymbol: meta.quoteSymbol,
    market: verificationMarket(meta.legacyMarket),
    asOfDate: forecastDate,
  });
  return buildClosedMarketProgressSnapshot({
    bars,
    forecastDate,
    weeklyPeriodStart: weekly.periodStart,
  });
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
  markets?: readonly string[];
  technicalAttempts?: number;
}): Promise<PipelineReport> {
  const {
    ensureCanonicalWeeklySourcesInDb,
    getLatestGeneratedDailyForMarketDate,
    upsertGeneratedDaily,
  } = await import("@/lib/weekly-source/store");
  const { getXIntelligenceSnapshot } = await import("@/lib/trading-signals/x-intelligence-summary");
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
  const xIntelligence = await getXIntelligenceSnapshot().catch(() => null);

  if (phase === "idle" && !input?.forcePhase && !input?.forceDraftDate) {
    return report;
  }

  const markets = input?.markets?.length
    ? [...new Set(input.markets.map((item) => item.toUpperCase()))]
    : [...AUTOMATED_DAILY_MARKETS];

  for (const market of markets) {
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
        const weeklyGate = decideDailyPipelineEvidenceGate({
          hasLatest: false,
          weeklySpecialPatterns: weekly.specialPatterns,
        });
        if (weeklyGate.action === "SKIP_RESEARCH_ONLY") {
          report.skipped.push(`${market}:${target}:${weeklyGate.reason}`);
          continue;
        }

        await withAuthoritativeDailyLatest({
          loadLatest: () => getLatestGeneratedDailyForMarketDate(market, target),
          runAfterAuthority: async (latest) => {
        let snapshot: MarketSnapshot | null = null;
        try {
          snapshot = phase === "revise" || phase === "lock"
            ? await loadSnapshot(market, target, weekly)
            : null;
        } catch (error) {
          report.warnings.push({
            market,
            date: target,
            error: `market-progress:${error instanceof Error ? error.message : String(error)}`,
          });
        }
        const evidenceGate = decideDailyPipelineEvidenceGate({
          hasLatest: Boolean(latest),
          marketProgressAvailable: Boolean(snapshot),
          xSnapshotAvailable: Boolean(xIntelligence),
        });
        if (latest && evidenceGate.action === "PRESERVE_LATEST") {
          report.records.push(latest);
          report.skipped.push(`${market}:${target}:${evidenceGate.reason}`);
          return;
        }

        let status: GeneratedDailyForecastRecord["status"] = "DRAFT";
        if (phase === "lock") status = "LOCKED";

        let record = generateDailyFromWeekly({
          weekly,
          forecastDate: target,
          version: latest ? latest.version + 1 : 1,
          status,
          snapshot: snapshot ?? emptySnapshot(),
          previousVersionId: latest?.id ?? null,
        });
        const xSummary = findXIntelligenceSummaryForMarket(
          xIntelligence?.aggregate.summaries ?? [],
          market
        );
        const xOverlay = buildXIntelligenceAutoWeight(xSummary);
        record = applyXIntelligenceToGeneratedDaily(record, xOverlay);
        record = applyQimenFirstToGeneratedDaily(record, {
          liuyaoDirection: weekly.weeklyDirection,
          previousQimenEvidence: latest?.qimenEvidence ?? null,
        }); // MOOX_QIMEN_FIRST_V72005_PRE_TECH
        // Initial publication may state that technical levels are unavailable. Once a
        // locked version exists, a provider failure preserves that complete version;
        // new path text must never be combined with stale levels from another version.
        // The legacy crypto level builder is BTC-specific, so ETH must not reuse BTC prices.
        if (dailyTechnicalInputPolicy(market) === "ETH_NO_BTC_LEVEL_REUSE") {
          record = {
            ...record,
            resistanceLevels: [],
            technicalEvidence:
              "ETH日预测由本周研究和点位卦自动推演；技术价位等待Bitget ETH真实K线确认，不复用BTC价位，不提供虚构支撑压力。",
          };
        } else {
          try {
            const technical = await buildTechnicalLevelsWithRetry({
              marketCode: market,
              direction: record.direction,
              forecastDate: target,
              publishedAt: now.toISOString(),
              attempts: Math.max(
                1,
                Math.min(3, input?.technicalAttempts ?? (phase === "lock" ? 3 : 2))
              ),
            });
            record = {
              ...record,
              supportLevels: [...new Set([...record.supportLevels, ...technical.supportLevels])],
              resistanceLevels: technical.resistanceLevels,
              confirmationLevel: record.confirmationLevel ?? technical.confirmation,
              invalidationLevel: record.invalidationLevel ?? technical.invalidation,
              technicalEvidence: [
                "裸K波段与平台结构；EMA60；MACD零轴与动能共振",
                `行情来源 ${technical.priceDataSourceLabel}`,
                `快照 ${technical.priceSnapshotAtLabel}`,
              ].join("。"),
            };
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            report.warnings.push({ market, date: target, error: message });
            const technicalGate = decideDailyPipelineEvidenceGate({
              hasLatest: Boolean(latest),
              technicalReadFailed: true,
            });
            if (latest && technicalGate.action === "PRESERVE_LATEST") {
              report.records.push(latest);
              report.skipped.push(`${market}:${target}:${technicalGate.reason}`);
              return;
            }
            record = {
              ...record,
              supportLevels: [],
              resistanceLevels: [],
              confirmationLevel: null,
              invalidationLevel: null,
              technicalEvidence: "技术价位数据暂不可用；方向与路径照常发布，点位栏暂不展示。",
            };
          }
        }

        if (phase === "lock") {
          const quality = validateGeneratedDailyPublication(record);
          if (!quality.ok) {
            report.errors.push({
              market,
              date: target,
              error: `publication-quality-gate:${quality.issues.map((issue) => `${issue.code}:${issue.message}`).join(" | ")}`,
            });
            report.skipped.push(`${market}:${target}:publication-quality-gate`);
            return;
          }
          record = {
            ...record,
            status: "LOCKED",
            publishedAt: now.toISOString(),
            lockedAt: now.toISOString(),
          };
        }

        const saved = await persistDailyRevision({
          latest,
          candidate: record,
          verifiedMarketProgress: Boolean(snapshot),
          persist: upsertGeneratedDaily,
        });
        if (latest && !saved.decision.shouldCreate) {
          report.records.push(saved.record);
          report.skipped.push(`${market}:${target}:unchanged`);
          return;
        }
        report.records.push(saved.record);
        if (saved.created) report.upserted.push(saved.record.id);
          },
        });
      } catch (err) {
        report.errors.push({
          market,
          date: target,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // Publication and verification are one lifecycle: as soon as a formal LOCKED
  // forecast is committed, bridge it into the immutable verification store.
  // This removes the several-hour gap that previously existed between the
  // Beijing 20:00 lock and the next daily verification cron. A transient sync
  // failure is a warning only; the retry cron and normal verification scans will
  // retry without blocking publication.
  if (phase === "lock" && report.upserted.length > 0) {
    try {
      const { syncGeneratedDailyForecastsToVerificationStore } = await import("@/lib/verification/sync-generated-dailies");
      const sync = await syncGeneratedDailyForecastsToVerificationStore({ now });
      if (sync.errors.length > 0) {
        report.warnings.push({
          market: "VERIFICATION",
          date: beijingDate,
          error: `verification-sync:${sync.errors.join(" | ")}`,
        });
      }
    } catch (error) {
      report.warnings.push({
        market: "VERIFICATION",
        date: beijingDate,
        error: `verification-sync:${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return report;
}

/** Pure helper for one market/date — no database or live-price I/O. */
export function generateCoreMarketFromWeeklyPure(
  marketCode: string,
  forecastDate: string,
  status: GeneratedDailyForecastRecord["status"] = "LOCKED"
): GeneratedDailyForecastRecord | null {
  const market = marketCode.toUpperCase();
  const weekly =
    (market === "BTC" ? btcResearchAsWeeklySource(forecastDate) : null) ??
    (market === "ETH" ? ethResearchAsWeeklySource(forecastDate) : null) ??
    findCanonicalWeeklySource(market, forecastDate) ??
    analysisAsWeeklySource(market, forecastDate);
  if (!weekly) return null;
  return generateDailyFromWeekly({
    weekly,
    forecastDate,
    version: 1,
    status,
    snapshot: emptySnapshot(),
  });
}

/** Pure batch helper. One broken market must never blank the other eight. */
export function generateCoreMarketsFromWeeklyPure(
  forecastDate: string,
  status: GeneratedDailyForecastRecord["status"] = "LOCKED"
): GeneratedDailyForecastRecord[] {
  const out: GeneratedDailyForecastRecord[] = [];
  for (const market of CORE_DAILY_MARKETS) {
    try {
      const row = generateCoreMarketFromWeeklyPure(market, forecastDate, status);
      if (row) out.push(row);
    } catch (error) {
      console.warn(
        `[daily-pipeline] pure generation skipped ${market}:${forecastDate}`,
        error
      );
    }
  }
  return out;
}
