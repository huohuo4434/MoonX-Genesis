import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import { prepareNextFocusWeek } from "@/lib/data/conviction/focus-dossier-core";
import { buildFocusDailyPublicationBatch, focusDailyChanCapability, focusDailyQuoteCapability, selectFormalCurrentFocusAuthority, selectFormalNextFocusWeek, type FocusDailyAuxiliaryEvidence } from "@/lib/data/conviction/focus-daily-generation-core";
import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";
import type { FocusWeekPreparation } from "@/types/focus-dossier";

export type FocusWeekEvidence = {
  assetId: string;
  symbol?: string;
  assetType?: string;
  exchange?: string | null;
  forecasts: readonly ConvictionPeriodForecast[];
};
export type FocusDailyCoverageRow = {
  assetId: string;
  formalPeriodInventory: Array<{ id: string; type: string; start: string; end: string; version: number }>;
  currentWeekId: string | null;
  nextWeekId: string | null;
  teacherDailyCount: number;
  currentTeacherDailyCount: number;
  nextTeacherDailyCount: number;
  generatedDailyCount: number;
  rollingRevisionCount: number;
  latestGeneratedVersion: number;
  currentKeyDayCount: number;
  nextKeyDayCount: number;
  backgroundHorizons: string[];
  quoteMapping: "AVAILABLE" | "UNAVAILABLE";
  quoteProvider: "CRYPTO" | "HK" | "CN" | "US" | null;
  quoteSymbol: string | null;
  chanMapping: "AVAILABLE" | "UNAVAILABLE";
  chanTimeframes: Array<"1D">;
  chanStage: "RUNTIME_1D_EVIDENCE_REQUIRED" | "UNAVAILABLE";
  rollingCapability: "CLOSED_BARS_AND_X" | "WEEKLY_AND_OPTIONAL_X_ONLY";
  confirmationAvailable: boolean;
  invalidationAvailable: boolean;
  gapReasons: string[];
};

export function buildFocusDailyCoverageReport(evidence: readonly FocusWeekEvidence[], asOfDate: string, nowMs: number): FocusDailyCoverageRow[] {
  return evidence.map((asset) => {
    const current = selectFormalCurrentFocusAuthority({ forecasts: asset.forecasts, asOfDate, nowMs });
    const next = selectFormalNextFocusWeek({ forecasts: asset.forecasts, asOfDate, nowMs });
    const authority = current ?? next;
    const quote = focusDailyQuoteCapability({ symbol: asset.symbol ?? asset.assetId, assetType: asset.assetType, exchange: asset.exchange });
    const chan = focusDailyChanCapability(asset.symbol ?? asset.assetId);
    const gaps = [!current && "CURRENT_AUTHORITY_MISSING", !next && "NEXT_WEEK_MISSING", current && !current.dailyPath?.length && "CURRENT_DAILY_SOURCE_DERIVED", next && !next.dailyPath?.length && "NEXT_TEACHER_DAILY_MISSING", !quote.available && "QUOTE_MAPPING_UNAVAILABLE", !authority?.confirmationLevel && "CONFIRMATION_MISSING", !authority?.invalidationLevel && "INVALIDATION_MISSING"].filter((value): value is string => Boolean(value));
    const inventory = asset.forecasts.filter((row) => row.status === "published" && Date.parse(row.publishedAt) <= nowMs && Date.parse(row.lockedAt) <= nowMs).map((row) => ({ id: row.id, type: row.forecastType, start: row.periodStart, end: row.periodEnd, version: row.version }));
    return { assetId: asset.assetId, formalPeriodInventory: inventory, currentWeekId: current?.id ?? null, nextWeekId: next?.id ?? null, teacherDailyCount: authority?.dailyPath?.length ?? 0, currentTeacherDailyCount: current?.dailyPath?.length ?? 0, nextTeacherDailyCount: next?.dailyPath?.length ?? 0, generatedDailyCount: 0, rollingRevisionCount: 0, latestGeneratedVersion: 0, currentKeyDayCount: current?.keyDates?.filter((item) => Boolean(item.date)).length ?? 0, nextKeyDayCount: next?.keyDates?.filter((item) => Boolean(item.date)).length ?? 0, backgroundHorizons: [...new Set(inventory.filter((row) => !row.type.startsWith("WEEK")).map((row) => row.type))], quoteMapping: quote.available ? "AVAILABLE" as const : "UNAVAILABLE" as const, quoteProvider: quote.market, quoteSymbol: quote.quoteSymbol, chanMapping: chan.catalogSupported ? "AVAILABLE" as const : "UNAVAILABLE" as const, chanTimeframes: chan.analyzedTimeframes, chanStage: chan.catalogSupported ? "RUNTIME_1D_EVIDENCE_REQUIRED" as const : "UNAVAILABLE" as const, rollingCapability: quote.available ? "CLOSED_BARS_AND_X" as const : "WEEKLY_AND_OPTIONAL_X_ONLY" as const, confirmationAvailable: Boolean(authority?.confirmationLevel), invalidationAvailable: Boolean(authority?.invalidationLevel), gapReasons: gaps };
  }).sort((a, b) => a.assetId.localeCompare(b.assetId));
}

export type FocusWeekPreparationRun =
  | { kind: "UNAUTHORIZED"; ok: false }
  | { kind: "NOT_SATURDAY"; ok: true; skipped: true; reason: "SATURDAY_ONLY"; asOfDate: string }
  | {
      kind: "PREPARED";
      ok: boolean;
      skipped: false;
      asOfDate: string;
      targetStart: string | null;
      targetEnd: string | null;
      ready: number;
      incomplete: number;
      awaitingEvidence: number;
      publishedRows: number;
      unchangedAssets: number;
      failedAssets: number;
      errors: Array<{ assetId: string; error: string }>;
      items: FocusWeekPreparation[];
      coverage: FocusDailyCoverageRow[];
      preservesHistoricalVersions: true;
      writeMode: "APPEND_ONLY";
    };

