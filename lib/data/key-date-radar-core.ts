export type KeyDateAction = "BOTTOM_WATCH" | "TOP_EXIT_WATCH" | "TURNING_RISK";
export type KeyDateLevel = "MONTH" | "WEEK";
export type KeyDateEvidence = "EXPLICIT" | "DERIVED";
export type KeyDateStatus = "UPCOMING" | "ACTIVE" | "REVIEW";

export type KeyDateRadarItem = {
  id: string;
  assetId: string;
  assetName: string;
  symbol: string;
  startDate: string;
  endDate: string;
  focusDate: string;
  ganzhi: string;
  level: KeyDateLevel;
  action: KeyDateAction;
  title: string;
  primaryView: string;
  weeklyAssist: string;
  confirmation: string;
  invalidation: string;
  confidence: number;
  evidence: KeyDateEvidence;
  derivation: string;
  sourceIds: string[];
  methodViews?: Array<{
    id: string;
    label: string;
    direction: string;
    summary: string;
  }>;
  finalSynthesis?: string;
};

export type KeyDateRadarViewItem = KeyDateRadarItem & { status: KeyDateStatus };

export function keyDateStatus(item: KeyDateRadarItem, asOfDate: string): KeyDateStatus {
  if (item.endDate < asOfDate) return "REVIEW";
  if (item.startDate > asOfDate) return "UPCOMING";
  return "ACTIVE";
}
export function buildKeyDateRadar(
  items: KeyDateRadarItem[],
  asOfDate: string,
): KeyDateRadarViewItem[] {
  return items
    .map((item) => ({ ...item, status: keyDateStatus(item, asOfDate) }))
    .sort((left, right) => {
      const statusRank: Record<KeyDateStatus, number> = { ACTIVE: 0, UPCOMING: 1, REVIEW: 2 };
      return statusRank[left.status] - statusRank[right.status]
        || left.startDate.localeCompare(right.startDate)
        || right.confidence - left.confidence
        || left.assetName.localeCompare(right.assetName, "zh-CN");
    });
}

export function summarizeKeyDateRadar(items: KeyDateRadarViewItem[]) {
  const live = items.filter((item) => item.status !== "REVIEW");
  return {
    assetCount: new Set(live.map((item) => item.assetId)).size,
    activeCount: live.filter((item) => item.status === "ACTIVE").length,
    bottomCount: live.filter((item) => item.action === "BOTTOM_WATCH").length,
    topCount: live.filter((item) => item.action === "TOP_EXIT_WATCH").length,
    riskCount: live.filter((item) => item.action === "TURNING_RISK").length,
    monthlyCount: live.filter((item) => item.level === "MONTH").length,
    weeklyCount: live.filter((item) => item.level === "WEEK").length,
    explicitCount: live.filter((item) => item.evidence === "EXPLICIT").length,
    derivedCount: live.filter((item) => item.evidence === "DERIVED").length,
  };
}

export function splitCurrentKeyDateRadar(items: KeyDateRadarViewItem[]) {
  const live = items.filter((item) => item.status !== "REVIEW");
  return {
    monthly: live.filter((item) => item.level === "MONTH"),
    weekly: live.filter((item) => item.level === "WEEK"),
    review: items.filter((item) => item.status === "REVIEW"),
  };
}

