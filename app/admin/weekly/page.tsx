import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Card, Heading, Text } from "@/components/ui";
import {
  WEEKLY_CORE_MARKETS,
  listAllWeeklyAnalyses,
} from "@/lib/data/weekly-analysis";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";

export default async function AdminWeeklyPage() {
  const rows = listAllWeeklyAnalyses();
  const byAsset = new Map(rows.map((r) => [r.assetId, r]));
  const published = rows.filter((r) => r.status === "published");

  return (
    <main className="mx-auto w-full max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <AdminNav current="/admin/weekly" />
      <Heading as="h1" size="h2" className="mb-2">
        本周行情分析
      </Heading>
      <Text variant="body-sm" color="secondary" className="mb-6">
        固定覆盖 7 个市场。会员页按此顺序展示；缺失项显示「尚未发布」。当前数据来自代码种子，后续可通过迁移写入库表发布。
      </Text>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Card padding="md">
          <Text variant="caption" color="tertiary">
            覆盖市场
          </Text>
          <Text variant="body" weight="semibold" className="mt-1">
            {WEEKLY_CORE_MARKETS.length}
          </Text>
        </Card>
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
            下一次固定发布
          </Text>
          <Text variant="body" weight="semibold" className="mt-1">
            系统自动更新
          </Text>
        </Card>
      </div>

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
                  {r?.status ?? "unpublished"}
                </Badge>
                {r ? <Badge variant="outline">{r.overallDirection}</Badge> : null}
              </div>
              {r ? (
                <>
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
                  <Text variant="caption" color="tertiary" className="block">
                    方向可用：上涨／下跌／震荡／震荡上涨／震荡下跌／先涨后跌／先跌后涨／冲高回落／探底回升
                  </Text>
                </>
              ) : (
                <Text variant="body-sm" color="secondary">
                  尚未发布 — 请在种子数据或后续后台表单中录入本周预测。
                </Text>
              )}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
