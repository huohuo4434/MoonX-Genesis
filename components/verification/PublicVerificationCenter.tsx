"use client";

import { useMemo, useState } from "react";
import type { DailyAccuracyStats, DailyVerdict } from "@/types/daily-accuracy";
import type { PublicAccuracyHistoryItem } from "@/lib/accuracy/public-history-filter";
import type {
  WeeklyAccuracyPublicItem,
  WeeklyAccuracyPublicStats,
} from "@/lib/accuracy/get-weekly-history";
import { publicStarAccuracyBreakdown } from "@/lib/accuracy/public-history-filter";

type RangeFilter = "30D" | "90D" | "ALL";
type PeriodFilter = "ALL" | "DAILY" | "WEEKLY";

type UnifiedRow = {
  id: string;
  period: "DAILY" | "WEEKLY";
  date: string;
  symbol: string;
  assetName: string;
  predicted: string;
  actual: string;
  result: "FULL_HIT" | "PARTIAL_HIT" | "MISS" | "UNVERIFIABLE" | "PENDING";
  score: number | null;
  version: string;
  verifiedAt: string | null;
  detail: string | null;
  dataSource: string | null;
  supportLevels?: string[];
  resistanceLevels?: string[];
  confirmation?: string;
  invalidation?: string;
};

function normalizeDailyVerdict(verdict: DailyVerdict): UnifiedRow["result"] {
  if (verdict === "HIT" || verdict === "FULL_HIT") return "FULL_HIT";
  if (verdict === "PARTIAL_HIT") return "PARTIAL_HIT";
  if (verdict === "MISS") return "MISS";
  return "UNVERIFIABLE";
}

function normalizeWeeklyVerdict(result: string): UnifiedRow["result"] {
  if (result === "FULL_HIT") return "FULL_HIT";
  if (result === "PARTIAL_HIT") return "PARTIAL_HIT";
  if (result === "MISS") return "MISS";
  if (result === "PENDING") return "PENDING";
  return "UNVERIFIABLE";
}

function scoreOf(result: UnifiedRow["result"]): number | null {
  if (result === "FULL_HIT") return 1;
  if (result === "PARTIAL_HIT") return 0.5;
  if (result === "MISS") return 0;
  return null;
}

function pct(value: number | null | undefined, en: boolean): string {
  if (value == null || !Number.isFinite(value)) return en ? "Building" : "积累中";
  const normalized = value <= 1 ? value * 100 : value;
  return `${normalized.toFixed(1)}%`;
}

function dateMs(date: string): number {
  const t = new Date(`${date}T12:00:00+08:00`).getTime();
  return Number.isFinite(t) ? t : 0;
}

function inRange(date: string, range: RangeFilter): boolean {
  if (range === "ALL") return true;
  const days = range === "30D" ? 30 : 90;
  return dateMs(date) >= Date.now() - days * 86_400_000;
}

function resultText(result: UnifiedRow["result"], en: boolean): string {
  if (result === "FULL_HIT") return en ? "Full hit" : "完全命中";
  if (result === "PARTIAL_HIT") return en ? "Partial" : "部分命中";
  if (result === "MISS") return en ? "Miss" : "未命中";
  if (result === "PENDING") return en ? "Pending" : "待验证";
  return en ? "Unverifiable" : "不可验证";
}

function resultClass(result: UnifiedRow["result"]): string {
  if (result === "FULL_HIT") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (result === "PARTIAL_HIT") return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  if (result === "MISS") return "border-rose-500/30 bg-rose-500/10 text-rose-400";
  return "border-border bg-muted/20 text-foreground-tertiary";
}

function assetLabel(symbol: string, name: string): string {
  if (["GOLD", "GLD", "GC=F"].includes(symbol)) return "黄金";
  if (["SILVER", "SLV", "SI=F"].includes(symbol)) return "白银";
  return name || symbol;
}

function shortDate(date: string): string {
  const [, m, d] = date.split("-");
  return m && d ? `${Number(m)}/${Number(d)}` : date;
}

