import Link from "next/link";

/** Editorial entry point only: no quote polling, forecasts or execution. */
export function CreatorProfile({ en, compact = false }: { en: boolean; compact?: boolean }) {
  const prefix = en ? "/en" : "";
  return (
    <header className={`relative overflow-hidden border-b border-white/10 ${compact ? "py-9" : "py-14 sm:py-20"}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.13),transparent_65%)]" />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <p className="text-xs font-medium uppercase tracking-[.25em] text-emerald-300">MOOX · {en ? "Independent perspectives" : "独立观点 · 持续记录"}</p>
        <div className="mt-6 flex items-center gap-4">
          <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-400/10 text-3xl text-emerald-200">易</span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{en ? "Teacher Yi’s Views" : "易老师观点"}</h1>
            <p className="mt-2 text-sm text-white/55">{en ? "Markets. Charts. The thinking behind the view." : "市场观察 · 图文分析 · 思路与复盘"}</p>
          </div>
        </div>
        <p className="mt-6 max-w-2xl text-base leading-8 text-white/70">{en ? "A space for my own market observations, updated when I have something to share. Read the reasoning, revisit the charts, and follow how each view develops." : "把我对市场的观察、画图和判断，留在这里。不定期更新，不为每天发帖而凑内容；一起看思路，也回头看判断如何演变。"}</p>
        <nav aria-label={en ? "Views navigation" : "观点栏目导航"} className="mt-7 flex flex-wrap gap-3 text-sm">
          <Link href={`${prefix}/#public-posts`} className="rounded-full bg-emerald-300 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-200">{en ? "Public posts" : "公开观点"}</Link>
          <Link href={`${prefix}/member/notes#member-posts`} className="rounded-full border border-white/20 px-5 py-3 hover:bg-white/5">{en ? "Member posts" : "会员专栏"}</Link>
          <Link href={`${prefix}/pricing`} className="rounded-full px-5 py-3 text-white/60 underline-offset-4 hover:underline">{en ? "Membership" : "会员权益"}</Link>
        </nav>
      </div>
    </header>
  );
}
