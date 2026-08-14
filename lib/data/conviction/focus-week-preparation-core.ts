import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import { prepareNextFocusWeek } from "@/lib/data/conviction/focus-dossier-core";
import { buildFocusDailyPublicationBatch, selectFormalNextFocusWeek, type FocusDailyAuxiliaryEvidence } from "@/lib/data/conviction/focus-daily-generation-core";
import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";
import type { FocusWeekPreparation } from "@/types/focus-dossier";

export type FocusWeekEvidence = {
  assetId: string;
  symbol?: string;
  assetType?: string;
  exchange?: string | null;
  forecasts: readonly ConvictionPeriodForecast[];
};

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
}): Promise<FocusWeekPreparationRun> {
  if (!input.authorized) return { kind: "UNAUTHORIZED", ok: false };

  const asOf = Date.parse(`${input.asOfDate}T00:00:00Z`);
  if (!Number.isFinite(asOf) || new Date(asOf).toISOString().slice(0, 10) !== input.asOfDate) {
    throw new Error("Invalid preparation date");
  }
  if (new Date(asOf).getUTCDay() !== 6) {
    return { kind: "NOT_SATURDAY", ok: true, skipped: true, reason: "SATURDAY_ONLY", asOfDate: input.asOfDate };
  }

  // This is deliberately the only dependency call. The orchestration is read-only;
  // a rejected reader propagates and can never be reported as a successful preparation.
  const evidence = await input.readEvidence();
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
      const weekly = selectFormalNextFocusWeek({ forecasts: asset.forecasts, asOfDate: input.asOfDate, nowMs: input.nowMs });
      if (!weekly) continue;
      const dates = Array.from({ length: 7 }, (_, index) => {
        const start = Date.parse(`${weekly.periodStart}T00:00:00Z`);
        return new Date(start + index * 86_400_000).toISOString().slice(0, 10);
      });
      try {
        // All dependencies complete before the first write. A dependency failure
        // therefore leaves this asset with zero persisted rows.
        const latest = await input.loadLatest!(asset, dates);
        const auxiliary = await input.loadAuxiliary!(asset);
        const batch = buildFocusDailyPublicationBatch({ assetId: asset.assetId, weekly, asOfDate: input.asOfDate, nowMs: input.nowMs, auxiliary, latest });
        if (!batch.append.length) {
          unchangedAssets += 1;
          continue;
        }
        const saved = await input.persistBatch!(batch.append);
        if (saved.records.length !== batch.append.length) throw new Error("focus-publication-batch-incomplete");
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
    preservesHistoricalVersions: true,
    writeMode: "APPEND_ONLY",
  };
}
