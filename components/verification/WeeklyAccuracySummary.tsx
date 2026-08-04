"use client";

import { Badge, Card, Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { directionEn, safeEnglish } from "@/lib/i18n/english-content";
import type { WeeklyAccuracyPublicItem, WeeklyAccuracyPublicStats } from "@/lib/accuracy/get-weekly-history";

function pct(value: number | null, en: boolean): string {
  return value == null ? (en ? "Building sample" : "积累中") : `${value.toFixed(1)}%`;
}

function resultLabel(result: string, en: boolean): string {
  if (result === "FULL_HIT") return en ? "Full hit" : "完全命中";
  if (result === "PARTIAL_HIT") return en ? "Partial hit" : "部分命中";
  if (result === "MISS") return en ? "Miss" : "未命中";
  if (result === "UNVERIFIABLE") return en ? "Unverifiable" : "无法验证";
  return en ? "Tracking" : "持续跟踪中";
}

function resultClass(result: string): string {
  if (result === "FULL_HIT") return "border-emerald-500/30 text-emerald-500";
  if (result === "PARTIAL_HIT") return "border-amber-500/30 text-amber-500";
  if (result === "MISS") return "border-red-500/30 text-red-500";
  return "text-foreground-tertiary";
}

export function WeeklyAccuracySummary({ items, stats }: { items: WeeklyAccuracyPublicItem[]; stats: WeeklyAccuracyPublicStats }) {
  const { locale } = useLocale();
  const en = locale === "en";
  const sampleReady = stats.sampleSize >= 12;
  const emptyCard = (
    <Card padding="lg">
      <Text variant="body" weight="semibold">{en ? "Weekly verification samples are building" : "周度验证样本正在积累"}</Text>
      <Text variant="body-sm" color="secondary" className="mt-2">
        {en ? "Direction, path and hit statistics appear only after a complete week ends and verified market data is available." : "第一个完整周结束并取得真实行情后，才会显示方向、路径和命中统计。"}
      </Text>
    </Card>
  );

  if (!stats.sampleSize && !items.length) {
    return <section className="mb-12"><div className="mb-5"><Badge variant="default">{en ? "Weekly verification" : "周度验证"}</Badge><Heading as="h2" size="h3" className="mt-2">{en ? "Weekly forecast performance" : "周度预测表现"}</Heading></div>{emptyCard}</section>;
  }

  return (
    <section className="mb-12">
      <div className="mb-5">
        <div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant="default">{en ? "Weekly verification" : "周度验证"}</Badge><Badge variant="outline">{en ? "Core record" : "核心展示"}</Badge></div>
        <Heading as="h2" size="h3">{en ? "Weekly forecast performance" : "周度预测表现"}</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 max-w-3xl">{en ? "Weekly direction and within-week path are scored separately. Weighted accuracy counts a partial hit at 0.5; unverifiable records never enter the denominator." : "周度方向与周内路径分别验证。加权命中率按“完全命中＋部分命中×0.5”计算；无法验证不进入分母。"}</Text>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Verified weekly samples" : "周度有效样本"}</Text><div className="mt-2 text-2xl font-semibold tabular-nums">{stats.sampleSize}</div></Card>
        <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Weighted accuracy" : "周度加权命中率"}</Text><div className="mt-2 text-2xl font-semibold tabular-nums">{sampleReady ? pct(stats.weightedAccuracyPct, en) : en ? "Building sample" : "积累中"}</div></Card>
        <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Direction accuracy" : "周度方向命中率"}</Text><div className="mt-2 text-2xl font-semibold tabular-nums">{sampleReady ? pct(stats.directionAccuracyPct, en) : en ? "Building sample" : "积累中"}</div></Card>
        <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Full / partial / miss" : "完全 / 部分 / 未命中"}</Text><div className="mt-2 text-xl font-semibold tabular-nums">{stats.full} / {stats.partial} / {stats.miss}</div></Card>
      </div>

      {items.length ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {items.slice(0, 12).map((item) => (
            <Card key={item.id} padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Text variant="body" weight="semibold">{item.symbol === "GLD" ? "GOLD" : item.symbol} · {item.weekStart} {en ? "to" : "至"} {item.weekEnd}</Text>
                  <Text variant="body-sm" color="secondary" className="mt-1">{en ? "Forecast" : "预测"}: {en ? directionEn(item.predictedPattern) : item.predictedPattern} · {en ? "Actual" : "实际"}: {item.actualPattern ? (en ? directionEn(item.actualPattern) : item.actualPattern) : en ? "Tracking" : "持续跟踪中"}</Text>
                </div>
                <Badge variant="outline" className={resultClass(item.result)}>{resultLabel(item.result, en)}</Badge>
              </div>
              {item.explanation ? <Text variant="caption" color="tertiary" className="mt-3 block">{en ? safeEnglish(item.explanation) : item.explanation}</Text> : null}
            </Card>
          ))}
        </div>
      ) : <div className="mt-5">{emptyCard}</div>}
    </section>
  );
}
