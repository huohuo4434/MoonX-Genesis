import { Badge } from "@/components/ui";
import type {
  FocusDualMethodDailyRow,
  FocusQimenHorizonReading,
  FocusQimenParallelView,
} from "@/lib/forecasts/focus-qimen-multihorizon";
import type { FocusQimenRelation } from "@/lib/forecasts/focus-qimen-parallel";

const DAY_STATE = { OCCURRED: "已发生", TODAY: "今日", PENDING: "待验证", MISSING: "系统检查" } as const;

function relationClass(relation: FocusQimenRelation): string {
  if (relation === "RESONANCE") return "border-amber-300/25 bg-amber-300/[0.06] text-amber-100";
  if (relation === "DIVERGENCE") return "border-violet-300/25 bg-violet-300/[0.06] text-violet-100";
  return "border-white/10 bg-white/[0.03] text-white/55";
}
function directionClass(direction: string | null): string {
  if (!direction) return "border-white/10 text-white/45";
  if (/涨|多|强|反弹|回升|修复/.test(direction)) return "border-emerald-300/20 text-emerald-100";
  if (/跌|空|弱|回落|探底/.test(direction)) return "border-rose-300/20 text-rose-100";
  return "border-cyan-300/20 text-cyan-100";
}

function DailyRows({ rows }: { rows: FocusDualMethodDailyRow[] }) {
  const visibleRows = rows.filter((row) => !(row.state === "OCCURRED" && !row.liuyaoDirection));
  if (!visibleRows.length) return <p className="text-body-sm text-white/50">日分析正在生成。</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
      <table className="min-w-[980px] w-full border-collapse text-left">
        <thead className="bg-white/[0.035] text-caption text-white/45">
          <tr><th className="px-3 py-3">日期</th><th className="px-3 py-3">六爻</th><th className="px-3 py-3">奇门</th><th className="px-3 py-3">当前节奏</th><th className="px-3 py-3">关系</th></tr>
        </thead>
        <tbody className="divide-y divide-white/[0.07]">
          {visibleRows.map((row) => {
            const closedSession = row.qimen.direction === "休市观察";
            return (
              <tr key={row.date} className="align-top bg-black/10">
                <td className="whitespace-nowrap px-3 py-4"><p className="text-body-sm font-medium text-white">{row.date}</p><p className="mt-1 text-[11px] text-white/35">{DAY_STATE[row.state]}</p></td>
                <td className="max-w-[280px] px-3 py-4"><Badge variant="outline" className={directionClass(row.liuyaoDirection)}>{closedSession ? "休市观察" : row.liuyaoDirection ?? "系统未生成"}</Badge><p className="mt-2 text-caption leading-6 text-white/58">{row.liuyaoSummary}</p></td>
                <td className="max-w-[300px] px-3 py-4"><Badge variant="outline" className={directionClass(row.qimen.direction)}>{row.qimen.direction}</Badge><p className="mt-2 text-caption leading-6 text-violet-100/65">{row.qimen.mysticNote}</p></td>
                <td className="max-w-[300px] px-3 py-4"><Badge variant="outline" className={directionClass(row.rhythmDirection)}>{closedSession ? "休市观察" : row.rhythmDirection ?? row.liuyaoDirection ?? "系统未生成"}</Badge><p className="mt-2 text-caption leading-6 text-cyan-100/65">{row.rhythmSummary ?? row.liuyaoSummary}</p></td>
                <td className="whitespace-nowrap px-3 py-4"><Badge variant="outline" className={relationClass(row.relation)}>{row.relationLabel}</Badge></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HorizonRows({ rows }: { rows: FocusQimenHorizonReading[] }) {
  if (!rows.length) return <p className="text-caption text-white/45">暂无更多周期。</p>;
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.08]">
      <table className="min-w-[820px] w-full border-collapse text-left">
        <thead className="bg-white/[0.035] text-caption text-white/45"><tr><th className="px-3 py-3">周期</th><th className="px-3 py-3">六爻</th><th className="px-3 py-3">奇门</th><th className="px-3 py-3">关系</th></tr></thead>
        <tbody className="divide-y divide-white/[0.07]">{rows.map((row) => <tr key={`${row.forecastId}-${row.periodStart}`} className="align-top"><td className="px-3 py-4 text-body-sm text-white">{row.periodLabel}</td><td className="px-3 py-4"><Badge variant="outline" className={directionClass(row.liuyaoDirection)}>{row.liuyaoDirection}</Badge><p className="mt-2 max-w-[300px] text-caption text-white/55">{row.liuyaoSummary}</p></td><td className="px-3 py-4"><Badge variant="outline" className={directionClass(row.qimenDirection)}>{row.qimenDirection}</Badge><p className="mt-2 max-w-[300px] text-caption text-violet-100/60">{row.qimenMysticNote}</p></td><td className="px-3 py-4"><Badge variant="outline" className={relationClass(row.relation)}>{row.relationLabel}</Badge></td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function FocusQimenParallelPanel({ view }: { view: FocusQimenParallelView }) {
  return (
    <section className="space-y-4 rounded-2xl border border-violet-300/18 bg-[linear-gradient(145deg,rgba(22,16,40,.55),rgba(5,10,16,.92))] p-4 sm:p-5">
      <div><h3 className="text-xl font-semibold text-white">{view.title}</h3><p className="mt-1 text-body-sm text-white/55">{view.notice}</p></div>
      <DailyRows rows={view.dailyRows} />
      <details className="rounded-xl border border-white/[0.08] bg-black/15 p-3"><summary className="cursor-pointer text-body-sm text-white/70">更多周期</summary><HorizonRows rows={view.horizonRows} /></details>
      <details className="rounded-xl border border-white/[0.08] bg-black/15 p-3"><summary className="cursor-pointer text-caption text-white/45">方法与统计</summary><div className="mt-3 grid gap-2 text-caption text-white/50 sm:grid-cols-2"><p>六爻样本 {view.stats.liuyaoVerified.samples} · 命中 {view.stats.liuyaoVerified.hits}</p><p>奇门样本 {view.stats.qimenVerified.samples} · 命中 {view.stats.qimenVerified.hits}</p><p>用神：{view.useGod.label}</p><p>{view.useGod.basisLabel}</p></div></details>
    </section>
  );
}
