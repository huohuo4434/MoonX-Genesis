import Link from "next/link";
import type { SectorKeyDateWindow } from "@/lib/data/conviction/sector-key-date-overview";

function shortDate(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function actionMeta(action: SectorKeyDateWindow["items"][number]["action"]) {
  if (action === "BOTTOM_WATCH") return { label: "抄底观察", tone: "border-emerald-300/25 bg-emerald-300/[.07] text-emerald-100" };
  if (action === "TOP_EXIT_WATCH") return { label: "逃顶／减仓观察", tone: "border-rose-300/25 bg-rose-300/[.07] text-rose-100" };
  return { label: "只观察／不操作", tone: "border-amber-300/25 bg-amber-300/[.07] text-amber-100" };
}

function evidenceLabel(item: SectorKeyDateWindow["items"][number]) {
  const level = item.levels.length > 1 ? "月＋周共振" : item.levels[0] === "MONTH" ? "月关键日" : "周关键日";
  const evidence = item.evidence.every((value) => value === "EXPLICIT") ? "原记录明确" : "结构推演";
  return `${level} · ${evidence}`;
}

export function SectorKeyDateOverview({ windows }: { windows: SectorKeyDateWindow[] }) {
  return <section id="key-dates" className="scroll-mt-6 overflow-hidden rounded-[26px] border border-amber-300/15 bg-[radial-gradient(circle_at_90%_0%,rgba(251,191,36,.12),transparent_36%),#090b0f] p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-100/55">KEY-DATE RADAR</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">本周＋下周关键日</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/55">月关键日优先，周关键日细化节奏；只展示板块页现有重点标的。不能确认高点或低点的日期明确写“只观察／不操作”，不把观察日包装成买卖信号。</p>
      </div>
      <Link href="/member/key-dates" className="rounded-full border border-amber-300/25 bg-amber-300/[.07] px-4 py-2 text-xs font-semibold text-amber-100 transition hover:border-amber-300/40 hover:bg-amber-300/[.12]">查看全部月＋周关键日 →</Link>
    </div>
    <div className="mt-5 grid gap-4 xl:grid-cols-2">
      {windows.map(({ week, items }) => <div key={week.start} className="rounded-2xl border border-white/[.08] bg-black/20 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-white">{week.badge ?? "周期"}｜{week.label}</h3>
          <span className="text-[11px] text-white/35">{items.length} 个板块关键日提示</span>
        </div>
        <div className="mt-4 space-y-2.5">
          {items.length ? items.map((item) => {
            const action = actionMeta(item.action);
            return <article key={item.id} className="rounded-xl border border-white/[.07] bg-white/[.02] px-3.5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-lg font-semibold text-white">{shortDate(item.focusDate)}</span>
                <span className="font-semibold text-white/82">{item.assetName}</span>
                <span className="font-mono text-[10px] text-white/30">{item.symbol}</span>
                <span className={`ml-auto rounded-full border px-2 py-1 text-[10px] font-semibold ${action.tone}`}>{action.label}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-white/55">{item.title}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-white/35"><span>{item.group}</span><span>·</span><span>{evidenceLabel(item)}</span></div>
            </article>;
          }) : <p className="rounded-xl border border-white/[.06] bg-white/[.015] px-4 py-4 text-xs leading-6 text-white/38">本周期暂无属于板块页重点标的、且仍未过期的关键日记录；不为填满页面而补造日期。</p>}
        </div>
      </div>)}
    </div>
  </section>;
}
