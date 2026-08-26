"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { assetNameEn, directionEn, safeEnglish, safeEnglishList } from "@/lib/i18n/english-content";
import type { DailyAccuracyStats, DailyVerdict } from "@/types/daily-accuracy";
import type { PublicAccuracyHistoryItem } from "@/lib/accuracy/public-history-filter";
import { computePublicAccuracyStats, publicStarAccuracyBreakdown, publicStarTrendAnalysis } from "@/lib/accuracy/public-history-filter";
import { dailySymbolOrderIndex } from "@/lib/data/daily-asset-order";
import { formatBeijingDateZh } from "@/lib/calendar/beijing-date";
import { starsText } from "@/lib/forecasts/consensus-confidence";
import { DAILY_STABLE_SAMPLE_SIZE, STAR_BUCKET_MIN_SAMPLE_SIZE } from "@/lib/accuracy/accuracy-governance-core";

type AssetFilter = "ALL" | "BTC" | "ETH" | "SPX" | "NDX" | "SSEC" | "HSTECH" | "GLD" | "SILVER" | "WTI";
type RangeFilter = "ALL" | "7D" | "30D";
type VerdictFilter = "ALL" | "FULL_HIT" | "PARTIAL_HIT" | "MISS" | "UNVERIFIABLE";

function formatPct(n: number | null | undefined, en: boolean): string {
  if (n == null) return en ? "Insufficient sample" : "暂无足够样本";
  return `${(n * 100).toFixed(1)}%`;
}

function formatPrice(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);
}

