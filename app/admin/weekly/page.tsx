import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Card, Heading, Text } from "@/components/ui";
import {
  WEEKLY_CORE_MARKETS,
  buildWeeklyPublicSummary,
  listPublishedWeeklyAnalyses,
  resolveWeeklyDisplayWindow,
} from "@/lib/data/weekly-analysis";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminWeeklyPage() {
  const now = new Date();
  const window = resolveWeeklyDisplayWindow(now);
  const summary = buildWeeklyPublicSummary(now);
  const rows = listPublishedWeeklyAnalyses(now);
  const byAsset = new Map(rows.map((r) => [r.assetId, r]));

  return (
    <main className="mx-auto w-full max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <AdminNav current="/admin/weekly" />
      <Heading as="h1" size="h2" className="mb-2">
        周度行情管理
      </Heading>
      <Text variant="body-sm" color="secondary" className="mb-6">
        周一至周五展示本周；周六、周日自动切换到下周。只发布有真实研究依据的市场，缺失项目不会复制旧预测。
      </Text>

      <div className="mb-8 grid gap-3 sm:grid-cols-4">
        <Card padding="md">
          <Text variant="caption" color="tertiary">当前窗口</Text>
          <Text variant="body" weight="semibold" className="mt-1">
            {window.displayMode === "NEXT_WEEK" ? "下周" : "本周"}
          </Text>
        </Card>
        <Card padding="md">
          <Text variant="caption" color="tertiary">分析周期</Text>
          <Text variant="body-sm" weight="semibold" className="mt-1">
            {summary.weekLabel}
          </Text>
        </Card>
        <Card padding="md">
          <Text variant="caption" color="tertiary">已发布</Text>
          <Text variant="body" weight="semibold" className="mt-1">
            {summary.publishedCount} / {summary.coverageCount}
          </Text>
        </Card>
        <Card padding="md">
          <Text variant="caption" color="tertiary">切换规则</Text>
          <Text variant="body-sm" weight="semibold" className="mt-1">
            每周六切换下周
          </Text>
        </Card>
      </div>

      <Card padding="md" className="mb-6 border-amber-500/20 bg-amber-500/[0.04]">
        <Text variant="body-sm">{summary.nextPublishHint}</Text>
      </Card>

      <div className="space-y-4">
        {WEEKLY_CORE_MARKETS.map((m) => {
          const r = byAsset.get(m.assetId);
          return (
            <Card key={m.assetId} padding="lg" className="space-y-2 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2">
                <Text variant="body" weight="semibold">
                  {m.assetName} · {m.displaySymbol}
                </Text>
                <Badge variant={r?.status === "published" ? "default" : "outline"}>
                  {r?.status === "published" ? "已发布" : "待发布"}
                </Badge>
                {r ? <Badge variant="outline">{r.overallDirection}</Badge> : null}
              </div>
              {r ? (
                <>
                  <Text variant="body-sm" color="secondary">{r.headline}</Text>
                  <Text variant="caption" color="tertiary" className="block">
                    周期：{r.weekStart} → {r.weekEnd} · V{r.version} · 更新{" "}
                    {formatDateTimeChina(r.updatedAt)}
                  </Text>
                  <Text variant="caption" color="tertiary" className="block break-all">
                    内部来源：{(r.sourceIds ?? []).join(", ") || "—"}
                  </Text>
                </>
              ) : (
                <Text variant="body-sm" color="secondary">
                  当前窗口没有完成研究。会员页会显示“待发布”，不会沿用上一周方向。
                </Text>
              )}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
