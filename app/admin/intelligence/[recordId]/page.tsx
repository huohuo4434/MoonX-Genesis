import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminForecastChartLazy } from "@/components/admin/AdminForecastChartLazy";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { getResearchRecord } from "@/lib/data/research-records";
import { buildWtiExtForecastChartV1 } from "@/lib/data/wti-forecast-chart-draft";
import { WTI_EXT_PATH_RECORD_ID } from "@/lib/data/wti-path-ext-20260807";
import { resolveResearchVisibility } from "@/lib/research/visibility";
import type { LongTermForecastChart } from "@/types/long-term-forecast-chart";

export const dynamic = "force-dynamic";

function resolveForecastChart(recordId: string): LongTermForecastChart | null {
  if (recordId === WTI_EXT_PATH_RECORD_ID) return buildWtiExtForecastChartV1();
  return null;
}

export default async function AdminIntelligenceRecordPage({
  params,
}: {
  params: Promise<{ recordId: string }>;
}) {
  const { recordId } = await params;
  const record = await getResearchRecord(recordId);
  if (!record) notFound();

  const chart = record.forecastChart ?? resolveForecastChart(recordId);

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/intelligence" />
        <div className="mb-4">
          <Link href="/admin/intelligence" className="text-body-sm text-primary underline-offset-4 hover:underline">
            ← 返回内部资料库
          </Link>
        </div>
        <Heading as="h1" size="h2">
          {record.title?.zhCN ?? record.id}
        </Heading>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="outline">{resolveResearchVisibility(record)}</Badge>
          {record.publishGate ? <Badge variant="outline">{record.publishGate}</Badge> : null}
          <Badge variant="outline">{record.horizon?.zhCN ?? "—"}</Badge>
        </div>
        <Text variant="caption" color="tertiary" className="mt-2 block font-mono">
          {record.id} · {record.assetId} · {record.symbol ?? "—"}
        </Text>
        <Text variant="body-sm" color="secondary" className="mt-3 max-w-3xl">
          {record.summary?.zhCN}
        </Text>

        {chart?.enabled ? (
          <div className="mt-8 space-y-3">
            <Heading as="h2" size="h3">
              长期预测K线图（仅管理员）
            </Heading>
            <AdminForecastChartLazy chart={chart} />
          </div>
        ) : (
          <Card padding="md" className="mt-8">
            <Text variant="body-sm" color="secondary">
              该研究尚未生成预测K线图草稿。
            </Text>
          </Card>
        )}
      </Section>
    </main>
  );
}
