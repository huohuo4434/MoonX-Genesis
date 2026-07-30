import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Card, Text } from "@/components/ui";
import { getPublicAccuracyHistory } from "@/lib/accuracy/get-public-history";
import { publicSourceAccuracyBreakdown } from "@/lib/accuracy/public-history-filter";

const MIN_SAMPLE = 5;

function pct(n: number | null): string {
  if (n == null) return "暂无足够样本";
  return `${(n * 100).toFixed(1)}%`;
}

function assetSampleLabel(hit: number, miss: number, hitRate: number | null): string {
  const total = hit + miss;
  if (total === 0) return "暂无足够样本";
  if (total < MIN_SAMPLE) {
    return `${hit}/${total}命中\n样本较少`;
  }
  return `命中率：${pct(hitRate)}\n${hit}/${total}命中`;
}

export async function HomeAccuracySummary() {
  noStore();
  const { items, stats } = await getPublicAccuracyHistory();
  const byAsset = publicSourceAccuracyBreakdown(items);
  const sampleCount = stats.hitCount + stats.missCount;

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
            ["总命中率", `${pct(stats.hitRate)}（有效样本 ${sampleCount}）`],
            ["最近7日", pct(stats.hitRate7d)],
            ["最近30日", pct(stats.hitRate30d)],
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
                {a.source.replace(/准确率$/, "")}
              </Text>
              <Text variant="body-sm" weight="semibold" className="mt-1 whitespace-pre-line break-words">
                {assetSampleLabel(a.hit, a.miss, a.hitRate)}
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