export async function runFocusWeekPreparation(input: {
  authorized: boolean;
  asOfDate: string;
  nowMs: number;
  readEvidence: () => Promise<readonly FocusWeekEvidence[]>;
  loadLatest?: (asset: FocusWeekEvidence, dates: readonly string[]) => Promise<readonly GeneratedDailyForecastRecord[]>;
  loadAuxiliary?: (asset: FocusWeekEvidence) => Promise<FocusDailyAuxiliaryEvidence>;
  persistBatch?: (records: readonly GeneratedDailyForecastRecord[]) => Promise<{ created: number; records: GeneratedDailyForecastRecord[] }>;
  scheduleMode?: "SATURDAY_ONLY" | "DAILY_ROLLING";
}): Promise<FocusWeekPreparationRun> {
  if (!input.authorized) return { kind: "UNAUTHORIZED", ok: false };

  const asOf = Date.parse(`${input.asOfDate}T00:00:00Z`);
  if (!Number.isFinite(asOf) || new Date(asOf).toISOString().slice(0, 10) !== input.asOfDate) {
    throw new Error("Invalid preparation date");
  }
  const isSaturday = new Date(asOf).getUTCDay() === 6;
  if (!isSaturday && input.scheduleMode !== "DAILY_ROLLING") {
    return { kind: "NOT_SATURDAY", ok: true, skipped: true, reason: "SATURDAY_ONLY", asOfDate: input.asOfDate };
  }

  // This is deliberately the only dependency call. The orchestration is read-only;
  // a rejected reader propagates and can never be reported as a successful preparation.
  const evidence = await input.readEvidence();
  const coverage = buildFocusDailyCoverageReport(evidence, input.asOfDate, input.nowMs);
  const items = evidence.map(({ assetId, forecasts }) =>
    prepareNextFocusWeek({ assetId, forecasts, asOfDate: input.asOfDate, nowMs: input.nowMs })
  );
  const publicationEnabled = Boolean(input.loadLatest && input.loadAuxiliary && input.persistBatch);
  if ([input.loadLatest, input.loadAuxiliary, input.persistBatch].some(Boolean) && !publicationEnabled) {
    throw new Error("focus-publication-dependencies-incomplete");
  }
  let publishedRows = 0;
  let unchangedAssets = 0;
  const errors: Array<{ assetId: string; error: string }> = [];
  if (publicationEnabled) {
    for (const asset of evidence) {
      const targets = [
        { weekly: selectFormalCurrentFocusAuthority({ forecasts: asset.forecasts, asOfDate: input.asOfDate, nowMs: input.nowMs }), mode: "CURRENT" as const },
        ...(isSaturday ? [{ weekly: selectFormalNextFocusWeek({ forecasts: asset.forecasts, asOfDate: input.asOfDate, nowMs: input.nowMs }), mode: "NEXT" as const }] : []),
      ].filter((target) => target.weekly != null);
      if (!targets.length) continue;
      try {
        const targetDates = targets.flatMap(({ weekly, mode }) => {
          const start = Date.parse(`${mode === "CURRENT" ? input.asOfDate : weekly!.periodStart}T00:00:00Z`);
          const authorityEnd = Date.parse(`${weekly!.periodEnd}T00:00:00Z`);
          const end = mode === "CURRENT" ? Math.min(authorityEnd, start + 6 * 86_400_000) : authorityEnd;
          return Array.from({ length: Math.floor((end - start) / 86_400_000) + 1 }, (_, index) => new Date(start + index * 86_400_000).toISOString().slice(0, 10));
        });
        // All read dependencies for this asset finish before its first write.
        const latest = await input.loadLatest!(asset, [...new Set(targetDates)]);
        const coverageRow = coverage.find((row) => row.assetId === asset.assetId);
        if (coverageRow) {
          coverageRow.generatedDailyCount = latest.length;
          coverageRow.rollingRevisionCount = latest.filter((row) => row.version > 1).length;
          coverageRow.latestGeneratedVersion = Math.max(0, ...latest.map((row) => row.version));
        }
        const auxiliary = await input.loadAuxiliary!(asset);
        const append = targets.flatMap(({ weekly, mode }) => buildFocusDailyPublicationBatch({ assetId: asset.assetId, weekly: weekly!, asOfDate: input.asOfDate, nowMs: input.nowMs, auxiliary, latest, mode }).append);
        if (!append.length) {
          unchangedAssets += 1;
          continue;
        }
        const saved = await input.persistBatch!(append);
        if (saved.records.length !== append.length) throw new Error("focus-publication-batch-incomplete");
        publishedRows += saved.created;
      } catch (error) {
        errors.push({ assetId: asset.assetId, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }
  return {
    kind: "PREPARED",
    ok: errors.length === 0,
    skipped: false,
    asOfDate: input.asOfDate,
    targetStart: items[0]?.targetStart ?? null,
    targetEnd: items[0]?.targetEnd ?? null,
    ready: items.filter((item) => item.status === "READY").length,
    incomplete: items.filter((item) => item.status === "EVIDENCE_INCOMPLETE").length,
    awaitingEvidence: items.filter((item) => item.status === "AWAITING_FORMAL_EVIDENCE").length,
    publishedRows,
    unchangedAssets,
    failedAssets: errors.length,
    errors,
    items,
    coverage,
    preservesHistoricalVersions: true,
    writeMode: "APPEND_ONLY",
  };
}