function formatDate(value: string, en: boolean): string {
  if (!en) return formatBeijingDateZh(value);
  const date = new Date(`${value}T12:00:00+08:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit", timeZone: "Asia/Shanghai" }).format(date);
}

function normalizedVerdict(v: DailyVerdict): VerdictFilter {
  if (v === "HIT") return "FULL_HIT";
  if (v === "FULL_HIT" || v === "PARTIAL_HIT" || v === "MISS" || v === "UNVERIFIABLE") return v;
  return "UNVERIFIABLE";
}

function verdictClass(v: DailyVerdict): string {
  const result = normalizedVerdict(v);
  if (result === "FULL_HIT") return "border-emerald-500/30 text-emerald-500";
  if (result === "PARTIAL_HIT") return "border-amber-500/30 text-amber-500";
  if (result === "MISS") return "border-red-500/30 text-red-500";
  return "text-foreground-tertiary";
}

function verdictLabel(item: PublicAccuracyHistoryItem, en: boolean): string {
  const result = normalizedVerdict(item.verdict);
  if (result === "UNVERIFIABLE" && item.predictedPattern && item.predictedPattern === item.actualPattern) return en ? "Direction matched" : "方向一致";
  if (!en) return item.verdictLabel;
  if (result === "FULL_HIT") return "Full hit";
  if (result === "PARTIAL_HIT") return "Partial hit";
  if (result === "MISS") return "Miss";
  return "Unverifiable";
}

function validationExplanation(item: PublicAccuracyHistoryItem, en: boolean): string {
  if (normalizedVerdict(item.verdict) === "UNVERIFIABLE" && item.predictedPattern && item.predictedPattern === item.actualPattern) {
    return en ? "Direction matched, but path data was insufficient for a complete path score." : "方向表现一致；路径数据不足，暂不计入完整路径命中率。";
  }
  const source = item.validationExplanation ?? item.pathVerdictLabel;
  return en ? safeEnglish(source, "This record does not yet contain a complete path explanation.") : source ?? "该记录尚未保存完整路径说明。";
}

function inRange(date: string, range: RangeFilter): boolean {
  if (range === "ALL") return true;
  const days = range === "7D" ? 7 : 30;
  return new Date(`${date}T12:00:00Z`).getTime() >= Date.now() - days * 86_400_000;
}

function ScoreRow({ item, en }: { item: PublicAccuracyHistoryItem; en: boolean }) {
  if (item.patternScore == null && item.pathScore == null) return null;
  const subtotal = (item.patternScore ?? 0) + (item.pathScore ?? 0);
  const technical = item.zoneScore != null || item.conditionScore != null;
  const cells = technical
    ? [[en ? "Pattern" : "走势类型", `${item.patternScore ?? 0}/40`], [en ? "Path" : "运行路径", `${item.pathScore ?? 0}/25`], [en ? "Zones" : "支撑压力", `${item.zoneScore ?? "—"}/20`], [en ? "Conditions" : "确认失效", `${item.conditionScore ?? "—"}/15`], [en ? "Total" : "总分", `${item.totalScore ?? "—"}/100`]]
    : [[en ? "Pattern" : "走势类型", `${item.patternScore ?? 0}/40`], [en ? "Path" : "运行路径", `${item.pathScore ?? 0}/25`], [en ? "Verified subtotal" : "已验证小计", `${subtotal}/65`]];
  return (
    <div className="mt-3 rounded-md border border-border/[0.08] bg-muted/10 p-3 text-body-sm">
      <div className={`grid gap-2 ${technical ? "sm:grid-cols-5" : "sm:grid-cols-3"}`}>{cells.map(([label, value]) => <div key={label}><span className="text-foreground-tertiary">{label}</span><br />{value}</div>)}</div>
      {!technical ? <Text variant="caption" color="tertiary" className="mt-2 block">{en ? "Technical conditions have not completed independent verification; only completed scoring fields are shown." : "技术条件尚未完成独立验证，本条仅展示已完成的验证项目。"}</Text> : null}
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

function IntradayPathChart({ item, en }: { item: PublicAccuracyHistoryItem; en: boolean }) {
  const points = item.intradayPath?.filter((point) => Number.isFinite(point.close)) ?? [];
  if (points.length < 4) return null;
  const support = parseFirstZone(item.supportLevels);
  const resistance = parseFirstZone(item.resistanceLevels);
  const prices = points.map((point) => point.close);
  if (support) prices.push(...support);
  if (resistance) prices.push(...resistance);
  let min = Math.min(...prices);
  let max = Math.max(...prices);
  const pad = Math.max((max - min) * 0.08, Math.abs(max || 1) * 0.001);
  min -= pad; max += pad;
  const width = 720, height = 190, left = 50, right = 12, top = 12, bottom = 32;
  const plotW = width - left - right, plotH = height - top - bottom;
  const x = (i: number) => left + (i / Math.max(1, points.length - 1)) * plotW;
  const y = (price: number) => top + ((max - price) / Math.max(max - min, 1e-9)) * plotH;
  const line = points.map((point, index) => `${x(index).toFixed(1)},${y(point.close).toFixed(1)}`).join(" ");
  const zoneRect = (zone: [number, number] | null, className: string) => zone ? <rect x={left} y={y(zone[1])} width={plotW} height={Math.max(2, y(zone[0]) - y(zone[1]))} className={className} fill="currentColor" opacity="0.1" /> : null;
  return (
    <div className="mt-3 rounded-md border border-border/[0.08] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><Text variant="caption" color="tertiary">{en ? "15-minute realized path" : "【15分钟实际路径】"}</Text><Text variant="caption" color="tertiary">{points[0]!.time.slice(-5)}—{points.at(-1)!.time.slice(-5)}</Text></div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={en ? `${assetNameEn(item.assetName)} intraday realized path` : `${item.assetName}盘中实际路径`}>
        <line x1={left} y1={top} x2={left} y2={height - bottom} className="text-border" stroke="currentColor" opacity="0.6" /><line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} className="text-border" stroke="currentColor" opacity="0.6" />
        {zoneRect(support, "text-emerald-500")}{zoneRect(resistance, "text-amber-500")}
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary" vectorEffect="non-scaling-stroke" />
        <circle cx={x(0)} cy={y(points[0]!.close)} r="3" fill="currentColor" className="text-foreground" /><circle cx={x(points.length - 1)} cy={y(points.at(-1)!.close)} r="3" fill="currentColor" className="text-primary" />
        <text x="4" y={top + 4} className="fill-foreground-tertiary text-[10px]">{formatPrice(max)}</text><text x="4" y={height - bottom} className="fill-foreground-tertiary text-[10px]">{formatPrice(min)}</text>
        <text x={left} y={height - 8} className="fill-foreground-tertiary text-[10px]">{en ? "Open" : "开盘阶段"}</text><text x={width - right} y={height - 8} textAnchor="end" className="fill-foreground-tertiary text-[10px]">{en ? "Close" : "收盘阶段"}</text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-caption text-foreground-tertiary">{support ? <span>{en ? "Green band: first locked support zone" : "绿色带：发布时锁定的第一支撑区"}</span> : null}{resistance ? <span>{en ? "Yellow band: first locked resistance zone" : "黄色带：发布时锁定的第一压力区"}</span> : null}</div>
    </div>
  );
}

function HistoryCard({ item, en }: { item: PublicAccuracyHistoryItem; en: boolean }) {
  const legacy = item.validationMode === "LEGACY_DIRECTION_ONLY";
  const field = (zh: string, english: string) => en ? english : zh;
  return (
    <Card padding="md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Text variant="body" weight="semibold">{en ? assetNameEn(item.assetName) : item.assetName} <span className="font-mono text-foreground-tertiary">{item.symbol}</span></Text><Text variant="body-sm" color="secondary" className="mt-1">{field("预测日期", "Forecast date")}: {formatDate(item.forecastDate, en)} · V{item.version}</Text></div>
        <div className="flex flex-wrap items-center gap-2">{legacy ? <Badge variant="outline">{field("早期记录仅方向验证", "Legacy direction-only record")}</Badge> : null}{item.consensusStars ? <Badge variant="outline" className="border-primary/30 text-primary">{starsText(item.consensusStars)}</Badge> : null}<Badge variant="outline" className={verdictClass(item.verdict)}>{verdictLabel(item, en)}</Badge></div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-border/[0.08] p-3">
          <Text variant="caption" color="tertiary">{field("【原始预测】", "Locked forecast")}</Text>
          <dl className="mt-2 grid gap-2 text-body-sm">
            <div><dt className="text-foreground-tertiary">{field("预测走势", "Forecast pattern")}</dt><dd className="font-medium">{en ? directionEn(item.predictedPattern) : item.predictedPattern}</dd></div>
            {item.expectedPath?.length ? <div><dt className="text-foreground-tertiary">{field("预测路径", "Expected path")}</dt><dd>{(en ? safeEnglishList(item.expectedPath) : item.expectedPath).join(" → ")}</dd></div> : null}
            {item.summary ? <div><dt className="text-foreground-tertiary">{field("原始摘要", "Original summary")}</dt><dd>{en ? safeEnglish(item.summary) : item.summary}</dd></div> : null}
            {item.supportLevels?.length ? <div><dt className="text-foreground-tertiary">{field("支撑区间", "Support zones")}</dt><dd>{(en ? safeEnglishList(item.supportLevels) : item.supportLevels).join(en ? "; " : "；")}</dd></div> : null}
            {item.resistanceLevels?.length ? <div><dt className="text-foreground-tertiary">{field("压力区间", "Resistance zones")}</dt><dd>{(en ? safeEnglishList(item.resistanceLevels) : item.resistanceLevels).join(en ? "; " : "；")}</dd></div> : null}
            {item.confirmation ? <div><dt className="text-foreground-tertiary">{field("确认条件", "Confirmation trigger")}</dt><dd>{en ? safeEnglish(item.confirmation) : item.confirmation}</dd></div> : null}
            {item.invalidation ? <div><dt className="text-foreground-tertiary">{field("失效条件", "Invalidation condition")}</dt><dd>{en ? safeEnglish(item.invalidation) : item.invalidation}</dd></div> : null}
          </dl>
        </div>

        <div className="rounded-md border border-border/[0.08] p-3">
          <Text variant="caption" color="tertiary">{field("【实际走势】", "Realized market")}</Text>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-body-sm">
            <div><dt className="text-foreground-tertiary">{field("实际走势", "Actual pattern")}</dt><dd className="font-medium">{en ? directionEn(item.actualPattern) : item.actualPattern}</dd></div>
            <div><dt className="text-foreground-tertiary">{field("实际涨跌", "Actual change")}</dt><dd>{item.actualReturnPct == null ? "—" : `${item.actualReturnPct >= 0 ? "+" : ""}${item.actualReturnPct.toFixed(2)}%`}</dd></div>
            {[["前收", "Previous close", item.previousClose], ["开盘", "Open", item.actualOpen], ["最高", "High", item.actualHigh], ["最低", "Low", item.actualLow], ["收盘", "Close", item.actualClose]].map(([zh, english, value]) => <div key={String(zh)}><dt className="text-foreground-tertiary">{field(String(zh), String(english))}</dt><dd>{formatPrice(value as number | null)}</dd></div>)}
            <div><dt className="text-foreground-tertiary">{field("验证周期", "Verification window")}</dt><dd>{en ? safeEnglish(item.timingVerdict, legacy ? "Daily direction" : "15-minute bars") : item.timingVerdict ?? (legacy ? "日线方向" : "15分钟K线")}</dd></div>
            {item.mainLowTime ? <div className="col-span-2"><dt className="text-foreground-tertiary">{field("主要低位时间", "Main low time")}</dt><dd>{item.mainLowTime}</dd></div> : null}{item.mainHighTime ? <div className="col-span-2"><dt className="text-foreground-tertiary">{field("主要高位时间", "Main high time")}</dt><dd>{item.mainHighTime}</dd></div> : null}
          </dl>
        </div>
      </div>

      <IntradayPathChart item={item} en={en} />
      <div className="mt-3 rounded-md border border-border/[0.08] bg-muted/10 p-3"><Text variant="caption" color="tertiary">{field("【验证说明】", "Verification note")}</Text><Text variant="body-sm" color="secondary" className="mt-2">{validationExplanation(item, en)}</Text></div>
      <ScoreRow item={item} en={en} />
    </Card>
  );
}

export function DailyAccuracyClient({ items, stats }: { items: PublicAccuracyHistoryItem[]; stats: DailyAccuracyStats }) {
  const { locale, href } = useLocale();
  const en = locale === "en";
  const [asset, setAsset] = useState<AssetFilter>("ALL");
  const [range, setRange] = useState<RangeFilter>("ALL");
  const [verdict, setVerdict] = useState<VerdictFilter>("ALL");
  const displayStats = useMemo(() => { const live = computePublicAccuracyStats(items); return live.totalForecasts > 0 ? live : stats; }, [items, stats]);
  const stableSample = displayStats.verifiedCount >= DAILY_STABLE_SAMPLE_SIZE;
  const starBuckets = useMemo(() => publicStarAccuracyBreakdown(items), [items]);
  const starTrend = useMemo(() => publicStarTrendAnalysis(items), [items]);
  const ratedSampleCount = starBuckets.reduce((sum, bucket) => sum + bucket.sampleCount, 0);
  const rows = useMemo(() => {
    const matchesAsset = (item: PublicAccuracyHistoryItem) => {
      if (asset === "ALL") return true;
      if (asset === "GLD") return ["GLD", "GOLD", "GC=F"].includes(item.symbol);
      if (asset === "SILVER") return ["SILVER", "SI=F", "SLV"].includes(item.symbol);
      return item.symbol === asset;
    };
    return items
      .filter(matchesAsset)
      .filter((item) => inRange(item.forecastDate, range))
      .filter((item) => verdict === "ALL" || normalizedVerdict(item.verdict) === verdict)
      .sort((a, b) => b.forecastDate.localeCompare(a.forecastDate) || dailySymbolOrderIndex(a.symbol) - dailySymbolOrderIndex(b.symbol));
  }, [items, asset, range, verdict]);
  const provisional = (value: number | null | undefined) => {
    const formatted = formatPct(value, en);
    if (value == null || stableSample) return formatted;
    return `${formatted}\n${en ? "Provisional" : "暂定"}`;
  };
  const statsCards = [
    [en ? "Verified records" : "有效验证数", String(displayStats.verifiedCount)],
    [en ? "Full hits" : "完全命中", String(displayStats.fullHitCount ?? displayStats.hitCount)],
    [en ? "Partial hits" : "部分命中", String(displayStats.partialHitCount ?? 0)],
    [en ? "Misses" : "未命中", String(displayStats.missCount)],
    [en ? "Unverifiable" : "无法验证", String(displayStats.unverifiableCount ?? 0)],
    [en ? "Weighted accuracy" : "加权命中率", provisional(displayStats.weightedHitRate ?? displayStats.hitRate)],
    [en ? "Weighted path accuracy" : "路径加权命中率", provisional(displayStats.pathHitRate)],
    [en ? "Direction accuracy" : "方向命中率", provisional(displayStats.directionHitRate)],
  ];
  const assetFilters: Array<[AssetFilter, string, string]> = [["ALL", "全部资产", "All assets"], ["BTC", "比特币", "Bitcoin"], ["ETH", "以太坊", "Ether"], ["SPX", "标普500", "S&P 500"], ["NDX", "纳斯达克100", "Nasdaq 100"], ["SSEC", "上证指数", "Shanghai Composite"], ["HSTECH", "恒生科技指数", "Hang Seng TECH"], ["GLD", "国际金价", "Gold"], ["SILVER", "国际银价", "Silver"], ["WTI", "WTI原油", "WTI"]];
  const rangeFilters: Array<[RangeFilter, string, string]> = [["ALL", "全部历史", "All history"], ["7D", "最近7日", "Last 7 days"], ["30D", "最近30日", "Last 30 days"]];
  const verdictFilters: Array<[VerdictFilter, string, string]> = [["ALL", "全部结果", "All results"], ["FULL_HIT", "完全命中", "Full hits"], ["PARTIAL_HIT", "部分命中", "Partial hits"], ["MISS", "未命中", "Misses"], ["UNVERIFIABLE", "无法验证", "Unverifiable"]];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
      <div className="mb-8"><Heading as="h1" size="h2">{en ? "Historical verification" : "历史验证"}</Heading><Text variant="body" color="secondary" className="mt-3 max-w-3xl">{en ? "After each observation window ends, MOOX verifies the locked direction and expected path against realized market data. Current and future views never enter the score early." : "预测周期结束后，系统按真实行情验证方向与运行路径；今日和未来观点不会提前计入成绩。"}</Text><Text variant="body-sm" color="tertiary" className="mt-2 max-w-3xl">{en ? "Path-based views use 15-minute bars where reliable data exists. Records without trustworthy market data remain excluded." : "路径型观点优先使用15分钟K线核对；缺少可靠行情的数据不会进入统计。"}</Text><Text variant="body-sm" color="tertiary" className="mt-2 max-w-3xl">{en ? "Valid hits and misses are both retained. Trial or unverifiable records may be excluded only by pre-declared data-quality rules, never because the outcome is unfavourable." : "有效的命中和未命中都会保留。试运行或无法验证记录只能按事先公布的数据质量规则处理，不能因为结果不好而删除。"}</Text><div className="mt-3"><Link href={href("/pricing")} className="text-body-sm text-primary underline-offset-4 hover:underline">{en ? "Compare access" : "会员价格"}</Link></div></div>

      {!items.length ? <Card padding="lg" className="mb-8"><Text variant="body" weight="semibold">{en ? "Verification samples are building" : "历史验证样本正在积累"}</Text><Text variant="body-sm" color="secondary" className="mt-2">{en ? "A record enters statistics only after its forecast window ends and verified market data is available. Future forecasts and blank data never inflate accuracy." : "只有预测周期结束并取得真实行情后才计入统计；不会用未来预测或空白数据填充命中率。"}</Text></Card> : <>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">{statsCards.map(([label, value]) => <Card key={label} padding="md"><Text variant="caption" color="tertiary">{label}</Text><Text variant="body" weight="semibold" className="mt-1 whitespace-pre-line">{value}</Text></Card>)}</div>
        {!stableSample && displayStats.verifiedCount > 0 ? <Text variant="body-sm" color="tertiary" className="mb-6 block">{en ? `Current verified sample: ${displayStats.verifiedCount}. Rates are visible now but remain provisional until at least ${DAILY_STABLE_SAMPLE_SIZE} verified records.` : `当前有效样本为 ${displayStats.verifiedCount} 条；命中率现在即公开显示，但累计满${DAILY_STABLE_SAMPLE_SIZE}条前统一标注为暂定样本。`}</Text> : null}
        <div className="mb-8"><div className="mb-3"><Heading as="h2" size="h3">{en ? "Verification by consensus stars" : "按共识星级验证"}</Heading><Text variant="body-sm" color="secondary" className="mt-1">{en ? "Stars are locked at publication and describe cross-method agreement, not upside size. A bucket is not ranked before its minimum sample is reached." : `星级在预测发布时锁定，代表多方法共识度而不是涨跌幅；单档累计满${STAR_BUCKET_MIN_SAMPLE_SIZE}条前只显示样本积累，不做高低比较。`}</Text></div>{ratedSampleCount ? <><Card padding="md" className="mb-3 border-primary/20 bg-primary/[0.025]"><Text variant="body-sm" weight="semibold">{en ? "Do higher stars currently predict better accuracy?" : "目前高星是否真的更准？"}</Text><Text variant="body-sm" color="secondary" className="mt-2 block">{starTrend.conclusion === "POSITIVE" ? (en ? "Current samples show a positive relationship: higher-star forecasts have performed better." : "当前样本呈正向关系：高星预测的表现更好。") : starTrend.conclusion === "INVERTED" ? (en ? "Current samples are inverted: higher-star forecasts have not performed better. The weighting model needs review." : "当前样本出现倒挂：高星预测没有更准，需要检查权重模型。") : starTrend.conclusion === "FLAT" ? (en ? "Current samples are broadly flat: star level has not yet separated accuracy." : "当前样本关系较平：星级暂未拉开命中率差异。") : (en ? "There are not yet enough rated samples or star levels for a reliable conclusion." : "带星级样本或覆盖星级档位仍不足，暂时不能下可靠结论。")}</Text></Card><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{starBuckets.map((bucket) => <Card key={bucket.stars} padding="md"><Text variant="body" weight="semibold" className="text-primary">{starsText(bucket.stars)}</Text><Text variant="caption" color="tertiary" className="mt-2 block">{en ? "Sample / full / partial / miss" : "样本 / 完全 / 部分 / 未中"}</Text><Text variant="body-sm" weight="semibold">{bucket.sampleCount} / {bucket.fullHit} / {bucket.partialHit} / {bucket.miss}</Text><Text variant="caption" color="tertiary" className="mt-2 block">{en ? "Weighted accuracy" : "加权命中率"}</Text><Text variant="body-sm" weight="semibold">{bucket.sampleCount >= STAR_BUCKET_MIN_SAMPLE_SIZE ? formatPct(bucket.weightedHitRate, en) : en ? "Building" : "积累中"}</Text></Card>)}</div></> : <Card padding="md"><Text variant="body-sm" color="secondary">{en ? "Consensus-star verification begins with the new locked standard." : "星级验证从新基准预测开始累计。"}</Text></Card>}</div>
      </>}

      {items.length ? <div className="mb-4 flex flex-col gap-3"><div className="flex flex-wrap gap-2">{assetFilters.map(([key, zh, english]) => <Button key={key} size="sm" variant={asset === key ? "primary" : "outline"} onClick={() => setAsset(key)}>{en ? english : zh}</Button>)}</div><div className="flex flex-wrap gap-2">{rangeFilters.map(([key, zh, english]) => <Button key={key} size="sm" variant={range === key ? "primary" : "outline"} onClick={() => setRange(key)}>{en ? english : zh}</Button>)}</div><div className="flex flex-wrap gap-2">{verdictFilters.map(([key, zh, english]) => <Button key={key} size="sm" variant={verdict === key ? "primary" : "outline"} onClick={() => setVerdict(key)}>{en ? english : zh}</Button>)}</div></div> : null}
      <div className="flex flex-col gap-3">{rows.map((item) => <HistoryCard key={item.forecastId} item={item} en={en} />)}{items.length > 0 && !rows.length ? <Text variant="body-sm" color="secondary">{en ? "No records match the current filters." : "当前筛选条件下没有记录。"}</Text> : null}</div>
    </div>
  );
}
