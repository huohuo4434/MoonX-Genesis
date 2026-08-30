import { getChinaDateKey } from "@/lib/date/china-date";
import { hasVerifiedCurrentOrUpcomingWeeklyCycleEvidence } from "@/lib/data/cycle-evidence-coverage";
import { forecastFreshnessStatus } from "@/lib/data/conviction/freshness";
import { ACTIVE_STATIC_FOCUS_ASSET_IDS, type StaticFocusAssetId } from "@/lib/data/conviction/focus-registry-core";
import { listStaticFocusForecasts } from "@/lib/data/conviction/focus-static-forecast-registry";

export type ConvictionWeeklyFreshnessOverview = {
  asOfDate: string;
  total: number;
  current: number;
  expired: number;
  missing: number;
  affectedAssets: string[];
};

const STATIC_ASSET_LABELS: Record<StaticFocusAssetId, string> = {
  tsla: "TSLA",
  lite: "LITE",
  "ganfeng-lithium": "赣锋锂业",
  "lian-tech": "利安科技",
  "lexin-medical": "乐心医疗",
  cxmt: "长鑫科技",
  asteroid: "太空狗",
  sandisk: "闪迪",
  nbis: "Nebius",
  mu: "美光",
  nvda: "英伟达",
  aapl: "苹果",
  amzn: "亚马逊",
  hype: "HYPE",
  sol: "SOL",
  eth: "ETH",
  btc: "BTC",
  googl: "Alphabet",
  msft: "微软",
  tencent: "腾讯",
  "kingsoft-office": "金山办公",
  spcx: "SPCX",
  intel: "英特尔",
  gold: "黄金",
  silver: "白银",
  "wti-crude": "WTI原油",
};

/**
 * Admin freshness guard for every active focus asset.
 *
 * WEEK, WEEK_2, WEEK_3... are all weekly records. A chart that has been
 * verified but is not yet converted into a member publication also counts as
 * source coverage; it does not create a direction or publish a forecast.
 */
export function getConvictionWeeklyFreshnessOverview(
  now = new Date(),
): ConvictionWeeklyFreshnessOverview {
  const asOfDate = getChinaDateKey(now);
  let current = 0;
  let expired = 0;
  let missing = 0;
  const affectedAssets: string[] = [];

  for (const assetId of ACTIVE_STATIC_FOCUS_ASSET_IDS) {
    const forecasts = listStaticFocusForecasts(assetId);
    const weeklyRecords = forecasts
      .filter((item) => item.forecastType.startsWith("WEEK"));
    const hasCurrentPublication = weeklyRecords.some((item) => {
      const status = forecastFreshnessStatus(item.periodStart, item.periodEnd, asOfDate);
      return status === "CURRENT" || status === "UPCOMING";
    });
    const hasStructuredWeeklyPath = forecasts.some((item) => item.status === "published" && item.calendarMonthPath?.some((path) => {
      const [periodStart, periodEnd] = path.period.split("/");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd ?? "")) return false;
      const status = forecastFreshnessStatus(periodStart, periodEnd, asOfDate);
      return status === "CURRENT" || status === "UPCOMING";
    }));
    const hasVerifiedSource = hasVerifiedCurrentOrUpcomingWeeklyCycleEvidence(assetId, asOfDate);

    if (hasCurrentPublication || hasStructuredWeeklyPath || hasVerifiedSource) {
      current += 1;
    } else if (weeklyRecords.length > 0) {
      expired += 1;
      affectedAssets.push(STATIC_ASSET_LABELS[assetId]);
    } else {
      missing += 1;
      affectedAssets.push(STATIC_ASSET_LABELS[assetId]);
    }
  }

  return {
    asOfDate,
    total: ACTIVE_STATIC_FOCUS_ASSET_IDS.length,
    current,
    expired,
    missing,
    affectedAssets,
  };
}
