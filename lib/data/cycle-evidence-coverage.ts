export type VerifiedCycleEvidence = {
  id: string;
  assetId: string;
  horizon: "WEEK" | "MONTH";
  periodStart: string;
  periodEnd: string;
  /** Calendar-month buckets covered by a complete solar-term/month chart. */
  monthIds?: string[];
  primaryHexagram: string;
  changingHexagram: string | null;
  capturedAt: string;
  verifiedAt: string;
};

/**
 * Complete source charts already supplied and visually verified, but not
 * necessarily converted into the member-facing weekly publication format yet.
 *
 * This registry is evidence-only. It must never create a forecast direction,
 * publish a report, or trigger trading. The admin gap panel uses it solely to
 * avoid asking the editor to supply a chart that is already on file.
 */
export const VERIFIED_CYCLE_EVIDENCE: readonly VerifiedCycleEvidence[] = [
  {
    id: "USER-BTC-20260831-0906-LIUYAO",
    assetId: "bitcoin",
    horizon: "WEEK",
    periodStart: "2026-08-31",
    periodEnd: "2026-09-06",
    primaryHexagram: "水火既济",
    changingHexagram: "水雷屯",
    capturedAt: "2026-08-20T06:20:00+08:00",
    verifiedAt: "2026-08-25T10:20:00+08:00",
  },
  {
    id: "USER-ETH-20260831-0906-LIUYAO",
    assetId: "eth",
    horizon: "WEEK",
    periodStart: "2026-08-31",
    periodEnd: "2026-09-06",
    primaryHexagram: "水山蹇",
    changingHexagram: "风山渐（归魂）",
    capturedAt: "2026-08-23T16:57:00+08:00",
    verifiedAt: "2026-08-25T10:20:00+08:00",
  },
  {
    id: "USER-ETH-20260907-1007-LIUYAO",
    assetId: "eth",
    horizon: "MONTH",
    periodStart: "2026-09-07",
    periodEnd: "2026-10-07",
    monthIds: ["2026-09"],
    primaryHexagram: "雷风恒",
    changingHexagram: "雷山小过（游魂）",
    capturedAt: "2026-08-23T17:05:00+08:00",
    verifiedAt: "2026-08-25T10:20:00+08:00",
  },
  {
    id: "USER-NDX-20260831-0906-LIUYAO",
    assetId: "nasdaq-100",
    horizon: "WEEK",
    periodStart: "2026-08-31",
    periodEnd: "2026-09-06",
    primaryHexagram: "山天大畜",
    changingHexagram: "地风升",
    capturedAt: "2026-08-24T20:48:00+08:00",
    verifiedAt: "2026-08-25T10:20:00+08:00",
  },
] as const;

export function hasVerifiedWeeklyCycleEvidence(
  assetId: string,
  weekStart: string,
  weekEnd: string,
): boolean {
  return VERIFIED_CYCLE_EVIDENCE.some(
    (item) =>
      item.assetId === assetId &&
      item.horizon === "WEEK" &&
      item.periodStart === weekStart &&
      item.periodEnd === weekEnd,
  );
}

export function hasVerifiedMonthlyCycleEvidence(assetId: string, monthId: string): boolean {
  return VERIFIED_CYCLE_EVIDENCE.some(
    (item) =>
      item.assetId === assetId &&
      item.horizon === "MONTH" &&
      item.monthIds?.includes(monthId),
  );
}
