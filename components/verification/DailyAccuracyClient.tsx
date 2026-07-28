"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import type {
  DailyAccuracyStats,
  DailyForecastRecord,
  DailyVerificationResult,
  DailyVerdict,
} from "@/types/daily-accuracy";
import {
  assetAccuracyBreakdown,
  confidenceAccuracyBreakdown,
  sourceAccuracyBreakdown,
} from "@/lib/automation/daily-summary";
import { dailySymbolOrderIndex } from "@/lib/data/daily-asset-order";
import { formatDateTimeChina } from "@/lib/utils/datetime";
import { computeVerificationDashboardStats } from "@/lib/verification/daily-rules";

type AssetFilter = "ALL" | "BTC" | "SPX" | "NDX" | "SSEC" | "HSTECH" | "GLD" | "WTI";
type RangeFilter = "ALL" | "7D" | "30D";
type VerdictFilter = "ALL" | DailyVerdict | "PENDING";

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

function verdictColor(v: DailyVerdict | "PENDING"): string {
  if (v === "HIT") return "text-emerald-500";
  if (v === "MISS") return "text-red-500";
  if (v === "VOID") return "text-amber-500";
  if (v === "MANUAL_REVIEW") return "text-amber-500";
  return "text-foreground-tertiary";
}

function inRange(date: string, range: RangeFilter): boolean {
  if (range === "ALL") return true;
  const days = range === "7D" ? 7 : 30;
  const t = new Date(`${date}T12:00:00Z`).getTime();
  return t >= Date.now() - days * 24 * 60 * 60 * 1000;
}

