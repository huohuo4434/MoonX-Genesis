import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import { prepareNextFocusWeek } from "@/lib/data/conviction/focus-dossier-core";
import type { FocusWeekPreparation } from "@/types/focus-dossier";

export type FocusWeekEvidence = {
  assetId: string;
  forecasts: readonly ConvictionPeriodForecast[];
};

export type FocusWeekPreparationRun =
  | { kind: "UNAUTHORIZED"; ok: false }
  | { kind: "NOT_SATURDAY"; ok: true; skipped: true; reason: "SATURDAY_ONLY"; asOfDate: string }
  | {
      kind: "PREPARED";
      ok: true;
      skipped: false;
      asOfDate: string;
      targetStart: string | null;
      targetEnd: string | null;
      ready: number;
      incomplete: number;
      awaitingEvidence: number;
      items: FocusWeekPreparation[];
      immutable: true;
    };

export async function runFocusWeekPreparation(input: {
  authorized: boolean;
  asOfDate: string;
  nowMs: number;
  readEvidence: () => Promise<readonly FocusWeekEvidence[]>;
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
  return {
    kind: "PREPARED",
    ok: true,
    skipped: false,
    asOfDate: input.asOfDate,
    targetStart: items[0]?.targetStart ?? null,
    targetEnd: items[0]?.targetEnd ?? null,
    ready: items.filter((item) => item.status === "READY").length,
    incomplete: items.filter((item) => item.status === "EVIDENCE_INCOMPLETE").length,
    awaitingEvidence: items.filter((item) => item.status === "AWAITING_FORMAL_EVIDENCE").length,
    items,
    immutable: true,
  };
}
