import Link from "next/link";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Badge, Text } from "@/components/ui";
import { getWeeklySectionPayload } from "@/lib/data/weekly-analysis-access";

export async function HomeWeeklySection() {
  const payload = await getWeeklySectionPayload();
  const { summary } = payload;
  if (summary.coverageCount === 0) return null;

  const teasers = summary.teasers;

  return (
    <section id="weekly-preview" className="border-t border-border/[0.06] py-8 lg:py-12">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="会员"
          title={summary.headingZh ?? "周度行情分析"}
          subtitle={
            summary.subtitleZh ??
            "覆盖比特币、标普500、纳斯达克100、上证、恒生科技、黄金与WTI原油七个市场。"
          }
        />
        <p className="mb-3 mt-2 text-caption text-foreground-tertiary">
          分析周期：{summary.weekLabel} · 已发布 {summary.publishedCount} / {summary.coverageCount} 项
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {teasers.map((t) => {
            if (payload.mode === "member" && t.isReady) {
              const slot = payload.slots.find(
                (s) => s.kind === "published" && s.analysis.assetId === t.assetId
              );
              const analysis = slot?.kind === "published" ? slot.analysis : null;
              return (
                <div
                  key={t.id}
                  className="flex min-w-0 flex-col gap-2 overflow-hidden rounded-lg border border-border/[0.08] bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Text variant="body" weight="semibold" className="min-w-0 break-words">
                      {t.assetName}
                    </Text>
                    <Badge variant="outline">{analysis?.overallDirection ?? "已发布"}</Badge>
                  </div>
                  <p className="text-caption text-foreground-secondary break-words">
                    {analysis?.headline ?? "本周分析已发布"}
                  </p>
                </div>
              );
            }
            return (
              <div
                key={t.id}
                className="flex min-w-0 flex-col gap-2 overflow-hidden rounded-lg border border-border/[0.08] bg-card p-4"
              >
                <Text variant="body" weight="semibold">
                  {t.assetName}{" "}
                  <span className="font-mono text-caption text-foreground-tertiary">
                    {t.displaySymbol ?? t.symbol}
                  </span>
                </Text>
                <Badge variant="outline" className="w-fit">
                  {t.isReady ? "会员锁定" : "尚未发布"}
                </Badge>
              </div>
            );
          })}
        </div>
        <Link
          href="/member/weekly"
          className="mt-4 inline-block text-body-sm text-primary underline-offset-4 hover:underline"
        >
          {payload.mode === "member"
            ? summary.displayMode === "NEXT_WEEK"
              ? "查看完整下周分析"
              : "查看完整本周分析"
            : summary.displayMode === "NEXT_WEEK"
              ? "登录会员查看下周分析"
              : "登录会员查看本周分析"}
        </Link>
      </div>
    </section>
  );
}
