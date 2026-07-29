"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import type { DailyAccuracyStats, DailyVerdict } from "@/types/daily-accuracy";
import type { PublicAccuracyHistoryItem } from "@/lib/accuracy/public-history-filter";
import {
  computePublicAccuracyStats,
  publicAssetAccuracyBreakdown,
  publicConfidenceAccuracyBreakdown,
  publicSourceAccuracyBreakdown,
} from "@/lib/accuracy/public-history-filter";
import { dailySymbolOrderIndex } from "@/lib/data/daily-asset-order";
import { formatBeijingDateZh } from "@/lib/calendar/beijing-date";

type AssetFilter = "ALL" | "BTC" | "SPX" | "NDX" | "SSEC" | "HSTECH" | "GLD" | "WTI";
type RangeFilter = "ALL" | "7D" | "30D";
type VerdictFilter = "ALL" | "HIT" | "MISS" | "VOID";

function formatPct(n: number | null): string {
  if (n == null) return "暂无足够样本";
  return `${(n * 100).toFixed(1)}%`;
}

const MIN_SAMPLE = 5;

function formatAssetSample(hit: number, miss: number, hitRate: number | null): string {
  const total = hit + miss;
  if (total === 0) return "暂无足够样本";
  if (total < MIN_SAMPLE) return `${hit}/${total}命中\n样本较少`;
  return `命中率：${formatPct(hitRate)}\n${hit}/${total}命中`;
}

function formatReturn(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function verdictColor(v: DailyVerdict): string {
  if (v === "HIT") return "text-emerald-500";
  if (v === "MISS") return "text-red-500";
  if (v === "VOID") return "text-amber-500";
  return "text-foreground-tertiary";
}

function inRange(date: string, range: RangeFilter): boolean {
  if (range === "ALL") return true;
  const days = range === "7D" ? 7 : 30;
  const t = new Date(`${date}T12:00:00Z`).getTime();
  return t >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function formatVerifiedAtChina(iso: string): string {
  return `${new Date(iso).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}（北京时间）`;
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
  const [openId, setOpenId] = useState<string | null>(null);

  const displayStats = useMemo(() => {
    const live = computePublicAccuracyStats(items);
    return live.verifiedCount > 0 || live.voidCount > 0 ? live : stats;
  }, [items, stats]);

  const byAsset = useMemo(() => publicAssetAccuracyBreakdown(items), [items]);
  const bySource = useMemo(() => publicSourceAccuracyBreakdown(items), [items]);
  const byConfidence = useMemo(() => publicConfidenceAccuracyBreakdown(items), [items]);

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

  const hasCountable = displayStats.verifiedCount > 0;

  return (
    <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
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

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "有效验证", value: String(displayStats.verifiedCount) },
          { label: "命中", value: String(displayStats.hitCount) },
          { label: "未命中", value: String(displayStats.missCount) },
          {
            label: "总命中率",
            value: hasCountable
              ? `${formatPct(displayStats.hitRate)}（有效样本 ${displayStats.verifiedCount}）`
              : "暂无足够样本",
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

      {displayStats.voidCount > 0 && (
        <div className="mb-8 grid gap-3 sm:grid-cols-1">
          <Card padding="md">
            <Text variant="caption" color="tertiary">
              不计入统计
            </Text>
            <Text variant="body-sm" weight="semibold" className="mt-1">
              {displayStats.voidCount}条
            </Text>
          </Card>
        </div>
      )}

      <div className="mb-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {byAsset.map((a) => (
          <Card key={a.symbol} padding="md" className="min-w-0">
            <Text variant="caption" color="tertiary" className="block break-words">
              {a.label}
            </Text>
            <Text variant="body" weight="semibold" className="mt-1 whitespace-pre-line break-words">
              {formatAssetSample(a.hit, a.miss, a.hitRate)}
            </Text>
          </Card>
        ))}
      </div>

      <div className="mb-8 grid gap-3 lg:grid-cols-2">
        <Card padding="md">
          <Text variant="body-sm" weight="semibold" className="mb-2">
            按来源
          </Text>
          {bySource.length === 0 ? (
            <Text variant="caption" color="tertiary">
              暂无足够样本
            </Text>
          ) : (
            bySource.map((s) => (
              <Text key={s.source} variant="caption" color="tertiary" className="block">
                {s.source}：{formatPct(s.hitRate)}（{s.hit}/{s.hit + s.miss}）
              </Text>
            ))
          )}
        </Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <Text variant="body-sm" weight="semibold" className="sm:col-span-2">
            按置信度
          </Text>
          {byConfidence.map((b) => (
            <Card key={b.bucket} padding="md">
              <Text variant="caption" color="tertiary" className="block">
                {b.bucket}
              </Text>
              <Text variant="body-sm" weight="semibold" className="mt-1">
                {b.hit + b.miss === 0
                  ? "暂无足够样本"
                  : `${formatPct(b.hitRate)}（${b.hit}/${b.hit + b.miss}）`}
              </Text>
            </Card>
          ))}
        </div>
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
              ["VOID", "不计入统计"],
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
                  预测方向：{item.predictedDirection}
                  {item.actualReturnPct != null
                    ? ` · 实际走势：${item.actualDirection}（${formatReturn(item.actualReturnPct)}）`
                    : item.actualDirection
                      ? ` · 实际走势：${item.actualDirection}`
                      : ""}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  验证时间：{formatVerifiedAtChina(item.verifiedAt)} · 版本 v{item.version}
                </Text>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={verdictColor(item.verdict)}>
                  {item.verdictLabel}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenId(openId === item.forecastId ? null : item.forecastId)}
                >
                  详情
                </Button>
              </div>
            </div>

            {openId === item.forecastId && (
              <div className="mt-4 space-y-1 border-t border-border/[0.08] pt-3 text-body-sm text-foreground-secondary">
                <p>预测日期：{formatBeijingDateZh(item.forecastDate)}</p>
                <p>
                  预测资产：{item.assetName}（{item.symbol}）
                </p>
                <p>当时预测：{item.predictedDirection}</p>
                <p>实际结果：{item.actualDirection}</p>
                <p>验证结论：{item.verdictLabel}</p>
                <p>验证时间：{formatVerifiedAtChina(item.verifiedAt)}</p>
                <p>预测版本：v{item.version}</p>
                <p>预测概率：{item.probability != null ? `${item.probability}%` : "—"}</p>
                <p>原始摘要：{item.summary || "—"}</p>
                <p>来源：{item.source}</p>
                {item.actualClose != null && <p>当日收盘价：{item.actualClose.toLocaleString("zh-CN")}</p>}
                {item.actualReturnPct != null && <p>实际涨跌幅：{formatReturn(item.actualReturnPct)}</p>}
                <p>路径结果：{item.pathVerdictLabel ?? "数据不足，待人工确认"}</p>
                <p>时间结果：{item.timingVerdict ?? "未单独验证"}</p>
                <p>目标价结果：{item.priceTargetVerdict ?? "未单独验证"}</p>
                {item.dataSource && <p>行情来源：{item.dataSource}</p>}
                {item.errorMessage && <p>说明：{item.errorMessage}</p>}
                <p className="pt-2 text-caption text-foreground-tertiary">
                  验证使用发布时锁定的原始预测，后续修改不覆盖历史版本。
                </p>
              </div>
            )}
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
