import Link from "next/link";

export const MOOX_RESEARCH_PROTOCOL_V72092 = true;

export function AnalystHorizonGuide() {
  return (
    <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">External analyst discipline</p>
          <h2 className="mt-1 text-base font-semibold text-zinc-100">外部分析师改为分周期读取</h2>
          <p className="mt-1 text-sm text-zinc-400">短线 / 中期 / 长期分别记录，仓位与候选标的单列；不得用一句“看多/看空”覆盖全部周期。</p>
        </div>
        <Link className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-200 hover:bg-white/5" href="/admin/external-analyst-horizons">
          打开分周期视图
        </Link>
      </div>
    </section>
  );
}
