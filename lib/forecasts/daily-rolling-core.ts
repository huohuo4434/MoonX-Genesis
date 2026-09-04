// MOOX_V72051_DAILY_TRUTH_REVISION
import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";
import type { MarketSnapshot } from "@/lib/forecasts/market-progress";

type ClosedDailyBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  synthetic?: boolean;
  provenance?: string;
};

/**
 * Authority fence for one market/date. No candidate work is reachable until
 * the persisted latest-version lookup has completed successfully.
 */
export async function withAuthoritativeDailyLatest<TLatest, TResult>(input: {
  loadLatest: () => Promise<TLatest>;
  runAfterAuthority: (latest: TLatest) => Promise<TResult>;
}): Promise<TResult> {
  const latest = await input.loadLatest();
  return input.runAfterAuthority(latest);
}

export function dailyTechnicalInputPolicy(marketCode: string):
  | "READ_MARKET_TECHNICALS"
  | "ETH_NO_BTC_LEVEL_REUSE" {
  return marketCode.toUpperCase() === "ETH"
    ? "ETH_NO_BTC_LEVEL_REUSE"
    : "READ_MARKET_TECHNICALS";
}

export function decideDailyPipelineEvidenceGate(input: {
  hasLatest: boolean;
  weeklySpecialPatterns?: readonly string[];
  marketProgressAvailable?: boolean;
  xSnapshotAvailable?: boolean;
  technicalReadFailed?: boolean;
}): { action: "CONTINUE" | "SKIP_RESEARCH_ONLY" | "PRESERVE_LATEST"; reason: string | null } {
  if (input.weeklySpecialPatterns?.includes("CONTINUITY_LOW_CONFIDENCE_RESEARCH_ONLY")) {
    return { action: "SKIP_RESEARCH_ONLY", reason: "continuity-research-only" };
  }
  if (!input.hasLatest) return { action: "CONTINUE", reason: null };
  // Market-progress and X are optional enrichment inputs. A temporary miss must not
  // freeze the daily record, otherwise fresh Qimen direction and price levels can
  // never replace an older incomplete version.
  if (input.technicalReadFailed) {
    return { action: "PRESERVE_LATEST", reason: "technical-levels-unavailable" };
  }
  return { action: "CONTINUE", reason: null };
}

export function buildClosedMarketProgressSnapshot(input: {
  bars: ClosedDailyBar[];
  forecastDate: string;
  weeklyPeriodStart: string;
}): MarketSnapshot | null {
  const closed = input.bars
    .filter((bar) => bar.date < input.forecastDate)
    .filter((bar) => !bar.synthetic && bar.provenance !== "YAHOO_META_PREVIOUS_CLOSE")
    .filter((bar) => [bar.open, bar.high, bar.low, bar.close].every((value) => Number.isFinite(value) && value > 0))
    .filter((bar) => bar.high >= Math.max(bar.open, bar.close) && bar.low <= Math.min(bar.open, bar.close))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (closed.length < 2) return null;
  const last = closed.at(-1)!;
  const previous = closed.at(-2)!;
  const weekBars = closed.filter((bar) => bar.date >= input.weeklyPeriodStart).slice(-7);
  const relevant = weekBars.length ? weekBars : closed.slice(-5);
  const priorForLevels = closed.slice(-6, -1);
  const atrRows = closed.slice(-6);
  const atr = atrRows.reduce((sum, bar) => sum + Math.max(0, bar.high - bar.low), 0) / atrRows.length;
  return {
    lastPrice: last.close,
    previousClose: previous.close,
    weekOpen: relevant[0]!.open,
    weekHigh: Math.max(...relevant.map((bar) => bar.high)),
    weekLow: Math.min(...relevant.map((bar) => bar.low)),
    nearestSupport: priorForLevels.length ? Math.min(...priorForLevels.map((bar) => bar.low)) : null,
    nearestResistance: priorForLevels.length ? Math.max(...priorForLevels.map((bar) => bar.high)) : null,
    atr: Number.isFinite(atr) && atr > 0 ? atr : null,
    weekReturnPct: relevant[0]!.open > 0 ? (last.close - relevant[0]!.open) / relevant[0]!.open * 100 : null,
  };
}

export type DailyRevisionDecision = {
  shouldCreate: boolean;
  reasons: string[];
};

