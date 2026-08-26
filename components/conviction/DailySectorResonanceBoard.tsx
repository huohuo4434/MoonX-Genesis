"use client";

import { useState } from "react";
import {
  SECTOR_RESONANCE_GROUP_ORDER,
  type SectorResonanceGroup,
} from "@/lib/data/conviction/sector-resonance-groups";
import type {
  DailySectorCell,
  DailySectorRow,
  DailySectorSummary,
  DailySectorWeek,
} from "@/lib/data/conviction/daily-sector-resonance";

function cellTone(state: DailySectorCell["state"]): string {
  if (state === "BULL") return "border-emerald-300/25 bg-emerald-300/[.08] text-emerald-100";
  if (state === "BEAR") return "border-rose-300/25 bg-rose-300/[.08] text-rose-100";
  if (state === "TURN") return "border-violet-300/30 bg-violet-300/[.09] text-violet-100";
  if (state === "NEUTRAL") return "border-amber-300/25 bg-amber-300/[.07] text-amber-100";
  return "border-white/[.07] bg-white/[.02] text-white/28";
}

function cellIcon(state: DailySectorCell["state"]): string {
  if (state === "BULL") return "↑";
  if (state === "BEAR") return "↓";
  if (state === "TURN") return "↕";
  if (state === "NEUTRAL") return "→";
  if (state === "CLOSED") return "—";
  return "·";
}

function summaryTone(status: DailySectorSummary["status"]): string {
  if (status === "HIGH") return "border-emerald-300/25 bg-emerald-300/[.08] text-emerald-100";
  if (status === "MEDIUM") return "border-cyan-300/25 bg-cyan-300/[.07] text-cyan-100";
  if (status === "DIVERGENT") return "border-amber-300/25 bg-amber-300/[.07] text-amber-100";
  return "border-white/[.08] bg-white/[.025] text-white/38";
}

function DailyCell({ cell }: { cell: DailySectorCell }) {
  return <div className={`min-h-[70px] rounded-xl border px-2 py-2 ${cellTone(cell.state)}`} title={cell.summary}>
    <div className="flex items-center gap-1.5">
      <span className="text-base font-bold leading-none">{cellIcon(cell.state)}</span>
      <span className="text-[11px] font-semibold leading-4">{cell.label}</span>
    </div>
    <p className="mt-1.5 text-[9px] leading-3 opacity-48">{cell.sourceLabel}</p>
    {cell.marker ? <span className="mt-1 block truncate text-[9px] leading-3 opacity-65">{cell.marker.label}</span> : null}
  </div>;
}

