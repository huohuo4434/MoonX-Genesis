import { unstable_noStore as noStore } from "next/cache";
import { TodayDailyForecastView } from "@/components/home/TodayDailyForecastView";
import { getTodayForecastAccessPayload } from "@/lib/prediction-access-server";
import { getBeijingClock, US_BATCH_KEYS, WTI_BATCH_KEYS } from "@/lib/calendar/publish-windows";
import { displayDirection, isHumanPublishedForecast } from "@/lib/data/daily-forecasts";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export async function HomeTodaySection() {
  noStore();
  const payload = await getTodayForecastAccessPayload();
  const clock = getBeijingClock();

  if (!payload.allowed) {
    return (
      <TodayDailyForecastView
        forecasts={[]}
        accessDenied={payload.access.reason}
        denyMessage={payload.message}
      />
    );
  }

  const ready = payload.forecasts.filter((f) => isHumanPublishedForecast(f));

  let summary: string | undefined;
  if (ready.length > 0) {
    const dirs = ready.map((f) => `${f.assetName}${displayDirection(f)}`).join("、");
    summary = `今日已发布${ready.length}项市场观点（${dirs}）。交易结束后将自动验证收盘方向。`;
  }

  const publishedCount = ready.length;
  let publishHint: string | undefined;
  // Members / admins must never see the “opens after 08:00” lock copy.
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
            (k === "GLD" && f.symbol === "GLD") ||
            (k === "WTI" && (f.symbol === "WTI" || f.symbol === "CL=F"))
        )
    );
    if (missingUs && clock.totalMinutes < 6 * 60 + 30) {
      publishHint = `已发布${publishedCount}项，剩余美股／原油观点将按批次发布时间陆续公开。`;
    }
  }

  const updatedTimes = ready
    .map((f) => f.updatedAt || f.publishedAt)
    .filter(Boolean)
    .sort();
  const last = updatedTimes[updatedTimes.length - 1];

  return (
    <TodayDailyForecastView
      forecasts={ready}
      accessReason={payload.access.reason}
      compositeSummary={summary}
      publishHint={publishHint}
      lastUpdatedLabel={last ? formatDateTimeChina(last) : undefined}
    />
  );
}
