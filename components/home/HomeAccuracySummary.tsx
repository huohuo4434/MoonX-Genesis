import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Card, Text } from "@/components/ui";
import { getPublicAccuracyHistory } from "@/lib/accuracy/get-public-history";
import { publicSourceAccuracyBreakdown } from "@/lib/accuracy/public-history-filter";
import { PUBLIC_INTERPRETATION_LABEL_ZH,publicAttributionText } from "@/lib/presentation/public-attribution";
import { ASSET_RANK_MIN_SAMPLE_SIZE, DAILY_STABLE_SAMPLE_SIZE } from "@/lib/accuracy/accuracy-governance-core";

function pct(n: number | null | undefined): string {
  if (n == null) return "暂无足够样本";
  return `${(n * 100).toFixed(1)}%`;
}

function assetSampleLabel(hit: number, partial: number, miss: number, hitRate: number | null): string {
  const total = hit + partial + miss;
  if (total === 0) return "暂无足够样本";
  if (total < ASSET_RANK_MIN_SAMPLE_SIZE) {
    return `样本 ${total} 条\n暂不排名`;
  }
  return `加权命中率：${pct(hitRate)}\n完全${hit} · 部分${partial} · 未中${miss}`;
}

export async function HomeAccuracySummary() {
  noStore();
  const { items, stats } = await getPublicAccuracyHistory();
  const byAsset = publicSourceAccuracyBreakdown(items);
  const sampleCount = stats.verifiedCount;
  const sampleReady = sampleCount >= DAILY_STABLE_SAMPLE_SIZE;
  const governedPct = (value: number | null | undefined) => sampleReady ? pct(value) : "样本积累中";

  return (
    <section className="border-t border-border/[0.06] py-8 lg:py-12">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="验证"
          title="历史准确率"
          subtitle="仅统计已经完成市场验证的历史预测；今日和未来预测不会在此提前公开。"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["日度辅助加权命中率", `${governedPct(stats.weightedHitRate)}（有效样本 ${sampleCount}/${DAILY_STABLE_SAMPLE_SIZE}）`],
            ["日度辅助最近7日", governedPct(stats.hitRate7d)],
            ["日度辅助最近30日", governedPct(stats.hitRate30d)],
          ].map(([label, value]) => (
            <Card key={label} padding="md">
              <Text variant="caption" color="tertiary">
                {label}
              </Text>
              <Text variant="body" weight="semibold" className="mt-1 whitespace-pre-line">
                {value}
              </Text>
            </Card>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {byAsset.map((a) => (
            <Card key={a.source} padding="md" className="min-w-0">
              <Text variant="caption" color="tertiary" className="block break-words">
                {publicAttributionText(a.source.replace(/准确率$/, "")) || PUBLIC_INTERPRETATION_LABEL_ZH}
              </Text>
              <Text variant="body-sm" weight="semibold" className="mt-1 whitespace-pre-line break-words">
                {assetSampleLabel(a.hit, a.partial, a.miss, a.hitRate)}
              </Text>
            </Card>
          ))}
        </div>
        <Link
          href="/verification"
          className="mt-4 inline-block text-body-sm text-primary underline-offset-4 hover:underline"
        >
          查看完整验证记录
        </Link>
      </div>
    </section>
  );
}
