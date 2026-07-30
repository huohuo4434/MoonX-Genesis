import Link from "next/link";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Card, Text } from "@/components/ui";
import { listDailyReviews, listDailyVerificationResults } from "@/lib/data/moonx-data-store";
import { buildDailyCompositeSummary } from "@/lib/automation/daily-summary";
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";

/** Compact prior-session review — never mix into today forecast cards. */
export async function HomeYesterdayReview() {
  const today = getBeijingTodayKey();
  const [results, reviews] = await Promise.all([listDailyVerificationResults(), listDailyReviews()]);
  // Prefer prior calendar days; if Asia sessions already verified for "today",
  // still surface them as a separate review block (not under 今日观点).
  const countable = results
    .filter((r) => ["HIT", "FULL_HIT", "PARTIAL_HIT", "MISS"].includes(r.verdict))
    .sort((a, b) => b.forecastDate.localeCompare(a.forecastDate));
  const priorDates = [...new Set(countable.map((r) => r.forecastDate).filter((d) => d < today))];
  const latestDate = priorDates[0] ?? countable[0]?.forecastDate;
  if (!latestDate) return null;

  const dayRows = countable.filter((r) => r.forecastDate === latestDate);
  const hits = dayRows.filter((r) => r.verdict === "HIT" || r.verdict === "FULL_HIT");
  const partials = dayRows.filter((r) => r.verdict === "PARTIAL_HIT");
  const misses = dayRows.filter((r) => r.verdict === "MISS");
  if (!hits.length && !partials.length && !misses.length) return null;

  const summary = buildDailyCompositeSummary({ date: latestDate, results, reviews }).short;
  const title = latestDate < today ? "上一交易日复盘" : "已收盘市场复盘";

  return (
    <section className="border-t border-border/[0.06] py-6 lg:py-8">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="复盘" title={title} subtitle={`${latestDate} 收盘方向验证摘要`} />
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Card padding="md">
            <Text variant="caption" color="tertiary">
              已验证资产
            </Text>
            <Text variant="body-sm" weight="semibold" className="mt-1">
              {hits.length + partials.length + misses.length} 项
            </Text>
          </Card>
          <Card padding="md">
            <Text variant="caption" color="tertiary">
              命中
            </Text>
            <Text variant="body-sm" weight="semibold" className="mt-1">
              {hits.length ? hits.map((r) => r.assetName).join("、") : "无"}
            </Text>
          </Card>
          <Card padding="md">
            <Text variant="caption" color="tertiary">
              部分命中
            </Text>
            <Text variant="body-sm" weight="semibold" className="mt-1">
              {partials.length ? partials.map((r) => r.assetName).join("、") : "无"}
            </Text>
          </Card>
          <Card padding="md">
            <Text variant="caption" color="tertiary">
              未命中
            </Text>
            <Text variant="body-sm" weight="semibold" className="mt-1">
              {misses.length ? misses.map((r) => r.assetName).join("、") : "无"}
            </Text>
          </Card>
        </div>
        {summary ? (
          <Text variant="body-sm" color="secondary" className="mt-3 max-w-3xl">
            {summary}
          </Text>
        ) : null}
        <Link
          href="/verification"
          className="mt-3 inline-block text-body-sm text-primary underline-offset-4 hover:underline"
        >
          查看完整验证记录
        </Link>
      </div>
    </section>
  );
}
