import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { listResearchRecords } from "@/lib/data/research-records";
import { getWtiExtPathAdminCard } from "@/lib/data/wti-path-ext-20260807";
import { listWtiLaterComparisons } from "@/lib/research/wti-ext-path-engine";
import { resolveResearchVisibility } from "@/lib/research/visibility";

export const dynamic = "force-dynamic";

export default async function AdminIntelligencePage() {
  const records = await listResearchRecords();
  const wtiCard = getWtiExtPathAdminCard();
  const wtiComparisons = listWtiLaterComparisons(records);
  const internal = records
    .filter((r) => resolveResearchVisibility(r) !== "archived")
    .filter((r) => r.id !== wtiCard.id)
    .slice(0, 80);

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/intelligence" />
        <Heading as="h1" size="h2">
          内部资料库
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          周度／月度／季度／年度等长线研究仅供内部与日度引擎使用，不对公众开放。
        </Text>

        <Card padding="md" className="mb-6 space-y-2 border border-amber-500/30">
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="body" weight="semibold">
              {wtiCard.title}
            </Text>
            <Badge variant="outline">internal</Badge>
            <Badge variant="outline">internal_review</Badge>
          </div>
          <Text variant="caption" color="tertiary" className="block font-mono">
            {wtiCard.id}
          </Text>
          <Link
            href={`/admin/intelligence/${wtiCard.id}`}
            className="inline-block text-body-sm text-primary underline-offset-4 hover:underline"
          >
            打开详情与预测K线图
          </Link>
          <Text variant="body-sm" className="block">
            前期结论：{wtiCard.earlyConclusion}
          </Text>
          <Text variant="body-sm" className="block">
            前期一致性：{wtiCard.earlyAlignment}
          </Text>
          <Text variant="body-sm" className="block">
            后期情景：{wtiCard.laterScenario}
          </Text>
          <Text variant="body-sm" weight="semibold" className="block">
            后期状态：{wtiCard.laterStatus}
          </Text>
          <Text variant="caption" color="secondary" className="block">
            {wtiCard.laterAdminBanner}
          </Text>
          <Text variant="caption" color="tertiary" className="block">
            管理员备注：{wtiCard.adminNote}
          </Text>
          {wtiComparisons.length ? (
            <div className="mt-2 space-y-1">
              <Text variant="caption" weight="semibold" className="block">
                新六爻自动比较
              </Text>
              {wtiComparisons.map((c) => (
                <Text key={c.liuyaoRecordId} variant="caption" color="tertiary" className="block">
                  {c.liuyaoRecordId} → {c.verdict}（后期权重 {c.laterWeightPct}%）· {c.note}
                </Text>
              ))}
            </div>
          ) : (
            <Text variant="caption" color="tertiary" className="mt-1 block">
              尚无更新的WTI六爻记录可供自动比较。
            </Text>
          )}
        </Card>

        <div className="flex flex-col gap-3">
          {internal.map((r) => (
            <Card key={r.id} padding="md" className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Text variant="body" weight="semibold">
                  {r.title?.zhCN ?? r.id}
                </Text>
                <Badge variant="outline">{resolveResearchVisibility(r)}</Badge>
                {r.publishGate ? <Badge variant="outline">{r.publishGate}</Badge> : null}
                <Badge variant="outline">{r.horizon?.zhCN ?? "—"}</Badge>
              </div>
              <Text variant="caption" color="tertiary" className="block font-mono">
                {r.id} · {r.assetId}
              </Text>
              <Text variant="body-sm" color="secondary">
                方向：{r.direction} · 置信度：{r.editorialConfidence}
                {r.comparison?.earlyStageAlignment
                  ? ` · 前期一致性：${r.comparison.earlyStageAlignment}`
                  : ""}
                {r.comparison?.laterStageStatus
                  ? ` · 后期：${r.comparison.laterStageStatus}`
                  : ""}
              </Text>
              <Text variant="caption" color="tertiary" className="block line-clamp-2">
                {r.summary?.zhCN}
              </Text>
              <Link
                href={`/admin/intelligence/${r.id}`}
                className="inline-block text-caption text-primary underline-offset-4 hover:underline"
              >
                查看详情
              </Link>
            </Card>
          ))}
        </div>
      </Section>
    </main>
  );
}
