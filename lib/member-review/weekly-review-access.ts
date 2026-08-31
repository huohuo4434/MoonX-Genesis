import "server-only";

import { getWeeklyAccuracyHistory } from "@/lib/accuracy/get-weekly-history";
import { listCanonicalPublishedWeeklyAnalyses } from "@/lib/data/weekly-analysis";
import { getMemberDailyReviewReports } from "@/lib/member-review/daily-review-access";
import { buildMemberWeeklyReviewPayload } from "@/lib/member-review/weekly-review-report";
import { listWeeklyForecastSources } from "@/lib/weekly-source/store";

export async function getMemberWeeklyReviewPayload(now = new Date()) {
  const [history, sources, daily] = await Promise.all([
    getWeeklyAccuracyHistory(), listWeeklyForecastSources(), getMemberDailyReviewReports(now),
  ]);
  return buildMemberWeeklyReviewPayload({ history, analyses: listCanonicalPublishedWeeklyAnalyses(), sources, dailyReports: daily.reports, maxWeeks: 6 });
}