function formatTimestamp(value: string | null, en: boolean): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(en ? "en-US" : "zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function MiniTrend({ rows, en }: { rows: UnifiedRow[]; en: boolean }) {
  const points = useMemo(() => {
    const countable = [...rows]
      .filter((row) => scoreOf(row.result) != null)
      .sort((a, b) => a.date.localeCompare(b.date));
    let total = 0;
    let weighted = 0;
    return countable.map((row) => {
      total += 1;
      weighted += scoreOf(row.result) ?? 0;
      return { date: row.date, rate: weighted / total };
    });
  }, [rows]);

  if (!points.length) {
    return (
      <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/20 text-sm text-foreground-tertiary">
        {en ? "The first verified samples will draw the track-record curve." : "首批有效样本完成后，这里自动绘制真实命中率曲线。"}
      </div>
    );
  }

  const width = 760;
  const height = 190;
  const left = 46;
  const right = 18;
  const top = 18;
  const bottom = 30;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const x = (i: number) => left + (i / Math.max(1, points.length - 1)) * plotW;
  const y = (rate: number) => top + (1 - rate) * plotH;
  const line = points.map((point, index) => `${x(index)},${y(point.rate)}`).join(" ");
  const last = points.at(-1)!;

  return (
    <div className="rounded-xl border border-border/60 bg-background/20 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={en ? "Weighted accuracy trend" : "加权命中率趋势"}>
        {[0.25, 0.5, 0.75, 1].map((rate) => (
          <g key={rate}>
            <line x1={left} x2={width - right} y1={y(rate)} y2={y(rate)} stroke="currentColor" className="text-border" opacity="0.45" />
            <text x={8} y={y(rate) + 4} fill="currentColor" className="text-foreground-tertiary" fontSize="11">{Math.round(rate * 100)}%</text>
          </g>
        ))}
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" vectorEffect="non-scaling-stroke" />
        <circle cx={x(points.length - 1)} cy={y(last.rate)} r="4" fill="currentColor" className="text-primary" />
        <text x={left} y={height - 8} fill="currentColor" className="text-foreground-tertiary" fontSize="11">{shortDate(points[0]!.date)}</text>
        <text x={width - right - 30} y={height - 8} fill="currentColor" className="text-foreground-tertiary" fontSize="11">{shortDate(last.date)}</text>
      </svg>
      <div className="mt-1 flex items-center justify-between text-xs text-foreground-tertiary">
        <span>{en ? `${points.length} countable samples` : `${points.length} 条计分样本`}</span>
        <span className="font-semibold text-foreground">{pct(last.rate, en)}</span>
      </div>
    </div>
  );
}

