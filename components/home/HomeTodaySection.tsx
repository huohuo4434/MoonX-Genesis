import { unstable_noStore as noStore } from "next/cache";
import { TodayDailyForecastView } from "@/components/home/TodayDailyForecastView";
import { getTodayForecastAccessPayload } from "@/lib/prediction-access-server";
import { getBeijingClock, US_BATCH_KEYS, WTI_BATCH_KEYS } from "@/lib/calendar/publish-windows";
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import { isTradingDay } from "@/lib/calendar/next-trading-day";
import {
  CORE_TOMORROW_ASSETS,
  displayDirection,
  isHumanPublishedForecast,
} from "@/lib/data/daily-forecasts";

export async function HomeTodaySection() {
  noStore();
  const now = new Date();
  const payload = await getTodayForecastAccessPayload(now);
  const clock = getBeijingClock(now);
  const beijingToday = getBeijingTodayKey(now);

  if (!payload.allowed) {
    return (
      <TodayDailyForecastView
        forecasts={[]}
        forecastDate={beijingToday}
        accessDenied={payload.access.reason}
        denyMessage={payload.message}
        teaser={{
          published: payload.teaser.published && payload.teaser.forecastDate === beijingToday,
          marketCount: 0,
          // Guests only see Beijing business date — never a stale cohort date or publish stamp.
          forecastDate: beijingToday,
          publishedAt: null,
          locked: true,
        }}
      />
    );
  }

  // “今日观点”只展示该市场今天真实开市的预测。
  // 周末/休市日：BTC等7×24资产照常展示，A股、港股、美股、黄金和原油转到“下一交易日预测”。
  const ready = payload.forecasts.filter(
    (f) =>
      isHumanPublishedForecast(f) &&
      f.forecastForDate === beijingToday &&
      isTradingDay(f.market, beijingToday)
  );
  const closedMarkets = CORE_TOMORROW_ASSETS.filter(
    (asset) => asset.market !== "crypto" && !isTradingDay(asset.market, beijingToday)
  ).map((asset) => asset.assetName);
  const forecastDate = beijingToday;
  const detailLevel =
    payload.access.reason === "REGISTERED_AFTER_RELEASE" ? "summary" : "full";

  let summary: string | undefined;
  if (ready.length > 0) {
    const dirs = ready.map((f) => `${f.assetName}${displayDirection(f)}`).join("、");
    summary = `今日已发布${ready.length}项市场观点（${dirs}）。`;
  }

  const publishedCount = ready.length;
  let publishHint: string | undefined;
  if (closedMarkets.length > 0) {
    publishHint = `今日休市：${closedMarkets.join("、")}。这些市场不生成“今日预测”，请查看下一交易日观点；休市日不计入正式日度验证。`;
  }
  if (
    payload.access.reason === "REGISTERED_AFTER_RELEASE" &&
    publishedCount > 0 &&
    publishedCount < 7
  ) {
    const missingUs = [...US_BATCH_KEYS, ...WTI_BATCH_KEYS].some(
      (k) =>
        !ready.some(
          (f) =>
            (k === "NDX" && f.symbol === "NDX") ||
            (k === "SPX" && (f.symbol === "SPX" || f.symbol === "^GSPC")) ||
            (k === "GLD" && (f.symbol === "GLD" || f.symbol === "GOLD" || f.symbol === "GC=F")) ||
            (k === "WTI" && (f.symbol === "WTI" || f.symbol === "CL=F"))
        )
    );
    if (missingUs && clock.totalMinutes < 6 * 60 + 30) {
      const batchHint = `已发布${publishedCount}项，剩余美股／原油观点将按批次发布时间陆续公开。`;
      publishHint = publishHint ? `${publishHint} ${batchHint}` : batchHint;
    }
  }

  return (
    <TodayDailyForecastView
      forecasts={ready}
      accessReason={payload.access.reason}
      compositeSummary={summary}
      publishHint={publishHint}
      forecastDate={forecastDate}
      detailLevel={detailLevel}
    />
  );
}
