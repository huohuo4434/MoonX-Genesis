import type { AnnualForecastRoadmap } from "@/lib/research/annual-forecast-roadmap-2026";
import { annualTrendWindowRange, buildAnnualTrendWindows, type AnnualTrendFamily } from "@/lib/research/annual-key-months";
import { ConclusionFirstPanel, type ConclusionFirstFact } from "@/components/member/ConclusionFirstPanel";

function directionTone(value: string): string {
  if (/上涨|先跌后涨/u.test(value)) return "border-emerald-300/25 bg-emerald-300/[.07] text-emerald-100";
  if (/下跌|先涨后跌/u.test(value)) return "border-rose-300/25 bg-rose-300/[.07] text-rose-100";
  return "border-amber-300/25 bg-amber-300/[.06] text-amber-100";
}

function monthLabel(value: string): string {
  return `${Number(value.slice(5))}月`;
}

function trendWindowTone(family: AnnualTrendFamily): string {
  if (family === "BULL") return "border-emerald-300/25 bg-emerald-300/[.08] text-emerald-100";
  if (family === "BEAR") return "border-rose-300/25 bg-rose-300/[.08] text-rose-100";
  if (family === "TURN") return "border-violet-300/25 bg-violet-300/[.08] text-violet-100";
  return "border-amber-300/25 bg-amber-300/[.07] text-amber-100";
}