function compact(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function publicXStage(value: string | null | undefined): string {
  const text = compact(value);
  for (const stage of ["早期观察", "交叉确认", "热度过高", "持续观察"] as const) {
    if (text.includes(stage)) return stage;
  }
  return "";
}

/**
 * Decide whether a persisted, locked daily forecast deserves a new version.
 * Price levels and prose details are deliberately excluded so small quote moves
 * cannot create one version per cron run.
 */
export function decideDailyRevision(input: {
  latest: GeneratedDailyForecastRecord | null;
  candidate: GeneratedDailyForecastRecord;
  verifiedMarketProgress: boolean;
}): DailyRevisionDecision {
  if (!input.latest) return { shouldCreate: true, reasons: ["INITIAL_VERSION"] };

  const reasons: string[] = [];
  if (compact(input.latest.direction) !== compact(input.candidate.direction)) reasons.push("DIRECTION_CHANGED");
  if (input.latest.marketProgressStatus !== input.candidate.marketProgressStatus) reasons.push("PROGRESS_CHANGED");
  if (compact(input.latest.expectedPath) !== compact(input.candidate.expectedPath)) reasons.push("PATH_CHANGED");
  const probabilityDelta = Math.max(
    Math.abs(input.latest.upProbability - input.candidate.upProbability),
    Math.abs(input.latest.sidewaysProbability - input.candidate.sidewaysProbability),
    Math.abs(input.latest.downProbability - input.candidate.downProbability)
  );
  if (probabilityDelta >= 5) reasons.push("PROBABILITY_CHANGED");
  if (publicXStage(input.latest.newsEvidence) !== publicXStage(input.candidate.newsEvidence)) reasons.push("X_STAGE_CHANGED");

  if (compact(input.latest.liuyaoEvidence) !== compact(input.candidate.liuyaoEvidence) ||
      compact(input.latest.qimenEvidence) !== compact(input.candidate.qimenEvidence)) {
    reasons.push("RESEARCH_EVIDENCE_CHANGED");
  }

  // Execution levels are part of the published daily product. They are based on
  // closed-bar structure, so a change normally occurs only after a new session
  // becomes available. Persisting the change fixes stale/blank support, resistance
  // and invalidation without creating a version on every cron tick.
  const latestLevels = compact([
    ...(input.latest.supportLevels ?? []),
    ...(input.latest.resistanceLevels ?? []),
    input.latest.confirmationLevel ?? "",
    input.latest.invalidationLevel ?? "",
  ].join("|"));
  const candidateLevels = compact([
    ...(input.candidate.supportLevels ?? []),
    ...(input.candidate.resistanceLevels ?? []),
    input.candidate.confirmationLevel ?? "",
    input.candidate.invalidationLevel ?? "",
  ].join("|"));
  if (latestLevels !== candidateLevels) reasons.push("TECHNICAL_LEVELS_CHANGED");
  const reviewRisks = (record: GeneratedDailyForecastRecord) => record.risks.filter((risk) => /^(技术复核|周期提示)：/.test(risk)).join("|");
  if (reviewRisks(input.latest) !== reviewRisks(input.candidate)) reasons.push("TECHNICAL_REVIEW_CHANGED");

  return { shouldCreate: reasons.length > 0, reasons };
}

export function assignNextDailyVersion(
  candidate: GeneratedDailyForecastRecord,
  latest: GeneratedDailyForecastRecord | null
): GeneratedDailyForecastRecord {
  const version = latest ? latest.version + 1 : 1;
  return {
    ...candidate,
    id: `GDF-${candidate.marketCode}-${candidate.forecastDate.replace(/-/g, "")}-V${version}`,
    version,
    previousVersionId: latest?.id ?? null,
  };
}

export async function persistDailyRevision(input: {
  latest: GeneratedDailyForecastRecord | null;
  candidate: GeneratedDailyForecastRecord;
  verifiedMarketProgress: boolean;
  persist: (record: GeneratedDailyForecastRecord) => Promise<{ created: boolean; record: GeneratedDailyForecastRecord }>;
}): Promise<{ created: boolean; record: GeneratedDailyForecastRecord; decision: DailyRevisionDecision }> {
  const candidate = assignNextDailyVersion(input.candidate, input.latest);
  const decision = decideDailyRevision({
    latest: input.latest,
    candidate,
    verifiedMarketProgress: input.verifiedMarketProgress,
  });
  if (input.latest && !decision.shouldCreate) return { created: false, record: input.latest, decision };
  const saved = await input.persist(candidate);
  return { ...saved, decision };
}
/** Once its target day starts, the publication snapshot must not be removed or recomputed. */
export function preservePublishedTechnicalReview(record: GeneratedDailyForecastRecord | null, today: string): boolean {
  return Boolean(record && record.forecastDate <= today
    && (record.status === "LOCKED" || record.status === "PUBLISHED")
    && record.risks.some((risk) => risk.startsWith("技术复核：")));
}
