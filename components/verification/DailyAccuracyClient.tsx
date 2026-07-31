"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import type { DailyAccuracyStats, DailyVerdict } from "@/types/daily-accuracy";
import type { PublicAccuracyHistoryItem } from "@/lib/accuracy/public-history-filter";
import { computePublicAccuracyStats, publicStarAccuracyBreakdown } from "@/lib/accuracy/public-history-filter";
import { dailySymbolOrderIndex } from "@/lib/data/daily-asset-order";
import { formatBeijingDateZh } from "@/lib/calendar/beijing-date";
import { starsText } from "@/lib/forecasts/consensus-confidence";

type AssetFilter = "ALL" | "BTC" | "SPX" | "NDX" | "SSEC" | "HSTECH" | "GLD" | "WTI";
type RangeFilter = "ALL" | "7D" | "30D";
type VerdictFilter = "ALL" | "FULL_HIT" | "PARTIAL_HIT" | "MISS" | "UNVERIFIABLE";

function formatPct(n: number | null | undefined): string {
  if (n == null) return "暂无足够样本";
  return `${(n * 100).toFixed(1)}%`;
}

function formatPrice(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 4 }).format(n);
}

function normalizedVerdict(v: DailyVerdict): VerdictFilter {
  if (v === "HIT") return "FULL_HIT";
  if (v === "FULL_HIT" || v === "PARTIAL_HIT" || v === "MISS" || v === "UNVERIFIABLE") return v;
  return "UNVERIFIABLE";
}

function verdictClass(v: DailyVerdict): string {
  const n = normalizedVerdict(v);
  if (n === "FULL_HIT") return "border-emerald-500/30 text-emerald-500";
  if (n === "PARTIAL_HIT") return "border-amber-500/30 text-amber-500";
  if (n === "MISS") return "border-red-500/30 text-red-500";
  return "text-foreground-tertiary";
}

function displayVerdictLabel(item: PublicAccuracyHistoryItem): string {
  if (
    normalizedVerdict(item.verdict) === "UNVERIFIABLE" &&
    Boolean(item.predictedPattern) &&
    Boolean(item.actualPattern) &&
    item.predictedPattern === item.actualPattern
  ) {
    return "方向一致";
  }
  return item.verdictLabel;
}

function displayValidationExplanation(item: PublicAccuracyHistoryItem): string {
  if (
    normalizedVerdict(item.verdict) === "UNVERIFIABLE" &&
    Boolean(item.predictedPattern) &&
    Boolean(item.actualPattern) &&
    item.predictedPattern === item.actualPattern
  ) {
    return "方向表现一致；路径数据不足，暂不计入完整路径命中率。";
  }
  return item.validationExplanation ?? item.pathVerdictLabel ?? "该记录尚未保存完整路径说明。";
}

