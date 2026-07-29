import { AdminNav } from "@/components/admin/AdminNav";
import {
  AdminDailyForecastForm,
  AdminRefetchResultButton,
  AdminRunDailyVerifyButton,
} from "@/components/admin/AdminDailyForecastForm";
import { AdminTomorrowBatchForm } from "@/components/admin/AdminTomorrowBatchForm";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import {
  listDailyForecastRecords,
  listDailyVerificationResults,
} from "@/lib/data/daily-accuracy-store";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminForecastsPage() {
  const [forecasts, results] = await Promise.all([
    listDailyForecastRecords(),
    listDailyVerificationResults(),
  ]);
  const resultById = new Map(results.map((r) => [r.forecastId, r]));

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/forecasts" />
        <Heading as="h1" size="h2">
          每日预测与验证
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          正式发布的日度方向预测会在交易结束后自动验证。下一交易日预测批次写入正式预测库，不会使用
          Wave 数据替代。
        </Text>

        <AdminTomorrowBatchForm />
        <AdminRunDailyVerifyButton />
        <AdminDailyForecastForm />

        <div className="flex flex-col gap-3">
          {forecasts.map((f) => {
            const r = resultById.get(f.id);
            return (
              <Card key={f.id} padding="md">
                <div className="flex flex-wrap items-center gap-2">
                  <Text variant="body" weight="semibold">
                    {f.forecastDate} · {f.assetName}
                  </Text>
                  <Badge variant="outline">{f.status}</Badge>
                  <Badge variant="outline">{f.directionLabel}</Badge>
                  {f.isSystemTest && <Badge variant="warning">系统测试</Badge>}
                  {r && <Badge variant="outline">{r.verdictLabel}</Badge>}
                </div>
                <Text variant="caption" color="tertiary" className="mt-2 block">
                  发布 {formatDateTimeChina(f.publishedAt)} · 截止 {formatDateTimeChina(f.cutoffAt)} · v
                  {f.originalVersion}
                </Text>
                {f.summary && (
                  <Text variant="body-sm" color="secondary" className="mt-2">
                    {f.summary}
                  </Text>
                )}
                {r?.verdict === "MANUAL_REVIEW" && (
                  <div className="mt-3">
                    <AdminRefetchResultButton forecastId={f.id} />
                  </div>
                )}
              </Card>
            );
          })}
          {!forecasts.length && (
            <Text variant="body-sm" color="secondary">
              暂无每日预测记录。请先新建并审核发布。
            </Text>
          )}
        </div>
      </Section>
    </main>
  );
}
