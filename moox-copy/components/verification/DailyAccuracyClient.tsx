"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import type { DailyAccuracyStats, DailyVerdict } from "@/types/daily-accuracy";
import type { PublicAccuracyHistoryItem } from "@/lib/accuracy/public-history-filter";
import { computePublicAccuracyStats } from "@/lib/accuracy/public-history-filter";
import { dailySymbolOrderIndex } from "@/lib/data/daily-asset-order";
import { formatBeijingDateZh } from "@/lib/calendar/beijing-date";

type AssetFilter = "ALL" | "BTC" | "SPX" | "NDX" | "SSEC" | "HSTECH" | "GLD" | "WTI";
type RangeFilter = "ALL" | "7D" | "30D";
type VerdictFilter = "ALL" | "HIT" | "MISS";

function formatPct(n: number | null): string {
  if (n == null) return "暂无足够样本";
  return `${(n * 100).toFixed(1)}%`;
}

const MIN_PUBLIC_SAMPLE = 10;

function verdictColor(v: DailyVerdict): string {
  if (v === "HIT") return "text-emerald-500";
  if (v === "MISS") return "text-red-500";
  return "text-foreground-tertiary";
}

function inRange(date: string, range: RangeFilter): boolean {
  if (range === "ALL") return true;
  const days = range === "7D" ? 7 : 30;
  const t = new Date(`${date}T12:00:00Z`).getTime();
  return t >= Date.now() - days * 24 * 60 * 60 * 1000;
}

export function DailyAccuracyClient({
  items,
  stats,
}: {
  items: PublicAccuracyHistoryItem[];
  stats: DailyAccuracyStats;
}) {
  const [asset, setAsset] = useState<AssetFilter>("ALL");
  const [range, setRange] = useState<RangeFilter>("ALL");
  const [verdict, setVerdict] = useState<VerdictFilter>("ALL");

  const displayStats = useMemo(() => {
    const live = computePublicAccuracyStats(items);
    return live.verifiedCount > 0 ? live : stats;
  }, [items, stats]);

  const rows = useMemo(() => {
    return items
      .filter((f) => (asset === "ALL" ? true : f.symbol === asset))
      .filter((f) => inRange(f.forecastDate, range))
      .filter((f) => (verdict === "ALL" ? true : f.verdict === verdict))
      .sort((a, b) => {
        const dateCmp = b.forecastDate.localeCompare(a.forecastDate);
        if (dateCmp !== 0) return dateCmp;
        return dailySymbolOrderIndex(a.symbol) - dailySymbolOrderIndex(b.symbol);
      });
  }, [items, asset, range, verdict]);

  const sampleCount = displayStats.hitCount + displayStats.missCount;
  const sampleSmall = sampleCount > 0 && sampleCount < MIN_PUBLIC_SAMPLE;
  const hasCountable = sampleCount >= MIN_PUBLIC_SAMPLE;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Heading as="h1" size="h2">
          历史准确率
        </Heading>
        <Text variant="body" color="secondary" className="mt-3 max-w-3xl">
          仅统计已经完成市场验证的历史预测；今日和未来预测不会在此提前公开。
        </Text>
        <div className="mt-3 flex flex-wrap gap-4">
          <Link href="/pricing" className="text-body-sm text-primary underline-offset-4 hover:underline">
            会员价格
          </Link>
        </div>
      </div>

      {sampleSmall ? (
        <Card padding="md" className="mb-4 border-amber-500/30 bg-amber-500/5">
          <Text variant="body-sm" color="secondary">
            当前有效样本较少，统计结果仅供阶段性参考。
          </Text>
        </Card>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "已验证预测数", value: String(displayStats.verifiedCount) },
          { label: "命中数", value: String(displayStats.hitCount) },
          { label: "部分命中数", value: "0" },
          {
            label: "历史命中率",
            value: hasCountable ? formatPct(displayStats.hitRate) : "样本不足",
          },
          {
            label: "最近30天命中率",
            value: hasCountable ? formatPct(displayStats.hitRate30d) : "样本不足",
          },
        ].map((t) => (
          <Card key={t.label} padding="md">
            <Text variant="caption" color="tertiary">
              {t.label}
            </Text>
            <Text variant="body" weight="semibold" className="mt-1 whitespace-pre-line">
              {t.value}
            </Text>
          </Card>
        ))}
      </div>

      {items.length === 0 && (
        <Card padding="lg" className="mb-8">
          <Text variant="body" weight="semibold">
            暂无已完成验证的历史预测
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            今日与未来预测不会在此展示。完成市场验证后，记录将于次日进入历史准确率。
          </Text>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["ALL", "全部资产"],
              ["BTC", "比特币"],
              ["SPX", "标普500"],
              ["NDX", "纳斯达克100"],
              ["SSEC", "上证指数"],
              ["HSTECH", "恒生科技指数"],
              ["GLD", "黄金ETF"],
              ["WTI", "WTI原油"],
            ] as const
          ).map(([k, label]) => (
            <Button key={k} size="sm" variant={asset === k ? "primary" : "outline"} onClick={() => setAsset(k)}>
              {label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["ALL", "全部历史"],
              ["7D", "最近7日"],
              ["30D", "最近30日"],
            ] as const
          ).map(([k, label]) => (
            <Button key={k} size="sm" variant={range === k ? "primary" : "outline"} onClick={() => setRange(k)}>
              {label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["ALL", "全部结果"],
              ["HIT", "命中"],
              ["MISS", "未命中"],
            ] as const
          ).map(([k, label]) => (
            <Button key={k} size="sm" variant={verdict === k ? "primary" : "outline"} onClick={() => setVerdict(k)}>
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((item) => (
          <Card key={item.forecastId} padding="md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Text variant="body" weight="semibold">
                  {item.assetName} {item.symbol}
                </Text>
                <Text variant="body-sm" color="secondary" className="mt-1">
                  预测日期：{formatBeijingDateZh(item.forecastDate)}
                </Text>
                <Text variant="body-sm" color="secondary" className="mt-1">
                  预测：{item.predictedDirection}
                </Text>
                <Text variant="body-sm" color="secondary" className="mt-1 block">
                  实际结果：{item.actualDirection}
                </Text>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={verdictColor(item.verdict)}>
                  {item.verdictLabel}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
        {items.length > 0 && !rows.length && (
          <Text variant="body-sm" color="secondary">
            当前筛选条件下没有记录。
          </Text>
        )}
      </div>
    </div>
  );
}