function inRange(date: string, range: RangeFilter): boolean {
  if (range === "ALL") return true;
  const days = range === "7D" ? 7 : 30;
  const t = new Date(`${date}T12:00:00Z`).getTime();
  return t >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function ScoreRow({ item }: { item: PublicAccuracyHistoryItem }) {
  if (item.patternScore == null && item.pathScore == null) return null;
  const pathSubtotal = (item.patternScore ?? 0) + (item.pathScore ?? 0);
  const hasTechnicalScore = item.zoneScore != null || item.conditionScore != null;
  return (
    <div className="mt-3 rounded-md border border-border/[0.08] bg-muted/10 p-3 text-body-sm">
      <div className={`grid gap-2 ${hasTechnicalScore ? "sm:grid-cols-5" : "sm:grid-cols-3"}`}>
        <div><span className="text-foreground-tertiary">走势类型</span><br />{item.patternScore ?? 0}/40</div>
        <div><span className="text-foreground-tertiary">运行路径</span><br />{item.pathScore ?? 0}/25</div>
        {hasTechnicalScore ? (
          <>
            <div><span className="text-foreground-tertiary">支撑压力</span><br />{item.zoneScore ?? "—"}/20</div>
            <div><span className="text-foreground-tertiary">确认失效</span><br />{item.conditionScore ?? "—"}/15</div>
            <div><span className="text-foreground-tertiary">总分</span><br />{item.totalScore ?? "—"}/100</div>
          </>
        ) : (
          <div><span className="text-foreground-tertiary">已验证小计</span><br />{pathSubtotal}/65</div>
        )}
      </div>
      {!hasTechnicalScore ? (
        <Text variant="caption" color="tertiary" className="mt-2 block">
          技术条件尚未完成独立验证，本条仅展示已完成的验证项目。
        </Text>
      ) : null}
    </div>
  );
}

function parseFirstZone(texts?: string[]): [number, number] | null {
  const text = texts?.[0];
  if (!text) return null;
  const nums = [...text.replace(/,/g, "").matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  if (nums.length < 2 || !nums.slice(0, 2).every(Number.isFinite)) return null;
  return [Math.min(nums[0]!, nums[1]!), Math.max(nums[0]!, nums[1]!)];
}

function IntradayPathChart({ item }: { item: PublicAccuracyHistoryItem }) {
  const points = item.intradayPath?.filter((p) => Number.isFinite(p.close)) ?? [];
  if (points.length < 4) return null;

  const support = parseFirstZone(item.supportLevels);
  const resistance = parseFirstZone(item.resistanceLevels);
  const prices = points.map((p) => p.close);
  if (support) prices.push(...support);
  if (resistance) prices.push(...resistance);
  let min = Math.min(...prices);
  let max = Math.max(...prices);
  const pad = Math.max((max - min) * 0.08, Math.abs(max || 1) * 0.001);
  min -= pad;
  max += pad;

  const width = 720;
  const height = 190;
  const left = 50;
  const right = 12;
  const top = 12;
  const bottom = 32;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const x = (i: number) => left + (i / Math.max(1, points.length - 1)) * plotW;
  const y = (price: number) => top + ((max - price) / Math.max(max - min, 1e-9)) * plotH;
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.close).toFixed(1)}`).join(" ");

  const zoneRect = (zone: [number, number] | null, className: string) => {
    if (!zone) return null;
    const yTop = y(zone[1]);
    const yBottom = y(zone[0]);
    return (
      <rect
        x={left}
        y={yTop}
        width={plotW}
        height={Math.max(2, yBottom - yTop)}
        className={className}
        fill="currentColor"
        opacity="0.1"
      />
    );
  };

  return (
    <div className="mt-3 rounded-md border border-border/[0.08] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Text variant="caption" color="tertiary">【15分钟实际路径】</Text>
        <Text variant="caption" color="tertiary">
          {points[0]!.time.slice(-5)}—{points.at(-1)!.time.slice(-5)}
        </Text>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`${item.assetName}盘中实际路径`}>
        <line x1={left} y1={top} x2={left} y2={height - bottom} className="text-border" stroke="currentColor" opacity="0.6" />
        <line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} className="text-border" stroke="currentColor" opacity="0.6" />
        {zoneRect(support, "text-emerald-500")}
        {zoneRect(resistance, "text-amber-500")}
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary" vectorEffect="non-scaling-stroke" />
        <circle cx={x(0)} cy={y(points[0]!.close)} r="3" fill="currentColor" className="text-foreground" />
        <circle cx={x(points.length - 1)} cy={y(points.at(-1)!.close)} r="3" fill="currentColor" className="text-primary" />
        <text x="4" y={top + 4} className="fill-foreground-tertiary text-[10px]">{formatPrice(max)}</text>
        <text x="4" y={height - bottom} className="fill-foreground-tertiary text-[10px]">{formatPrice(min)}</text>
        <text x={left} y={height - 8} className="fill-foreground-tertiary text-[10px]">开盘阶段</text>
        <text x={width - right} y={height - 8} textAnchor="end" className="fill-foreground-tertiary text-[10px]">收盘阶段</text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-caption text-foreground-tertiary">
        {support ? <span>绿色带：发布时锁定的第一支撑区</span> : null}
        {resistance ? <span>黄色带：发布时锁定的第一压力区</span> : null}
      </div>
    </div>
  );
}

function HistoryCard({ item }: { item: PublicAccuracyHistoryItem }) {
  const legacy = item.validationMode === "LEGACY_DIRECTION_ONLY";
  return (
    <Card padding="md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Text variant="body" weight="semibold">
            {item.assetName} <span className="font-mono text-foreground-tertiary">{item.symbol}</span>
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-1">
            预测日期：{formatBeijingDateZh(item.forecastDate)} · V{item.version}
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {legacy ? <Badge variant="outline">早期记录仅方向验证</Badge> : null}
          {item.consensusStars ? (
            <Badge variant="outline" className="border-primary/30 text-primary">
              {starsText(item.consensusStars)}
            </Badge>
          ) : null}
          <Badge variant="outline" className={verdictClass(item.verdict)}>
            {displayVerdictLabel(item)}
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-border/[0.08] p-3">
          <Text variant="caption" color="tertiary">【原始预测】</Text>
          <dl className="mt-2 grid gap-2 text-body-sm">
            <div><dt className="text-foreground-tertiary">预测走势</dt><dd className="font-medium">{item.predictedPattern}</dd></div>
            {item.expectedPath?.length ? <div><dt className="text-foreground-tertiary">预测路径</dt><dd>{item.expectedPath.join(" → ")}</dd></div> : null}
            {item.summary ? <div><dt className="text-foreground-tertiary">原始摘要</dt><dd>{item.summary}</dd></div> : null}
            {item.supportLevels?.length ? <div><dt className="text-foreground-tertiary">支撑区间</dt><dd>{item.supportLevels.join("；")}</dd></div> : null}
            {item.resistanceLevels?.length ? <div><dt className="text-foreground-tertiary">压力区间</dt><dd>{item.resistanceLevels.join("；")}</dd></div> : null}
            {item.confirmation ? <div><dt className="text-foreground-tertiary">确认条件</dt><dd>{item.confirmation}</dd></div> : null}
            {item.invalidation ? <div><dt className="text-foreground-tertiary">失效条件</dt><dd>{item.invalidation}</dd></div> : null}
          </dl>
        </div>

        <div className="rounded-md border border-border/[0.08] p-3">
          <Text variant="caption" color="tertiary">【实际走势】</Text>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-body-sm">
            <div><dt className="text-foreground-tertiary">实际走势</dt><dd className="font-medium">{item.actualPattern}</dd></div>
            <div><dt className="text-foreground-tertiary">实际涨跌</dt><dd>{item.actualReturnPct == null ? "—" : `${item.actualReturnPct >= 0 ? "+" : ""}${item.actualReturnPct.toFixed(2)}%`}</dd></div>
            <div><dt className="text-foreground-tertiary">前收</dt><dd>{formatPrice(item.previousClose)}</dd></div>
            <div><dt className="text-foreground-tertiary">开盘</dt><dd>{formatPrice(item.actualOpen)}</dd></div>
            <div><dt className="text-foreground-tertiary">最高</dt><dd>{formatPrice(item.actualHigh)}</dd></div>
            <div><dt className="text-foreground-tertiary">最低</dt><dd>{formatPrice(item.actualLow)}</dd></div>
            <div><dt className="text-foreground-tertiary">收盘</dt><dd>{formatPrice(item.actualClose)}</dd></div>
            <div><dt className="text-foreground-tertiary">验证周期</dt><dd>{item.timingVerdict ?? (legacy ? "日线方向" : "15分钟K线")}</dd></div>
            {item.mainLowTime ? <div className="col-span-2"><dt className="text-foreground-tertiary">主要低位时间</dt><dd>{item.mainLowTime}</dd></div> : null}
            {item.mainHighTime ? <div className="col-span-2"><dt className="text-foreground-tertiary">主要高位时间</dt><dd>{item.mainHighTime}</dd></div> : null}
          </dl>
        </div>
      </div>

      <IntradayPathChart item={item} />

      <div className="mt-3 rounded-md border border-border/[0.08] bg-muted/10 p-3">
        <Text variant="caption" color="tertiary">【验证说明】</Text>
        <Text variant="body-sm" color="secondary" className="mt-2">
          {displayValidationExplanation(item)}
        </Text>
      </div>
      <ScoreRow item={item} />
    </Card>
  );
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
    return live.totalForecasts > 0 ? live : stats;
  }, [items, stats]);

  const sampleReady = displayStats.verifiedCount >= 30;
  const starBuckets = useMemo(() => publicStarAccuracyBreakdown(items), [items]);
  const ratedSampleCount = starBuckets.reduce((sum, bucket) => sum + bucket.sampleCount, 0);

  const rows = useMemo(() => {
    return items
      .filter((f) => {
        if (asset === "ALL") return true;
        if (asset === "GLD") return f.symbol === "GLD" || f.symbol === "GOLD" || f.symbol === "GC=F";
        return f.symbol === asset;
      })
      .filter((f) => inRange(f.forecastDate, range))
      .filter((f) => (verdict === "ALL" ? true : normalizedVerdict(f.verdict) === verdict))
      .sort((a, b) => {
        const dateCmp = b.forecastDate.localeCompare(a.forecastDate);
        if (dateCmp !== 0) return dateCmp;
        return dailySymbolOrderIndex(a.symbol) - dailySymbolOrderIndex(b.symbol);
      });
  }, [items, asset, range, verdict]);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Heading as="h1" size="h2">历史准确率</Heading>
        <Text variant="body" color="secondary" className="mt-3 max-w-3xl">
          验证完整预测语义：上涨、下跌、震荡、震荡上涨、震荡下跌、先涨后跌、先跌后涨、冲高回落和探底回升。路径型观点优先使用15分钟K线验证，不再只看收盘红绿。
        </Text>
        <Text variant="body-sm" color="tertiary" className="mt-2 max-w-3xl">
          加权命中率＝（完全命中＋部分命中×0.5）÷有效验证数；无法验证不进入分母。早期只保存涨跌方向的记录会单独标记，不进入完整路径命中率。
        </Text>
        <div className="mt-3"><Link href="/pricing" className="text-body-sm text-primary underline-offset-4 hover:underline">会员价格</Link></div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {[
          { label: "有效验证数", value: String(displayStats.verifiedCount) },
          { label: "完全命中", value: String(displayStats.fullHitCount ?? displayStats.hitCount) },
          { label: "部分命中", value: String(displayStats.partialHitCount ?? 0) },
          { label: "未命中", value: String(displayStats.missCount) },
          { label: "无法验证", value: String(displayStats.unverifiableCount ?? 0) },
          { label: "加权命中率", value: sampleReady ? formatPct(displayStats.weightedHitRate ?? displayStats.hitRate) : "样本积累中" },
          { label: "完整路径命中率", value: sampleReady ? formatPct(displayStats.pathHitRate) : "样本积累中" },
          { label: "方向命中率", value: sampleReady ? formatPct(displayStats.directionHitRate) : "样本积累中" },
        ].map((t) => (
          <Card key={t.label} padding="md">
            <Text variant="caption" color="tertiary">{t.label}</Text>
            <Text variant="body" weight="semibold" className="mt-1 whitespace-pre-line">{t.value}</Text>
          </Card>
        ))}
      </div>

      {!sampleReady && displayStats.verifiedCount > 0 ? (
        <Text variant="body-sm" color="tertiary" className="mb-6 block">
          当前有效样本为 {displayStats.verifiedCount} 条；累计满30条后再展示稳定命中率。
        </Text>
      ) : null}

      <div className="mb-8">
        <div className="mb-3">
          <Heading as="h2" size="h3">按共识星级验证</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1">
            星级在预测发布时锁定。仅统计带星级的新基准记录；旧记录不会倒推星级。
          </Text>
        </div>
        {ratedSampleCount > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {starBuckets.map((bucket) => (
              <Card key={bucket.stars} padding="md">
                <Text variant="body" weight="semibold" className="text-primary">
                  {starsText(bucket.stars)}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-2 block">有效样本</Text>
                <Text variant="body" weight="semibold">{bucket.sampleCount}</Text>
                <Text variant="caption" color="tertiary" className="mt-2 block">加权命中率</Text>
                <Text variant="body-sm" weight="semibold">
                  {bucket.sampleCount >= 10 ? formatPct(bucket.weightedHitRate) : "样本积累中"}
                </Text>
              </Card>
            ))}
          </div>
        ) : (
          <Card padding="md">
            <Text variant="body-sm" color="secondary">
              星级验证从新基准预测开始累计。
            </Text>
          </Card>
        )}
      </div>

      {items.length === 0 ? (
        <Card padding="lg" className="mb-8">
          <Text variant="body" weight="semibold">暂无已完成验证的历史预测</Text>
          <Text variant="body-sm" color="secondary" className="mt-2">今日与未来预测不会在此展示。</Text>
        </Card>
      ) : null}

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {([
            ["ALL", "全部资产"], ["BTC", "比特币"], ["SPX", "标普500"], ["NDX", "纳斯达克100"],
            ["SSEC", "上证指数"], ["HSTECH", "恒生科技指数"], ["GLD", "国际金价"], ["WTI", "WTI原油"],
          ] as const).map(([k, label]) => (
            <Button key={k} size="sm" variant={asset === k ? "primary" : "outline"} onClick={() => setAsset(k)}>{label}</Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {([ ["ALL", "全部历史"], ["7D", "最近7日"], ["30D", "最近30日"] ] as const).map(([k, label]) => (
            <Button key={k} size="sm" variant={range === k ? "primary" : "outline"} onClick={() => setRange(k)}>{label}</Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {([ ["ALL", "全部结果"], ["FULL_HIT", "完全命中"], ["PARTIAL_HIT", "部分命中"], ["MISS", "未命中"], ["UNVERIFIABLE", "无法验证"] ] as const).map(([k, label]) => (
            <Button key={k} size="sm" variant={verdict === k ? "primary" : "outline"} onClick={() => setVerdict(k)}>{label}</Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((item) => <HistoryCard key={item.forecastId} item={item} />)}
        {items.length > 0 && !rows.length ? <Text variant="body-sm" color="secondary">当前筛选条件下没有记录。</Text> : null}
      </div>
    </div>
  );
}
