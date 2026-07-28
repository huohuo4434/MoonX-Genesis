import Link from "next/link";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Badge, Text } from "@/components/ui";
import { getWeeklySectionPayload } from "@/lib/data/weekly-analysis-access";

export async function HomeWeeklySection() {
  const payload = await getWeeklySectionPayload();
  const { summary } = payload;
  if (summary.publishedCount === 0) return null;

  const memberRows =
    payload.mode === "member"
      ? payload.analyses.slice(0, 4)
      : summary.teasers.slice(0, 4);

  return (
    <section id="weekly-preview" className="border-t border-border/[0.06] py-8 lg:py-12">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="会员"
          title="本周会员行情分析"
          subtitle="免费用户仅见已发布资产；会员可查看本周整体方向、周内运行顺序和风险窗口。"
        />
        <p className="mb-3 mt-2 text-caption text-foreground-tertiary">
          分析周期：{summary.weekLabel} · 已发布 {summary.publishedCount} 项
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {memberRows.map((row) => {
            if (payload.mode === "member" && "overallDirection" in row) {
              return (
                <div
                  key={row.id}
                  className="flex min-w-0 flex-col gap-2 overflow-hidden rounded-lg border border-border/[0.08] bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Text variant="body" weight="semibold" className="min-w-0 break-words">
                      {row.assetName}
                    </Text>
                    <Badge variant="outline">{row.overallDirection}</Badge>
                  </div>
                  <p className="text-caption text-foreground-secondary break-words">{row.headline}</p>
                </div>
              );
            }
            return (
              <div
                key={row.id}
                className="flex min-w-0 flex-col gap-2 overflow-hidden rounded-lg border border-border/[0.08] bg-card p-4"
              >
                <Text variant="body" weight="semibold">
                  {row.assetName}
                </Text>
                <p className="text-caption text-foreground-tertiary">本周分析已发布</p>
                <p className="text-caption text-foreground-tertiary">分析周期：{summary.weekLabel}</p>
                <Badge variant="outline" className="w-fit">
                  会员锁定
                </Badge>
              </div>
            );
          })}
        </div>
        <Link
          href="/member/weekly"
          className="mt-4 inline-block text-body-sm text-primary underline-offset-4 hover:underline"
        >
          {payload.mode === "member" ? "查看完整本周分析" : "登录会员查看本周分析"}
        </Link>
      </div>
    </section>
  );
}
