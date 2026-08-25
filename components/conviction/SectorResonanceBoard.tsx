import {
  SECTOR_RESONANCE_GROUP_ORDER,
  type SectorResonanceCell,
  type SectorResonanceGroup,
  type SectorResonanceRow,
  type SectorResonanceWeek,
  type SectorWeekSummary,
} from "@/lib/data/conviction/sector-resonance-board";

function directionTone(value: string): string {
  if (/上涨|先跌后涨/u.test(value)) return "border-emerald-300/25 bg-emerald-300/[.08] text-emerald-100";
  if (/下跌|先涨后跌/u.test(value)) return "border-rose-300/25 bg-rose-300/[.08] text-rose-100";
  if (/待补/u.test(value)) return "border-white/[.07] bg-white/[.02] text-white/28";
  return "border-amber-300/25 bg-amber-300/[.07] text-amber-100";
}

function summaryTone(status: SectorWeekSummary["status"]): string {
  if (status === "HIGH") return "border-emerald-300/30 bg-emerald-300/[.09] text-emerald-100";
  if (status === "MEDIUM") return "border-cyan-300/25 bg-cyan-300/[.07] text-cyan-100";
  if (status === "DIVERGENT") return "border-amber-300/25 bg-amber-300/[.07] text-amber-100";
  return "border-white/10 bg-white/[.025] text-white/40";
}

function groupDescription(group: SectorResonanceGroup): string {
  switch (group) {
    case "半导体 / AI基础设施": return "把存储、光通信、芯片与AI算力基础设施对齐，重点看同一周是否同时转强或转弱。";
    case "太空与高波动成长": return "高弹性资产只比较方向和先后顺序，不假设涨跌幅相同。";
    case "大型科技": return "观察权重科技是否同步，避免用一只股票代替整个科技板块。";
    case "加密资产": return "BTC、ETH、SOL、HYPE同周对齐；见高时间允许错开，不强行写成同一天。";
    case "美股指数": return "标普与纳指允许分化；标普偏市场宽度，纳指偏科技权重。";
    case "贵金属与能源": return "黄金、白银、WTI并排观察避险与通胀交易，但不把不同商品硬判为同涨同跌。";
  }
}