function DailyGroup({
  group,
  rows,
  week,
  summaries,
}: {
  group: SectorResonanceGroup;
  rows: DailySectorRow[];
  week: DailySectorWeek;
  summaries: DailySectorSummary[];
}) {
  return <section className="overflow-hidden rounded-2xl border border-white/[.075] bg-black/20">
    <header className="border-b border-white/[.06] px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-white">{group}</h3>
        <span className="text-[10px] text-white/32">当天有效周卦方向才计入共振</span>
      </div>
    </header>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[930px] text-left">
        <thead className="bg-white/[.025] text-[11px] text-white/42">
          <tr>
            <th className="sticky left-0 z-10 w-[148px] bg-[#090b0e] px-4 py-3">标的</th>
            {week.days.map((day) => {
              const summary = summaries.find((item) => item.date === day.date)!;
              return <th key={day.date} className={`min-w-[110px] px-2 py-3 ${day.isAsOf ? "bg-violet-300/[.055]" : day.isWeekend ? "bg-white/[.012]" : ""}`}>
                <span className="block font-semibold text-white/70">{day.label} · {day.weekday}</span>
                {day.isAsOf ? <span className="mt-1 block text-[9px] font-semibold text-violet-200/80">资料截止日</span> : null}
                <span className={`mt-1.5 inline-flex rounded-full border px-1.5 py-0.5 text-[9px] ${summaryTone(summary.status)}`}>{summary.label}</span>
              </th>;
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[.05]">
          {rows.map((row) => <tr key={row.assetId} className="align-top hover:bg-white/[.015]">
            <td className="sticky left-0 z-10 bg-[#090b0e] px-4 py-3">
              <p className="text-sm font-semibold text-white">{row.name}</p>
              <p className="mt-1 font-mono text-[10px] text-white/30">{row.symbol}</p>
            </td>
            {week.days.map((day) => {
              const cell = row.cells.find((item) => item.date === day.date)!;
              return <td key={`${row.assetId}-${day.date}`} className={`px-2 py-2.5 ${day.isAsOf ? "bg-violet-300/[.035]" : ""}`}><DailyCell cell={cell} /></td>;
            })}
          </tr>)}
        </tbody>
      </table>
    </div>
  </section>;
}

export function DailySectorResonanceBoard({
  asOf,
  weeks,
  rows,
  summaries,
}: {
  asOf: string;
  weeks: DailySectorWeek[];
  rows: DailySectorRow[];
  summaries: DailySectorSummary[];
}) {
  const initialWeek = Math.max(0, weeks.findIndex((week) => asOf >= week.start && asOf <= week.end));
  const [selectedWeek, setSelectedWeek] = useState(initialWeek);
  const week = weeks[selectedWeek] ?? weeks[0]!;
  const dates = new Set(week.days.map((day) => day.date));
  return <div id="daily-sector" className="scroll-mt-6 space-y-4">
    <section className="overflow-hidden rounded-[26px] border border-violet-300/15 bg-[radial-gradient(circle_at_15%_0%,rgba(139,92,246,.14),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(34,211,238,.09),transparent_30%),#090b0f] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-100/55">DAILY SECTOR RESONANCE</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">逐日板块共振</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/55">把同一周的路径拆到每个交易日：绿色偏强、红色偏弱、黄色震荡、紫色为关键日或转折窗。日结论来自已发布周卦路径与交易日历，不虚构独立日卦。</p>
        </div>
        <a href="#weekly-sector" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/45 transition hover:border-white/20 hover:text-white/70">查看周度矩阵 ↓</a>
      </div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {weeks.map((item, index) => <button
          key={item.start}
          type="button"
          onClick={() => setSelectedWeek(index)}
          className={`shrink-0 rounded-xl border px-3.5 py-2.5 text-left transition ${selectedWeek === index ? "border-violet-300/35 bg-violet-300/[.12] text-violet-50" : "border-white/[.08] bg-black/20 text-white/42 hover:border-white/15 hover:text-white/65"}`}
        >
          {item.badge ? <span className="mr-2 text-[9px] font-semibold text-cyan-200/75">{item.badge}</span> : null}
          <span className="text-xs font-semibold">{item.label}</span>
        </button>)}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {SECTOR_RESONANCE_GROUP_ORDER.map((group) => {
          const groupSummaries = summaries.filter((item) => item.group === group && dates.has(item.date));
          const highDays = groupSummaries.filter((item) => item.status === "HIGH").length;
          const divergentDays = groupSummaries.filter((item) => item.status === "DIVERGENT").length;
          const usableDays = groupSummaries.filter((item) => !["CLOSED", "INSUFFICIENT"].includes(item.status)).length;
          return <div key={group} className="rounded-xl border border-white/[.07] bg-black/20 px-3.5 py-3">
            <p className="text-xs font-semibold text-white/72">{group}</p>
            <p className="mt-1.5 text-[10px] text-white/36">强共振 {highDays} 天 · 分化 {divergentDays} 天 · 有效 {usableDays} 天</p>
          </div>;
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-white/38">
        <span>↑ 偏强</span><span>↓ 偏弱</span><span>→ 震荡</span><span>↕ 关键日／转折</span><span>— 休市</span><span>· 周卦待补</span>
      </div>
    </section>

    {SECTOR_RESONANCE_GROUP_ORDER.map((group) => <DailyGroup
      key={`${group}-${week.start}`}
      group={group}
      rows={rows.filter((row) => row.group === group)}
      week={week}
      summaries={summaries.filter((item) => item.group === group && dates.has(item.date))}
    />)}

    <section className="rounded-2xl border border-amber-300/15 bg-amber-300/[.035] p-4 text-xs leading-6 text-amber-100/55">
      逐日表用于看板块节奏，不把周卦拆分结果冒充独立日卦。紫色“关键日观察”保留已录入日期来源；紫色“见高转弱／探底转强”可来自周内路径转折窗。休市与缺少完整周卦的日期不计入共振，日干支软观察不能反转已锁定周方向。
    </section>
  </div>;
}
