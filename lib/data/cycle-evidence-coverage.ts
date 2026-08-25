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
  {
    id: "USER-SPX-20260831-0906-LIUYAO",
    assetId: "sp500",
    horizon: "WEEK",
    periodStart: "2026-08-31",
    periodEnd: "2026-09-06",
    primaryHexagram: "天火同人（归魂）",
    changingHexagram: "泽火革",
    capturedAt: "2026-08-25T06:38:00+08:00",
    verifiedAt: "2026-08-25T20:15:00+08:00",
  },
  {
    id: "USER-SHCOMP-20260831-0906-LIUYAO",
    assetId: "shanghai-composite",
    horizon: "WEEK",
    periodStart: "2026-08-31",
    periodEnd: "2026-09-06",
    primaryHexagram: "泽水困（六合）",
    changingHexagram: null,
    capturedAt: "2026-08-25T19:36:00+08:00",
    verifiedAt: "2026-08-25T20:15:00+08:00",
  },
  {
    id: "USER-HSTECH-20260831-0906-LIUYAO",
    assetId: "hang-seng",
    horizon: "WEEK",
    periodStart: "2026-08-31",
    periodEnd: "2026-09-06",
    primaryHexagram: "天山遁",
    changingHexagram: "雷风恒",
    capturedAt: "2026-08-25T19:38:00+08:00",
    verifiedAt: "2026-08-25T20:15:00+08:00",
  },
  {
    id: "USER-MU-20260831-0906-LIUYAO",
    assetId: "mu",
    horizon: "WEEK",
    periodStart: "2026-08-31",
    periodEnd: "2026-09-06",
    primaryHexagram: "雷地豫（六合）",
    changingHexagram: "坤为地（六冲）",
    capturedAt: "2026-08-24T21:17:00+08:00",
    verifiedAt: "2026-08-25T20:15:00+08:00",
  },
  {
    id: "USER-SPX-20260907-0913-LIUYAO",
    assetId: "sp500",
    horizon: "WEEK",
    periodStart: "2026-09-07",
    periodEnd: "2026-09-13",
    primaryHexagram: "风山渐（归魂）",
    changingHexagram: "水山蹇",
    capturedAt: "2026-08-25T06:40:00+08:00",
    verifiedAt: "2026-08-25T20:15:00+08:00",
  },
  {
    id: "USER-SPX-20260914-0920-LIUYAO",
    assetId: "sp500",
    horizon: "WEEK",
    periodStart: "2026-09-14",
    periodEnd: "2026-09-20",
    primaryHexagram: "离为火（六冲）",
    changingHexagram: "火泽睽",
    capturedAt: "2026-08-25T06:41:00+08:00",
    verifiedAt: "2026-08-25T20:15:00+08:00",
  },
  {
    id: "USER-SPX-20260921-0927-LIUYAO",
    assetId: "sp500",
    horizon: "WEEK",
    periodStart: "2026-09-21",
    periodEnd: "2026-09-27",
    primaryHexagram: "山水蒙",
    changingHexagram: "火水未济",
    capturedAt: "2026-08-25T06:42:00+08:00",
    verifiedAt: "2026-08-25T20:15:00+08:00",
  },
  {
    id: "USER-SPX-20260928-1004-LIUYAO",
    assetId: "sp500",
    horizon: "WEEK",
    periodStart: "2026-09-28",
    periodEnd: "2026-10-04",
    primaryHexagram: "天水讼（游魂）",
    changingHexagram: "火风鼎",
    capturedAt: "2026-08-25T06:43:00+08:00",
    verifiedAt: "2026-08-25T20:15:00+08:00",
  },
  {
    id: "USER-SHCOMP-20260907-0913-LIUYAO",
    assetId: "shanghai-composite",
    horizon: "WEEK",
    periodStart: "2026-09-07",
    periodEnd: "2026-09-13",
    primaryHexagram: "山雷颐（游魂）",
    changingHexagram: "山地剥",
    capturedAt: "2026-08-25T19:35:00+08:00",
    verifiedAt: "2026-08-25T20:15:00+08:00",
  },
  {
    id: "USER-SHCOMP-20260914-0920-LIUYAO",
    assetId: "shanghai-composite",
    horizon: "WEEK",
    periodStart: "2026-09-14",
    periodEnd: "2026-09-20",
    primaryHexagram: "地山谦",
    changingHexagram: "泽火革",
    capturedAt: "2026-08-25T19:34:00+08:00",
    verifiedAt: "2026-08-25T20:15:00+08:00",
  },
  {
    id: "USER-SHCOMP-20260921-0927-LIUYAO",
    assetId: "shanghai-composite",
    horizon: "WEEK",
    periodStart: "2026-09-21",
    periodEnd: "2026-09-27",
    primaryHexagram: "山泽损",
    changingHexagram: "山天大畜",
    capturedAt: "2026-08-25T19:33:00+08:00",
    verifiedAt: "2026-08-25T20:15:00+08:00",
  },
  {
    id: "USER-SHCOMP-20260928-1004-LIUYAO",
    assetId: "shanghai-composite",
    horizon: "WEEK",
    periodStart: "2026-09-28",
    periodEnd: "2026-10-04",
    primaryHexagram: "风泽中孚（游魂）",
    changingHexagram: null,
    capturedAt: "2026-08-25T19:31:00+08:00",
    verifiedAt: "2026-08-25T20:15:00+08:00",
  },
  {
    id: "USER-HSTECH-20260907-0913-LIUYAO",
    assetId: "hang-seng",
    horizon: "WEEK",
    periodStart: "2026-09-07",
    periodEnd: "2026-09-13",
    primaryHexagram: "泽水困（六合）",
    changingHexagram: "泽天夬",
    capturedAt: "2026-08-25T19:39:00+08:00",
    verifiedAt: "2026-08-25T20:15:00+08:00",
  },
  {
    id: "USER-HSTECH-20260914-0920-LIUYAO",
    assetId: "hang-seng",
    horizon: "WEEK",
    periodStart: "2026-09-14",
    periodEnd: "2026-09-20",
    primaryHexagram: "天地否（六合）",
    changingHexagram: "坎为水（六冲）",
    capturedAt: "2026-08-25T19:40:00+08:00",
    verifiedAt: "2026-08-25T20:15:00+08:00",
  },
  {
    id: "USER-HSTECH-20260921-0927-LIUYAO",
    assetId: "hang-seng",
    horizon: "WEEK",
    periodStart: "2026-09-21",
    periodEnd: "2026-09-27",
    primaryHexagram: "雷火丰",
    changingHexagram: "泽风大过（游魂）",
    capturedAt: "2026-08-25T19:42:00+08:00",
    verifiedAt: "2026-08-25T20:15:00+08:00",
  },
  {
    id: "USER-HSTECH-20260928-1004-LIUYAO",
    assetId: "hang-seng",
    horizon: "WEEK",
    periodStart: "2026-09-28",
    periodEnd: "2026-10-04",
    primaryHexagram: "泽山咸",
    changingHexagram: "泽地萃",
    capturedAt: "2026-08-25T19:43:00+08:00",
    verifiedAt: "2026-08-25T20:15:00+08:00",
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

export function hasVerifiedCurrentOrUpcomingWeeklyCycleEvidence(
  assetId: string,
  asOfDate: string,
): boolean {
  return VERIFIED_CYCLE_EVIDENCE.some(
    (item) =>
      item.assetId === assetId &&
      item.horizon === "WEEK" &&
      item.periodEnd >= asOfDate,
  );
}
