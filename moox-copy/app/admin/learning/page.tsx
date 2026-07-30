import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { listDailyReviews, listLearningCases, listDailyVerificationResults } from "@/lib/data/moonx-data-store";
import { BIAS_LABELS } from "@/types/automation";
import { computeDailyAccuracyStats } from "@/lib/verification/daily-rules";

export const dynamic = "force-dynamic";

export default async function AdminLearningPage() {
  const [reviews, cases, results] = await Promise.all([
    listDailyReviews(),
    listLearningCases(),
    listDailyVerificationResults(),
  ]);
  const stats = computeDailyAccuracyStats(results);

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/learning" />
        <Heading as="h1" size="h2">
          复盘学习（内部）
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          六爻偏差分类与置信度调整仅管理员可见，不对会员公开。
        </Text>
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          {[
            ["有效验证", stats.verifiedCount],
            ["命中", stats.hitCount],
            ["未命中", stats.missCount],
            ["学习案例", cases.length],
          ].map(([label, value]) => (
            <Card key={String(label)} padding="md">
              <Text variant="caption" color="tertiary">
                {label}
              </Text>
              <Text variant="body" weight="semibold" className="mt-1">
                {String(value)}
              </Text>
            </Card>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {reviews.slice(0, 30).map((r) => (
            <Card key={r.id} padding="md" className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Text variant="body" weight="semibold">
                  {r.forecastDate} · {r.assetName}
                </Text>
                <Badge variant="outline">{r.directionVerdict}</Badge>
                <Badge variant="outline">{r.pathVerdictLabel}</Badge>
              </div>
              <Text variant="body-sm">
                预测：{r.originalForecast.directionLabel} · 实际：{r.actualResult.actualDirection}（
                {r.actualResult.returnPct.toFixed(2)}%）
              </Text>
              {r.interpretationBiases.map((b) => (
                <Text key={b.code} variant="caption" color="tertiary" className="block">
                  偏差：{BIAS_LABELS[b.code]} — {b.evidence}
                </Text>
              ))}
              <Text variant="caption" color="tertiary" className="block">
                经验：{r.lessonSummary}
              </Text>
              <Text variant="caption" color="tertiary" className="block">
                下次：{r.futureCaution} · 置信度调整 {r.confidenceAdjustment > 0 ? "+" : ""}
                {r.confidenceAdjustment}
              </Text>
            </Card>
          ))}
          {!reviews.length && (
            <Text variant="body-sm" color="secondary">
              暂无复盘。验证完成后自动生成。
            </Text>
          )}
        </div>
      </Section>
    </main>
  );
}
