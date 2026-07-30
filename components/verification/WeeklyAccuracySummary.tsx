import { Badge, Card, Heading, Text } from "@/components/ui";
import type {
  WeeklyAccuracyPublicItem,
  WeeklyAccuracyPublicStats,
} from "@/lib/accuracy/get-weekly-history";

function pct(value: number | null): string {
  return value == null ? "积累中" : `${value.toFixed(1)}%`;
}

function resultLabel(result: string): string {
  if (result === "FULL_HIT") return "完全命中";
  if (result === "PARTIAL_HIT") return "部分命中";
  if (result === "MISS") return "未命中";
  if (result === "UNVERIFIABLE") return "无法验证";
  return "持续跟踪中";
}

function resultClass(result: string): string {
  if (result === "FULL_HIT") return "border-emerald-500/30 text-emerald-500";
  if (result === "PARTIAL_HIT") return "border-amber-500/30 text-amber-500";
  if (result === "MISS") return "border-red-500/30 text-red-500";
  return "text-foreground-tertiary";
}

export function WeeklyAccuracySummary({
  items,
  stats,
}: {
  items: WeeklyAccuracyPublicItem[];
  stats: WeeklyAccuracyPublicStats;
}) {
  return (
    <section className="mb-12">
      <div className="mb-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="default">周度验证</Badge>
          <Badge variant="outline">核心展示</Badge>
        </div>
        <Heading as="h2" size="h3">
          周度预测表现
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 max-w-3xl">
          周度方向与周内路径分别验证。加权命中率按“完全命中＋部分命中×0.5”计算；无法验证不进入分母。76%是长期优化目标，不会用人工改数代替真实结果。
        </Text>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="md">
          <Text variant="caption" color="tertiary">周度有效样本</Text>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{stats.sampleSize}</div>
        </Card>
        <Card padding="md">
          <Text variant="caption" color="tertiary">周度加权命中率</Text>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{pct(stats.weightedAccuracyPct)}</div>
        </Card>
        <Card padding="md">
          <Text variant="caption" color="tertiary">周度方向命中率</Text>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{pct(stats.directionAccuracyPct)}</div>
        </Card>
        <Card padding="md">
          <Text variant="caption" color="tertiary">完全 / 部分 / 未命中</Text>
          <div className="mt-2 text-xl font-semibold tabular-nums">
            {stats.full} / {stats.partial} / {stats.miss}
          </div>
        </Card>
      </div>

      {items.length ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {items.slice(0, 12).map((item) => (
            <Card key={item.id} padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Text variant="body" weight="semibold">
                    {item.symbol} · {item.weekStart} 至 {item.weekEnd}
                  </Text>
                  <Text variant="body-sm" color="secondary" className="mt-1">
                    预测：{item.predictedPattern} · 实际：{item.actualPattern ?? "持续跟踪中"}
                  </Text>
                </div>
                <Badge variant="outline" className={resultClass(item.result)}>
                  {resultLabel(item.result)}
                </Badge>
              </div>
              {item.explanation ? (
                <Text variant="caption" color="tertiary" className="mt-3 block">
                  {item.explanation}
                </Text>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <Card padding="md" className="mt-5">
          <Text variant="body" weight="semibold">周度验证样本正在积累</Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            第一个完整周结束并取得行情数据后，系统会自动写入周度方向、路径和命中结果。
          </Text>
        </Card>
      )}
    </section>
  );
}