export function AnnualForecastRoadmap2026({ rows }: { rows: readonly AnnualForecastRoadmap[] }) {
  const september = rows.map((row) => ({ row, month: row.months.find((item) => item.month === "2026-09") })).filter((item) => item.month);
  const septemberFacts: ConclusionFirstFact[] = september.map(({ row, month }) => ({
    label: row.symbol,
    value: month!.direction,
    tone: /先跌后涨|上涨/u.test(month!.direction) ? "positive" : /先涨后跌|下跌/u.test(month!.direction) ? "negative" : /先/u.test(month!.direction) ? "turn" : "neutral",
  }));
  const highCandidates = rows.filter((row) => row.highMonthCandidates.includes("2026-09")).map((row) => row.symbol);

  return <div className="space-y-5">
    <section className="rounded-[26px] border border-amber-300/15 bg-[radial-gradient(circle_at_10%_0%,rgba(251,191,36,.12),transparent_35%),radial-gradient(circle_at_90%_0%,rgba(139,92,246,.12),transparent_34%),#090b0f] p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-100/55">ANNUAL → MONTH → WEEK → DAY</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">2026年度路线总览</h1>
      <ConclusionFirstPanel
        className="mt-5"
        title="9月先看：各资产方向与高点候选"
        conclusion={`9月方向已经按资产分列；其中 ${highCandidates.length ? highCandidates.join("、") : "暂无资产"} 被年卦列为高点候选。高点候选不等于整月上涨，先涨后跌的资产必须同时看转折窗。`}
        facts={septemberFacts}
        actions={["先用本表确定9月背景，再进入月报看关键周。", "进入具体一周后，以当周六爻锁定正式方向；跨周期冲突会降低信心。"]}
      />
      <details className="mt-4 rounded-xl border border-white/[.07] bg-black/15 px-4 py-3 text-sm text-white/50">
        <summary className="cursor-pointer font-medium text-white/58">展开年度体系说明</summary>
        <p className="mt-3 leading-7">年卦先标出全年看涨段、看跌段、转折段和关键月；月卦校准当月关键周，周卦再标关键日。周卦拥有本周正式方向，跨周期不一致时并列显示并降低信心。</p>
      </details>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px]"><span className="rounded-full border border-emerald-300/20 bg-emerald-300/[.06] px-2.5 py-1 text-emerald-100/70">看涨段</span><span className="rounded-full border border-rose-300/20 bg-rose-300/[.06] px-2.5 py-1 text-rose-100/70">看跌段</span><span className="rounded-full border border-violet-300/20 bg-violet-300/[.06] px-2.5 py-1 text-violet-100/70">转折段</span><span className="rounded-full border border-amber-300/20 bg-amber-300/[.05] px-2.5 py-1 text-amber-100/65">震荡段</span></div>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/40"><span className="rounded-full border border-white/10 px-2.5 py-1">正式年度版 · 修订留痕</span><span className="rounded-full border border-white/10 px-2.5 py-1">生效：2026-08-25</span><span className="rounded-full border border-white/10 px-2.5 py-1">已锁定 {rows.length} 个资产</span></div>
      <p className="mt-4 rounded-xl border border-amber-300/10 bg-amber-300/[.035] px-4 py-3 text-xs leading-6 text-amber-100/55">1—8月已经发生，不使用这批8月25日新卦回填预测，也不纳入这批年卦的历史命中统计。下表只对8月25日之后负责。</p>
    </section>

    <div className="grid gap-4 xl:grid-cols-2">
      {rows.map((row) => {
        const trendWindows = buildAnnualTrendWindows(row.months);
        return <article key={row.assetId} className="rounded-2xl border border-white/[.075] bg-black/20 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[11px] tracking-wide text-white/35">{row.symbol} · V{row.version}</p><h2 className="mt-1 text-xl font-semibold text-white">{row.name}</h2></div><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${directionTone(row.annualDirection)}`}>{row.annualDirection}</span></div>
        <p className="mt-3 text-sm leading-7 text-white/62">{row.annualSummary}</p>
        <p className="mt-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3 text-xs leading-6 text-cyan-100/60">{row.remainingYearPath}</p>
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-white/32">剩余年度关键区间</p>
          <div className="flex flex-wrap gap-2">{trendWindows.map((window) => <span key={`${window.family}-${window.startMonth}`} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${trendWindowTone(window.family)}`}>{window.label} · {annualTrendWindowRange(window)}</span>)}</div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{row.months.map((item) => {
          const high = row.highMonthCandidates.includes(item.month);
          const low = row.lowMonthCandidates.includes(item.month);
          return <div key={item.month} className={`relative rounded-xl border p-3 ${directionTone(item.direction)} ${high || low ? "ring-1 ring-inset ring-white/20" : ""}`} title={item.note}>
            <div className="flex flex-wrap items-center justify-between gap-1"><p className="text-[10px] opacity-55">{monthLabel(item.month)}</p>{high ? <span className="rounded-full bg-rose-200/15 px-1.5 py-0.5 text-[9px] font-semibold text-rose-50">高点候选</span> : null}{low ? <span className="rounded-full bg-cyan-200/15 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-50">低点候选</span> : null}</div>
            <p className="mt-1 text-sm font-semibold">{item.direction}</p>
            <p className="mt-2 text-[10px] leading-4 opacity-55">{item.note}</p>
          </div>;
        })}</div>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><p className="rounded-lg border border-rose-300/15 bg-rose-300/[.04] px-3 py-2 text-rose-100/60">剩余年度高点候选：{row.highMonthCandidates.length ? row.highMonthCandidates.map(monthLabel).join("、") : "暂不明确"}</p><p className="rounded-lg border border-cyan-300/15 bg-cyan-300/[.04] px-3 py-2 text-cyan-100/60">剩余年度低点候选：{row.lowMonthCandidates.length ? row.lowMonthCandidates.map(monthLabel).join("、") : "暂不明确"}</p></div>
      </article>})}
    </div>

    <section className="rounded-2xl border border-white/[.08] bg-white/[.02] p-4 text-xs leading-6 text-white/42">年度路线表达顺序和风险月份，不是目标价，也不能直接生成交易。进入具体月份后，页面以独立月卦和周卦逐层校准；周卦与上级周期相反时，仍保留周卦的当周方向权，同时把冲突标为低信心。</section>
  </div>;
}