function Cell({ cell }: { cell: SectorResonanceCell }) {
  return (
    <div className="min-w-[112px]" title={cell.summary}>
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${directionTone(cell.direction)}`}>{cell.direction}</span>
      <p className={`mt-1.5 text-[10px] ${cell.sourceKind === "MONTHLY_CONTEXT" ? "text-amber-100/35" : cell.sourceKind === "MISSING" ? "text-white/22" : "text-white/38"}`}>{cell.sourceLabel}</p>
      {cell.timingMarkers.length ? <div className="mt-2 space-y-1">
        {cell.timingMarkers.map((marker) => <div key={`${marker.date}-${marker.label}`} className={`rounded-lg border px-2 py-1.5 text-[10px] leading-4 ${marker.strength === "EXACT" ? "border-violet-300/25 bg-violet-300/[.08] text-violet-100" : marker.strength === "DERIVED" ? "border-cyan-300/20 bg-cyan-300/[.055] text-cyan-100/75" : "border-white/[.07] bg-white/[.02] text-white/40"}`}>
          <b className="block font-semibold">{marker.label}</b>
          <span className="opacity-55">{marker.sourceLabel}</span>
        </div>)}
      </div> : null}
    </div>
  );
}

function keyWeekTone(tone: "BULL" | "BEAR" | "TURN" | "NEUTRAL"): string {
  if (tone === "BULL") return "border-emerald-300/20 bg-emerald-300/[.06] text-emerald-100/75";
  if (tone === "BEAR") return "border-rose-300/20 bg-rose-300/[.06] text-rose-100/75";
  if (tone === "TURN") return "border-violet-300/20 bg-violet-300/[.07] text-violet-100/80";
  return "border-amber-300/20 bg-amber-300/[.055] text-amber-100/70";
}

function GroupTable({
  group,
  rows,
  weeks,
  summaries,
}: {
  group: SectorResonanceGroup;
  rows: SectorResonanceRow[];
  weeks: SectorResonanceWeek[];
  summaries: SectorWeekSummary[];
}) {
  const current = summaries.find((item) => item.weekStart === weeks[0]!.start)!;
  const next = summaries.find((item) => item.weekStart === weeks[1]!.start)!;
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[.075] bg-black/20">
      <header className="border-b border-white/[.06] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">{group}</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-white/42">{groupDescription(group)}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className={`rounded-full border px-2.5 py-1 ${summaryTone(current.status)}`}>本周 {current.label}</span>
            <span className={`rounded-full border px-2.5 py-1 ${summaryTone(next.status)}`}>下周 {next.label}</span>
          </div>
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left">
          <thead className="bg-white/[.025] text-[11px] text-white/38">
            <tr>
              <th className="sticky left-0 z-10 min-w-[150px] bg-[#090b0e] px-4 py-3">标的</th>
              {weeks.map((week) => (
                <th key={week.start} className="min-w-[128px] px-3 py-3">
                  {week.badge ? <span className="mb-1 block text-[10px] font-semibold text-violet-200/75">{week.badge}</span> : null}
                  {week.label}
                </th>
              ))}
              <th className="min-w-[300px] px-3 py-3">年度关键月 · 月内关键周</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[.05]">
            {rows.map((row) => (
              <tr key={row.assetId} className="align-top hover:bg-white/[.015]">
                <td className="sticky left-0 z-10 bg-[#090b0e] px-4 py-3.5">
                  <p className="text-sm font-semibold text-white">{row.name}</p>
                  <p className="mt-1 font-mono text-[10px] tracking-wide text-white/32">{row.symbol}</p>
                </td>
                {row.cells.map((cell, index) => <td key={`${row.assetId}-${weeks[index]!.start}`} className="px-3 py-3.5"><Cell cell={cell} /></td>)}
                <td className="px-3 py-3.5 text-xs leading-5 text-white/46">
                  <span className={`mb-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${directionTone(row.annualDirection ?? "待补")}`}>{row.annualDirection ?? "年卦待补"}</span>
                  <p>{row.annualMonthPath}</p>
                  {(row.annualHighMonths.length || row.annualLowMonths.length) ? <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                    {row.annualHighMonths.length ? <span className="rounded-full border border-rose-300/20 bg-rose-300/[.06] px-2 py-1 text-rose-100/75">高点候选 {row.annualHighMonths.join("、")}</span> : null}
                    {row.annualLowMonths.length ? <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[.06] px-2 py-1 text-cyan-100/75">低点候选 {row.annualLowMonths.join("、")}</span> : null}
                  </div> : null}
                  {row.monthKeyWeeks.length ? <div className="mt-2">
                    <p className="mb-1 text-[10px] font-semibold text-white/38">月内关键周</p>
                    <div className="flex flex-wrap gap-1.5">{row.monthKeyWeeks.map((item) => <span key={`${item.weekLabel}-${item.label}`} className={`rounded-lg border px-2 py-1 text-[10px] ${keyWeekTone(item.tone)}`}>{item.weekLabel} · {item.label}</span>)}</div>
                  </div> : null}
                  <p className="mt-2 text-[10px] text-white/30">{row.longCycle}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="grid gap-2 border-t border-white/[.05] bg-white/[.015] px-4 py-3 text-[10px] text-white/35 sm:grid-cols-3">
        {weeks.map((week, index) => {
          const summary = summaries.find((item) => item.weekStart === week.start)!;
          if (index > 2) return null;
          return <p key={week.start}>{week.label}：多 {summary.bull} · 震荡 {summary.neutral} · 空 {summary.bear} · 完整周卦 {summary.exact}</p>;
        })}
      </footer>
    </section>
  );
}

export function SectorResonanceBoard({
  asOf,
  weeks,
  rows,
  summaries,
}: {
  asOf: string;
  weeks: SectorResonanceWeek[];
  rows: SectorResonanceRow[];
  summaries: SectorWeekSummary[];
}) {
  const currentSummaries = summaries.filter((item) => item.weekStart === weeks[0]!.start);
  const nextSummaries = summaries.filter((item) => item.weekStart === weeks[1]!.start);
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[26px] border border-cyan-300/15 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,.13),transparent_34%),radial-gradient(circle_at_90%_0%,rgba(139,92,246,.12),transparent_32%),#090b0f] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-100/55">SECTOR RESONANCE</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">板块共振分析</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-white/55">先看年度关键月，再看月内关键周和每周关键日。绿色偏多、红色偏空、黄色震荡；只有完整周卦参与板块共振计数，年度和月度背景只补充上下文，不冒充周预测。</p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/42">资料截至 {asOf}</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SECTOR_RESONANCE_GROUP_ORDER.map((group) => {
            const current = currentSummaries.find((item) => item.group === group)!;
            const next = nextSummaries.find((item) => item.group === group)!;
            return (
              <div key={group} className="rounded-2xl border border-white/[.07] bg-black/25 p-4">
                <p className="text-sm font-semibold text-white">{group}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <span className={`rounded-full border px-2.5 py-1 ${summaryTone(current.status)}`}>本周 {current.label}</span>
                  <span className={`rounded-full border px-2.5 py-1 ${summaryTone(next.status)}`}>下周 {next.label}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-white/38">
          <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-300" />上涨 / 先跌后涨</span>
          <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-300" />震荡</span>
          <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rose-300" />下跌 / 先涨后跌</span>
          <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-violet-300" />已录入明确关键日</span>
          <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-cyan-300" />周内路径转折窗</span>
          <span className="text-amber-100/40">“月度 / 上级周期背景”不计入共振强度</span>
        </div>
      </section>

      {SECTOR_RESONANCE_GROUP_ORDER.map((group) => (
        <GroupTable
          key={group}
          group={group}
          rows={rows.filter((row) => row.group === group)}
          weeks={weeks}
          summaries={summaries.filter((item) => item.group === group)}
        />
      ))}

      <section className="rounded-2xl border border-amber-300/15 bg-amber-300/[.035] p-4 text-xs leading-6 text-amber-100/55">
        共振只提高“方向参考价值”，不代表各资产会在同一天见顶、同幅度上涨或可以直接下单。紫色关键日保留六爻、奇门、八字、技术或人工录入的真实来源；青色是周卦“先涨后跌／先跌后涨”路径的转折观察窗；灰色日干支只做软校准。三者都不能越级改变已锁定周方向。没有完整周卦的格子标为上级周期背景或待补，不从长周期强行制造周结论。
      </section>
    </div>
  );
}
