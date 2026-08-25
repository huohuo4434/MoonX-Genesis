import type { AnnualForecastRoadmap } from "@/lib/research/annual-forecast-roadmap-2026";

function directionTone(value: string): string {
  if (/上涨|先跌后涨/u.test(value)) return "border-emerald-300/25 bg-emerald-300/[.07] text-emerald-100";
  if (/下跌|先涨后跌/u.test(value)) return "border-rose-300/25 bg-rose-300/[.07] text-rose-100";
  return "border-amber-300/25 bg-amber-300/[.06] text-amber-100";
}

function monthLabel(value: string): string {
  return `${Number(value.slice(5))}月`;
}

export function AnnualForecastRoadmap2026({ rows }: { rows: readonly AnnualForecastRoadmap[] }) {
  return <div className="space-y-5">
    <section className="rounded-[26px] border border-amber-300/15 bg-[radial-gradient(circle_at_10%_0%,rgba(251,191,36,.12),transparent_35%),radial-gradient(circle_at_90%_0%,rgba(139,92,246,.12),transparent_34%),#090b0f] p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-100/55">ANNUAL → MONTH → WEEK → DAY</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">2026年度路线总览</h1>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/55">年卦先确定年度环境、9—12月涨跌候选和剩余年度高低点候选；月卦校准当月先后顺序，周卦拥有本周正式方向，日分析再从周卦拆分。跨周期不一致时并列显示并降低信心。</p>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/40"><span className="rounded-full border border-white/10 px-2.5 py-1">正式年度版 V1</span><span className="rounded-full border border-white/10 px-2.5 py-1">生效：2026-08-25</span><span className="rounded-full border border-white/10 px-2.5 py-1">已锁定 {rows.length} 个资产</span></div>
      <p className="mt-4 rounded-xl border border-amber-300/10 bg-amber-300/[.035] px-4 py-3 text-xs leading-6 text-amber-100/55">1—8月已经发生，不使用这批8月25日新卦回填预测，也不纳入这批年卦的历史命中统计。下表只对8月25日之后负责。</p>
    </section>

    <div className="grid gap-4 xl:grid-cols-2">
      {rows.map((row) => <article key={row.assetId} className="rounded-2xl border border-white/[.075] bg-black/20 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[11px] tracking-wide text-white/35">{row.symbol}</p><h2 className="mt-1 text-xl font-semibold text-white">{row.name}</h2></div><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${directionTone(row.annualDirection)}`}>{row.annualDirection}</span></div>
        <p className="mt-3 text-sm leading-7 text-white/62">{row.annualSummary}</p>
        <p className="mt-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3 text-xs leading-6 text-cyan-100/60">{row.remainingYearPath}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{row.months.map((item) => <div key={item.month} className={`rounded-xl border p-3 ${directionTone(item.direction)}`} title={item.note}><p className="text-[10px] opacity-55">{monthLabel(item.month)}</p><p className="mt-1 text-sm font-semibold">{item.direction}</p></div>)}</div>
        <div className="mt-3 grid gap-2 text-xs text-white/40 sm:grid-cols-2"><p>高点候选：{row.highMonthCandidates.map(monthLabel).join("、")}</p><p>低点候选：{row.lowMonthCandidates.map(monthLabel).join("、")}</p></div>
      </article>)}
    </div>

    <section className="rounded-2xl border border-white/[.08] bg-white/[.02] p-4 text-xs leading-6 text-white/42">年度路线表达顺序和风险月份，不是目标价，也不能直接生成交易。进入具体月份后，页面以独立月卦和周卦逐层校准；周卦与上级周期相反时，仍保留周卦的当周方向权，同时把冲突标为低信心。</section>
  </div>;
}
