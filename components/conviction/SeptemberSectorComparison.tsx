import { SEPTEMBER_SECTOR_COMPARISON_20260824 } from "@/lib/data/conviction/september-weekly-revisions-20260824";

const PERIODS = ["8/31–9/6", "9/7–13", "9/14–20", "9/21–27", "9/28–10/4"] as const;
const GROUP_NOTES = {
  "半导体/存储": "长鑫与Intel在9月上中旬都有修复，9月下旬共同转弱；LITE中旬更弱，闪迪后续周卦仍待补。",
  "加密货币": "BTC、ETH、HYPE共同指向上旬见高后转弱；SOL只在月初保留修复，之后相对更弱，不宜假设都在9月10日同一天见顶。",
  "大型科技/高波动成长": "Google以区间轮动为主；太空狗9月中下旬相对更强；SPCX进入酉月高点窗口后，月底防冲高回吐。",
} as const;

function tone(value: string): string {
  if (/上涨|先跌后涨/u.test(value)) return "border-emerald-300/20 bg-emerald-300/[.06] text-emerald-100";
  if (/下跌|先涨后跌/u.test(value)) return "border-rose-300/20 bg-rose-300/[.06] text-rose-100";
  if (/待补/u.test(value)) return "border-white/[.06] bg-white/[.02] text-white/30";
  return "border-amber-300/20 bg-amber-300/[.05] text-amber-100";
}

export function SeptemberSectorComparison() {
  const groups = Object.keys(GROUP_NOTES) as Array<keyof typeof GROUP_NOTES>;
  return (
    <section className="rounded-[24px] border border-cyan-300/15 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,.1),transparent_34%),#0a0c10] p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-100/55">SEPTEMBER · SECTOR MAP</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">9月板块共振 / 分化</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/50">同类资产按相同日期对齐后比较方向；相同颜色不代表同一天见顶或同样涨跌幅。</p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/45">截至 2026-08-24</span>
      </div>
      <div className="mt-5 space-y-5">
        {groups.map((group) => {
          const rows = SEPTEMBER_SECTOR_COMPARISON_20260824.filter((row) => row.group === group);
          return (
            <div key={group} className="overflow-hidden rounded-2xl border border-white/[.07] bg-black/20">
              <div className="border-b border-white/[.06] px-4 py-3">
                <h3 className="text-base font-semibold text-white">{group}</h3>
                <p className="mt-1 text-xs leading-5 text-white/45">{GROUP_NOTES[group]}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[940px] w-full text-left text-xs">
                  <thead className="bg-white/[.025] text-white/35">
                    <tr><th className="px-3 py-2.5">标的</th>{PERIODS.map((period) => <th key={period} className="px-3 py-2.5">{period}</th>)}<th className="px-3 py-2.5">长周期关系</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/[.05]">
                    {rows.map((row) => (
                      <tr key={`${group}-${row.asset}`}>
                        <td className="px-3 py-3 text-sm font-semibold text-white">{row.asset}</td>
                        {row.periods.map((value, index) => <td key={`${row.asset}-${PERIODS[index]}`} className="px-3 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 ${tone(value)}`}>{value}</span></td>)}
                        <td className="px-3 py-3"><p className="text-white/65">{row.relation}</p><p className="mt-1 max-w-36 leading-5 text-white/35">{row.longCycle}</p></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
