import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Card, Heading, Text } from "@/components/ui";
import { listAllWeeklyAnalyses } from "@/lib/data/weekly-analysis";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";

export default async function AdminWeeklyPage() {
  const rows = listAllWeeklyAnalyses();
  const published = rows.filter((r) => r.status === "published");
  const review = rows.filter((r) => r.status === "internal_review");

  return (
    <main className="mx-auto w-full max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <AdminNav current="/admin/weekly" />
      <Heading as="h1" size="h2" className="mb-2">
        本周行情分析
      </Heading>
      <Text variant="body-sm" color="secondary" className="mb-6">
        仅 status=published 会出现在会员页面。sourceIds 与未完成资产仅后台可见。
      </Text>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Card padding="md">
          <Text variant="caption" color="tertiary">
            已发布
          </Text>
          <Text variant="body" weight="semibold" className="mt-1">
            {published.length}
          </Text>
        </Card>
        <Card padding="md">
          <Text variant="caption" color="tertiary">
            内部审核
          </Text>
          <Text variant="body" weight="semibold" className="mt-1">
            {review.length}
          </Text>
        </Card>
        <Card padding="md">
          <Text variant="caption" color="tertiary">
            下一次固定发布
          </Text>
          <Text variant="body" weight="semibold" className="mt-1">
            每周日 20:00
          </Text>
        </Card>
      </div>

      <div className="space-y-4">
        {rows.map((r) => (
          <Card key={r.id} padding="lg" className="space-y-2 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2">
              <Text variant="body" weight="semibold">
                {r.assetName} · {r.symbol}
              </Text>
              <Badge variant={r.status === "published" ? "default" : "outline"}>{r.status}</Badge>
              <Badge variant="outline">{r.overallDirection}</Badge>
            </div>
            <Text variant="body-sm" color="secondary">
              {r.headline}
            </Text>
            <Text variant="caption" color="tertiary" className="block">
              周期：{r.weekStart} → {r.weekEnd} · 版本 v{r.version} · 更新{" "}
              {formatDateTimeChina(r.updatedAt)}
            </Text>
            <Text variant="caption" color="tertiary" className="block break-all">
              内部来源：{(r.sourceIds ?? []).join(", ") || "—"}
            </Text>
            {r.status === "internal_review" ? (
              <Text variant="caption" color="tertiary" className="block">
                未完成：不得出现在会员页面，也不得显示“待更新 / 即将发布”。
              </Text>
            ) : null}
          </Card>
        ))}
      </div>
    </main>
  );
}