export function PublicVerificationCenter({
  dailyItems,
  dailyStats,
  weeklyItems,
  weeklyStats,
  pendingCount,
  generatedAt,
  en,
}: {
  dailyItems: PublicAccuracyHistoryItem[];
  dailyStats: DailyAccuracyStats;
  weeklyItems: WeeklyAccuracyPublicItem[];
  weeklyStats: WeeklyAccuracyPublicStats;
  pendingCount: number;
  generatedAt: string;
  en: boolean;
}) {
  const [range, setRange] = useState<RangeFilter>("90D");
  const [period, setPeriod] = useState<PeriodFilter>("ALL");
  const [asset, setAsset] = useState("ALL");

  const allRows = useMemo<UnifiedRow[]>(() => {
    const daily: UnifiedRow[] = dailyItems.map((item) => {
      const result = normalizeDailyVerdict(item.verdict);
      return {
        id: `D:${item.forecastId}`,
        period: "DAILY",
        date: item.forecastDate,
        symbol: item.symbol,
        assetName: item.assetName,
        predicted: item.predictedPattern || item.predictedDirection,
        actual: item.actualPattern || item.actualDirection,
        result,
        score: item.totalScore != null ? item.totalScore / 100 : scoreOf(result),
        version: `V${item.version}`,
        verifiedAt: item.verifiedAt,
        detail: item.validationExplanation ?? item.pathVerdictLabel ?? item.errorMessage ?? null,
        dataSource: item.dataSource ?? null,
        supportLevels: item.supportLevels,
        resistanceLevels: item.resistanceLevels,
        confirmation: item.confirmation,
        invalidation: item.invalidation,
      };
    });
    const weekly: UnifiedRow[] = weeklyItems.map((item) => {
      const result = normalizeWeeklyVerdict(item.result);
      return {
        id: `W:${item.id}`,
        period: "WEEKLY",
        date: item.weekEnd,
        symbol: item.symbol,
        assetName: item.symbol,
        predicted: item.predictedPattern,
        actual: item.actualPattern ?? (en ? "Tracking" : "持续跟踪"),
        result,
        score: item.totalScore != null ? item.totalScore / 100 : scoreOf(result),
        version: "LOCKED",
        verifiedAt: item.verifiedAt,
        detail: item.explanation,
        dataSource: null,
      };
    });
    return [...daily, ...weekly].sort((a, b) => b.date.localeCompare(a.date));
  }, [dailyItems, weeklyItems, en]);

  const countableFull = (dailyStats.fullHitCount ?? dailyStats.hitCount) + weeklyStats.full;
  const countablePartial = (dailyStats.partialHitCount ?? 0) + weeklyStats.partial;
  const countableMiss = dailyStats.missCount + weeklyStats.miss;
  const verifiedTotal = countableFull + countablePartial + countableMiss;
  const weightedRate = verifiedTotal ? (countableFull + countablePartial * 0.5) / verifiedTotal : null;
  const dailyDirectionHits = dailyStats.directionHitRate == null ? 0 : dailyStats.directionHitRate * dailyStats.verifiedCount;
  const weeklyDirectionHits = weeklyStats.directionAccuracyPct == null ? 0 : (weeklyStats.directionAccuracyPct / 100) * weeklyStats.sampleSize;
  const directionDen = dailyStats.verifiedCount + weeklyStats.sampleSize;
  const directionRate = directionDen ? (dailyDirectionHits + weeklyDirectionHits) / directionDen : null;
  const totalPending = pendingCount + weeklyStats.pending;
  const totalUnverifiable = (dailyStats.unverifiableCount ?? 0) + weeklyStats.unverifiable;

  const assetOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of allRows) map.set(row.symbol, assetLabel(row.symbol, row.assetName));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], en ? "en" : "zh-CN"));
  }, [allRows, en]);

  const filteredRows = useMemo(
    () => allRows.filter((row) => inRange(row.date, range))
      .filter((row) => period === "ALL" || row.period === period)
      .filter((row) => asset === "ALL" || row.symbol === asset),
    [allRows, range, period, asset]
  );

  const assetPerformance = useMemo(() => {
    const groups = new Map<string, { name: string; count: number; score: number; full: number; partial: number; miss: number }>();
    for (const row of filteredRows) {
      const score = scoreOf(row.result);
      if (score == null) continue;
      const cur = groups.get(row.symbol) ?? { name: assetLabel(row.symbol, row.assetName), count: 0, score: 0, full: 0, partial: 0, miss: 0 };
      cur.count += 1;
      cur.score += score;
      if (row.result === "FULL_HIT") cur.full += 1;
      else if (row.result === "PARTIAL_HIT") cur.partial += 1;
      else cur.miss += 1;
      groups.set(row.symbol, cur);
    }
    return [...groups.entries()]
      .map(([symbol, value]) => ({ symbol, ...value, rate: value.count ? value.score / value.count : 0 }))
      .sort((a, b) => b.rate - a.rate || b.count - a.count)
      .slice(0, 8);
  }, [filteredRows]);

  const starBuckets = useMemo(() => publicStarAccuracyBreakdown(dailyItems), [dailyItems]);
  const ratedSamples = starBuckets.reduce((sum, bucket) => sum + bucket.sampleCount, 0);

  const metricCards = [
    [en ? "Verified samples" : "已验证样本", String(verifiedTotal), en ? "Full + partial + miss" : "完全 + 部分 + 未命中"],
    [en ? "Weighted accuracy" : "综合加权命中率", pct(weightedRate, en), en ? "Partial hit = 0.5" : "部分命中按 0.5 计分"],
    [en ? "Direction accuracy" : "方向命中率", pct(directionRate, en), en ? "Daily + weekly" : "日度 + 周度统一口径"],
    [en ? "Full-path accuracy" : "完整路径命中率", pct(dailyStats.pathHitRate, en), en ? `Daily n=${dailyStats.verifiedCount}` : `当前日度样本 n=${dailyStats.verifiedCount}`],
    [en ? "Misses" : "未命中", String(countableMiss), en ? "Never deleted" : "失败记录永久保留"],
    [en ? "Pending" : "待验证", String(totalPending), en ? "Processed automatically" : "周期结束后自动处理"],
  ];

  return (
    <div className="mx-auto w-full max-w-[1280px] px-1 sm:px-2">
      <section className="overflow-hidden rounded-3xl border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(80,90,255,0.12),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))] p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">MOOX TRACK RECORD</div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{en ? "Public verification center" : "公开历史验证"}</h1>
            <p className="mt-3 text-sm leading-6 text-foreground-secondary sm:text-base">
              {en ? "Forecasts are locked when published. Hits, partial hits and misses remain permanently visible; unverifiable records never inflate the denominator." : "预测发布即锁定，命中、部分命中和未命中全部永久保留；不可验证记录不会被拿来抬高命中率。"}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground-tertiary">
              <span>{en ? "Version locked" : "✓ 发布版本锁定"}</span>
              <span>{en ? "Misses retained" : "✓ 失败样本不删除"}</span>
              <span>{en ? "Real market evidence" : "✓ 真实行情验证"}</span>
              <span>{en ? "CSV / JSON export" : "✓ 原始数据可下载"}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <a href="/api/public/verification?format=csv" className="rounded-xl border border-border bg-background/50 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/50">{en ? "Download CSV" : "下载 CSV"}</a>
            <a href="/api/public/verification?format=json" className="rounded-xl border border-border bg-background/50 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/50">{en ? "Download JSON" : "下载 JSON"}</a>
          </div>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metricCards.map(([label, value, note]) => (
            <div key={label} className="rounded-2xl border border-border/60 bg-background/35 p-4">
              <div className="text-xs text-foreground-tertiary">{label}</div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">{value}</div>
              <div className="mt-1 text-[11px] leading-4 text-foreground-tertiary">{note}</div>
            </div>
          ))}
        </div>
        {totalUnverifiable > 0 ? <div className="mt-3 text-xs text-foreground-tertiary">{en ? `${totalUnverifiable} unverifiable records are retained outside the accuracy denominator.` : `另有 ${totalUnverifiable} 条不可验证记录保留在档案中，但不进入命中率分母。`}</div> : null}
      </section>

      <section className="mt-6 rounded-2xl border border-border/70 bg-card/50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{en ? "Track-record trend" : "战绩趋势"}</h2>
            <p className="mt-1 text-sm text-foreground-tertiary">{en ? "The curve uses only countable, completed records." : "曲线只使用已经完成且可计分的真实样本。"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["30D", "90D", "ALL"] as const).map((value) => <button key={value} type="button" onClick={() => setRange(value)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${range === value ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-foreground-secondary"}`}>{value === "ALL" ? (en ? "All" : "全部") : value}</button>)}
            {(["ALL", "DAILY", "WEEKLY"] as const).map((value) => <button key={value} type="button" onClick={() => setPeriod(value)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${period === value ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-foreground-secondary"}`}>{value === "ALL" ? (en ? "All periods" : "全部周期") : value === "DAILY" ? (en ? "Daily" : "日度") : (en ? "Weekly" : "周度")}</button>)}
            <select value={asset} onChange={(event) => setAsset(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary/50">
              <option value="ALL">{en ? "All assets" : "全部资产"}</option>
              {assetOptions.map(([symbol, label]) => <option key={symbol} value={symbol}>{label} · {symbol}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
          <MiniTrend rows={filteredRows} en={en} />
          <div className="rounded-xl border border-border/60 bg-background/20 p-4">
            <div className="mb-3 text-sm font-semibold text-foreground">{en ? "Performance by asset" : "按资产表现"}</div>
            {assetPerformance.length ? <div className="space-y-3">{assetPerformance.map((item) => <div key={item.symbol}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate text-foreground-secondary">{item.name} <span className="text-foreground-tertiary">{item.symbol}</span></span><span className="font-semibold tabular-nums text-foreground">{pct(item.rate, en)} · n={item.count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, Math.min(100, item.rate * 100))}%` }} /></div></div>)}</div> : <div className="py-12 text-center text-sm text-foreground-tertiary">{en ? "No countable samples yet." : "样本积累中，暂不排名。"}</div>}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border/70 bg-card/50 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-semibold text-foreground">{en ? "Consensus-star validation" : "共识星级真实表现"}</h2><p className="mt-1 text-sm text-foreground-tertiary">{en ? "Stars measure cross-method agreement, not bullishness or expected return." : "星级代表多方法共识度，不代表看涨程度或涨跌幅。"}</p></div>
          <div className="text-xs text-foreground-tertiary">{en ? `Rated daily samples n=${ratedSamples}` : `带星级日度样本 n=${ratedSamples}`}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{starBuckets.map((bucket) => <div key={bucket.stars} className="rounded-xl border border-border/60 bg-background/20 p-4"><div className="text-base tracking-wider text-amber-400">{"★".repeat(bucket.stars)}<span className="text-foreground-tertiary">{"☆".repeat(5 - bucket.stars)}</span></div><div className="mt-3 text-2xl font-bold tabular-nums text-foreground">{bucket.sampleCount ? pct(bucket.weightedHitRate, en) : "—"}</div><div className="mt-1 text-xs text-foreground-tertiary">n={bucket.sampleCount} · {bucket.fullHit}/{bucket.partialHit}/{bucket.miss}</div></div>)}</div>
      </section>

      <section className="mt-6 rounded-2xl border border-border/70 bg-card/50 p-5 sm:p-6">
        <div className="mb-4"><h2 className="text-xl font-semibold text-foreground">{en ? "Recent verified records" : "最近逐笔验证"}</h2><p className="mt-1 text-sm text-foreground-tertiary">{en ? "Open any row to inspect the locked forecast, realized path and evidence." : "每一条都可展开查看原预测、实际走势、版本与验证证据。"}</p></div>
        {filteredRows.length ? <div className="space-y-2">{filteredRows.slice(0, 16).map((row) => <details key={row.id} className="group rounded-xl border border-border/60 bg-background/20 open:border-primary/25 open:bg-background/40"><summary className="grid cursor-pointer list-none grid-cols-[78px_1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[90px_90px_1fr_1fr_110px_90px]"><span className="text-xs tabular-nums text-foreground-tertiary">{row.date}</span><span className="hidden text-xs font-semibold text-foreground-secondary sm:block">{row.period === "DAILY" ? (en ? "Daily" : "日度") : (en ? "Weekly" : "周度")}</span><span className="truncate text-sm font-semibold text-foreground">{assetLabel(row.symbol, row.assetName)} <span className="text-xs font-normal text-foreground-tertiary">{row.symbol}</span></span><span className="hidden truncate text-sm text-foreground-secondary sm:block">{row.predicted} → {row.actual}</span><span className={`justify-self-end rounded-full border px-2.5 py-1 text-[11px] font-semibold ${resultClass(row.result)}`}>{resultText(row.result, en)}</span><span className="hidden justify-self-end text-xs font-semibold tabular-nums text-foreground sm:block">{row.score == null ? "—" : `${Math.round(row.score * 100)}%`}</span></summary><div className="border-t border-border/50 px-4 py-4 text-sm"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><div className="text-xs text-foreground-tertiary">{en ? "Locked forecast" : "锁定预测"}</div><div className="mt-1 text-foreground">{row.predicted}</div></div><div><div className="text-xs text-foreground-tertiary">{en ? "Realized" : "实际走势"}</div><div className="mt-1 text-foreground">{row.actual}</div></div><div><div className="text-xs text-foreground-tertiary">{en ? "Version" : "版本"}</div><div className="mt-1 text-foreground">{row.version}</div></div><div><div className="text-xs text-foreground-tertiary">{en ? "Verified at" : "验证时间"}</div><div className="mt-1 text-foreground">{formatTimestamp(row.verifiedAt, en)}</div></div></div>{row.supportLevels?.length || row.resistanceLevels?.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><div className="text-xs text-foreground-tertiary">{en ? "Locked supports" : "发布时锁定支撑"}</div><div className="mt-1 text-foreground-secondary">{row.supportLevels?.join(" · ") || "—"}</div></div><div><div className="text-xs text-foreground-tertiary">{en ? "Locked resistance" : "发布时锁定压力"}</div><div className="mt-1 text-foreground-secondary">{row.resistanceLevels?.join(" · ") || "—"}</div></div></div> : null}{row.confirmation || row.invalidation ? <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><div className="text-xs text-foreground-tertiary">{en ? "Confirmation" : "确认条件"}</div><div className="mt-1 text-foreground-secondary">{row.confirmation || "—"}</div></div><div><div className="text-xs text-foreground-tertiary">{en ? "Invalidation" : "失效条件"}</div><div className="mt-1 text-foreground-secondary">{row.invalidation || "—"}</div></div></div> : null}<div className="mt-4 rounded-lg bg-muted/20 p-3 text-xs leading-5 text-foreground-secondary">{row.detail || (en ? "No additional explanation saved." : "本条暂无更多验证说明。")}{row.dataSource ? <span className="mt-1 block text-foreground-tertiary">{en ? "Data source" : "行情来源"}: {row.dataSource}</span> : null}</div></div></details>)}</div> : <div className="rounded-xl border border-dashed border-border/70 py-14 text-center"><div className="text-base font-semibold text-foreground">{en ? "Verified samples are building" : "首批真实样本正在积累"}</div><div className="mt-2 text-sm text-foreground-tertiary">{en ? "Locked forecasts are visible below while the automated verifier waits for each observation window to finish." : "已锁定预测会继续公开展示；观察窗口结束后由服务器自动验证，不需要人工补结果。"}</div></div>}
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-foreground-tertiary">
        <span>{en ? "Public snapshot" : "公开快照"}: {formatTimestamp(generatedAt, en)} · {en ? "Beijing time" : "北京时间"}</span>
        <span>{en ? "Daily verification retries automatically; stale data failures become transparently unverifiable instead of remaining pending forever." : "日度验证会自动重试；连续数据失败的旧记录会透明转为“不可验证”，不会无限期卡在“待处理”。"}</span>
      </div>
    </div>
  );
}
