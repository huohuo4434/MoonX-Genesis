import Link from "next/link";
import type { StrategyCenterSnapshot } from "@/lib/presentation/strategy-center";

function signedPct(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function plainPct(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "—" : `${value.toFixed(1)}%`;
}

function ratio(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "—" : value.toFixed(2);
}

function time(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function StrategyCenterPage({ snapshot }: { snapshot: StrategyCenterSnapshot }) {
  return (
    <main className="min-h-screen bg-[#06070b] pb-24 text-white md:pb-12">
      <section className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6 md:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.22em] text-violet-300">MOOX STRATEGY</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">策略中心</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">只读展示现有策略表现和运行记录。这里不改预测方向、不改风控，也不触发交易写入。</p>
          </div>
          <Link href="/member/ai-trading" className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-white/75">进入交易台</Link>
        </div>

        <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3 text-xs leading-5 text-white/45">{snapshot.dataNotice}</div>

        <div className="mt-6 hidden overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/8 text-xs tracking-[0.12em] text-white/38">
              <tr><th className="px-5 py-4">策略</th><th className="px-3 py-4">周期</th><th className="px-3 py-4">近30天收益</th><th className="px-3 py-4">最大回撤</th><th className="px-3 py-4">胜率</th><th className="px-3 py-4">Sharpe</th><th className="px-3 py-4">运行交易</th><th className="px-3 py-4" /></tr>
            </thead>
            <tbody>
              {snapshot.strategies.map((row) => <tr key={row.id} className="border-b border-white/[0.06] last:border-b-0">
                <td className="px-5 py-5"><div className="font-semibold">{row.name}</div><div className="mt-1 text-xs text-white/38">{row.modeLabel} · {row.enabled ? "启用" : "未启用"} · 最近扫描 {time(row.lastScanAt)}</div></td>
                <td className="px-3 py-5 text-white/70">{row.cycle}</td>
                <td className="px-3 py-5 font-medium">{signedPct(row.return30dPct)}</td>
                <td className="px-3 py-5">{plainPct(row.maxDrawdownPct)}</td>
                <td className="px-3 py-5">{plainPct(row.winRatePct)}</td>
                <td className="px-3 py-5">{ratio(row.sharpeRatio)}</td>
                <td className="px-3 py-5">{row.runningTrades}</td>
                <td className="px-3 py-5 text-right"><Link href={`/member/strategy/${row.id}`} className="text-violet-200">详情 →</Link></td>
              </tr>)}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-3 md:hidden">
          {snapshot.strategies.map((row) => <Link key={row.id} href={`/member/strategy/${row.id}`} className="rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(25,22,45,.92),rgba(8,9,14,.98))] p-5">
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{row.name}</h2><p className="mt-1 text-xs text-white/42">{row.cycle} · {row.modeLabel}</p></div><span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-200">{row.runningTrades} 运行</span></div>
            <div className="mt-5 grid grid-cols-4 gap-2 text-center"><div><div className="text-xs text-white/35">30日</div><div className="mt-1 font-semibold">{signedPct(row.return30dPct)}</div></div><div><div className="text-xs text-white/35">回撤</div><div className="mt-1 font-semibold">{plainPct(row.maxDrawdownPct)}</div></div><div><div className="text-xs text-white/35">胜率</div><div className="mt-1 font-semibold">{plainPct(row.winRatePct)}</div></div><div><div className="text-xs text-white/35">Sharpe</div><div className="mt-1 font-semibold">{ratio(row.sharpeRatio)}</div></div></div>
          </Link>)}
        </div>
      </section>
    </main>
  );
}