export function DailyAccuracyClient({
  forecasts,
  results,
  stats,
}: {
  forecasts: DailyForecastRecord[];
  results: DailyVerificationResult[];
  stats: DailyAccuracyStats;
}) {
  const [asset, setAsset] = useState<AssetFilter>("ALL");
  const [range, setRange] = useState<RangeFilter>("ALL");
  const [verdict, setVerdict] = useState<VerdictFilter>("ALL");
  const [openId, setOpenId] = useState<string | null>(null);

  const resultById = useMemo(() => new Map(results.map((r) => [r.forecastId, r])), [results]);
  const liveStats = useMemo(
    () => computeVerificationDashboardStats(forecasts, results),
    [forecasts, results]
  );
  const displayStats = liveStats.totalForecasts > 0 ? liveStats : stats;
  const byAsset = useMemo(() => assetAccuracyBreakdown(results), [results]);
  const bySource = useMemo(() => sourceAccuracyBreakdown(forecasts, results), [forecasts, results]);
  const byConfidence = useMemo(() => confidenceAccuracyBreakdown(forecasts, results), [forecasts, results]);

  const rows = useMemo(() => {
    const published = forecasts.filter(
      (f) =>
        f.status === "published" ||
        f.status === "verifying" ||
        f.status === "verified" ||
        f.status === "invalid"
    );
    return published
      .filter((f) => (asset === "ALL" ? true : f.symbol === asset || (asset === "BTC" && f.symbol === "BTC")))
      .filter((f) => inRange(f.forecastDate, range))
      .map((f) => {
        const r = resultById.get(f.id);
        const v: DailyVerdict | "PENDING" = r?.verdict ?? "PENDING";
        return { forecast: f, result: r, v };
      })
      .filter((row) => {
        if (verdict === "ALL") return true;
        if (verdict === "PENDING") return row.v === "PENDING";
        return row.v === verdict;
      })
      .sort((a, b) => {
        const dateCmp = b.forecast.forecastDate.localeCompare(a.forecast.forecastDate);
        if (dateCmp !== 0) return dateCmp;
        return dailySymbolOrderIndex(a.forecast.symbol) - dailySymbolOrderIndex(b.forecast.symbol);
      });
  }, [forecasts, resultById, asset, range, verdict]);

  const hasCountable = displayStats.verifiedCount > 0;
  const pendingInView = rows.filter((r) => r.v === "PENDING").length;

  return (
    <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Heading as="h1" size="h2">
          每日预测准确率
        </Heading>
        <Text variant="body" color="secondary" className="mt-3 max-w-3xl">
          每条日度预测在交易结束后使用真实收盘数据自动验证。只统计预测开始前已经正式发布的方向判断。
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

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "待验证",
            value: String(
              asset === "ALL" && range === "ALL" && verdict === "ALL"
                ? displayStats.pendingCount
                : pendingInView
            ),
          },
          {
            label: "不计入统计",
            value: `${displayStats.voidCount}条${
              displayStats.invalidCount > 0 ? `\n其中超时发布：${displayStats.invalidCount}条` : ""
            }`,
          },
          { label: "人工复核", value: String(displayStats.manualReviewCount) },
        ].map((t) => (
          <Card key={t.label} padding="md">
            <Text variant="caption" color="tertiary">
              {t.label}
            </Text>
            <Text variant="body-sm" weight="semibold" className="mt-1 whitespace-pre-line">
              {t.value}
            </Text>
          </Card>
        ))}
      </div>

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

      {!hasCountable && rows.every((r) => r.v === "PENDING") && (
        <Card padding="lg" className="mb-8">
          <Text variant="body" weight="semibold">
            暂无已完成的每日预测验证
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-2">
            从下一条正式发布的每日预测开始，系统将在对应交易日结束后自动记录真实结果。
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
              ["PENDING", "待验证"],
              ["VOID", "不计入统计"],
              ["MANUAL_REVIEW", "人工复核"],
            ] as const
          ).map(([k, label]) => (
            <Button key={k} size="sm" variant={verdict === k ? "primary" : "outline"} onClick={() => setVerdict(k)}>
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map(({ forecast: f, result: r, v }) => (
          <Card key={f.id} padding="md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Text variant="body" weight="semibold">
                  {f.forecastDate} · {f.assetName}
                </Text>
                <Text variant="body-sm" color="secondary" className="mt-1">
                  预测：{f.directionLabel}
                  {r
                    ? r.verdict === "VOID" || r.verdict === "MANUAL_REVIEW"
                      ? r.actualClose
                        ? ` · 实际：${formatReturn(r.actualReturnPct)} · 收盘：${r.actualClose.toLocaleString("zh-CN")}`
                        : r.errorMessage
                          ? ` · ${r.errorMessage}`
                          : ""
                      : ` · 实际：${formatReturn(r.actualReturnPct)} · 收盘：${r.actualClose.toLocaleString("zh-CN")}`
                    : " · 待验证"}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  发布时间：{formatDateTimeChina(f.publishedAt)}
                  {f.isSystemTest ? " · 系统测试" : ""}
                </Text>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={verdictColor(v)}>
                  {v === "PENDING" ? "待验证" : r?.verdictLabel ?? v}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => setOpenId(openId === f.id ? null : f.id)}>
                  详情
                </Button>
              </div>
            </div>

            {openId === f.id && (
              <div className="mt-4 space-y-1 border-t border-border/[0.08] pt-3 text-body-sm text-foreground-secondary">
                <p>预测日期：{f.forecastDate}</p>
                <p>
                  预测资产：{f.assetName}（{f.symbol}）
                </p>
                <p>发布时原始方向：{f.directionLabel}</p>
                <p>预测概率：{f.probability != null ? `${f.probability}%` : "—"}</p>
                <p>原始摘要：{f.summary || "—"}</p>
                <p>来源：{f.source}</p>
                <p>发布时间：{formatDateTimeChina(f.publishedAt)}</p>
                <p>截止时间：{formatDateTimeChina(f.cutoffAt)}</p>
                {f.status === "invalid" && <p className="text-amber-500">暂无判断／无效记录，不计入准确率。</p>}
                {r && (
                  <>
                    <p>上一交易日收盘价：{r.previousClose || "—"}</p>
                    <p>当日开盘价：{r.actualOpen ?? "—"}</p>
                    <p>当日最高价：{r.actualHigh ?? "—"}</p>
                    <p>当日最低价：{r.actualLow ?? "—"}</p>
                    <p>当日收盘价：{r.actualClose || "—"}</p>
                    <p>实际涨跌幅：{r.actualClose ? formatReturn(r.actualReturnPct) : "—"}</p>
                    <p>实际方向：{r.actualDirection}</p>
                    <p>方向结果：{r.directionVerdict ?? r.verdictLabel}</p>
                    <p>路径结果：{r.pathVerdictLabel ?? "数据不足，待人工确认"}</p>
                    <p>时间结果：{r.timingVerdict ?? "未单独验证"}</p>
                    <p>目标价结果：{r.priceTargetVerdict ?? "未单独验证"}</p>
                    <p>最终方向验证：{r.verdictLabel}</p>
                    <p>行情来源：{r.dataSource}</p>
                    <p>验证时间：{new Date(r.verifiedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</p>
                    {r.errorMessage && <p>说明：{r.errorMessage}</p>}
                  </>
                )}
                <p className="pt-2 text-caption text-foreground-tertiary">
                  验证使用发布时锁定的原始预测，后续修改不覆盖历史版本。
                </p>
              </div>
            )}
          </Card>
        ))}
        {!rows.length && (
          <Text variant="body-sm" color="secondary">
            当前筛选条件下没有记录。
          </Text>
        )}
      </div>
    </div>
  );
}
