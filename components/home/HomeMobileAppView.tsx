import Link from "next/link";

export type MobileHomeMarket = {
  symbol: string;
  name: string;
  direction: string;
  confidenceStars: number;
  resonance: string;
  support: string;
  resistance: string;
  reason: string;
};

export type MobileHomeVerification = {
  id: string;
  assetName: string;
  date: string;
  predicted: string;
  actual: string;
  verdict: string;
};

export function HomeMobileAppView({
  canViewDaily,
  accessMessage,
  markets,
  resonanceCount,
  divergenceCount,
  publishedCount,
  livePublicReadable,
  openOfficialPositions,
  verification,
}: {
  canViewDaily: boolean;
  accessMessage: string;
  markets: MobileHomeMarket[];
  resonanceCount: number;
  divergenceCount: number;
  publishedCount: number;
  livePublicReadable: boolean;
  openOfficialPositions: number;
  verification: MobileHomeVerification[];
}) {
  return (
    <div className="md:hidden pb-24">
      <section className="px-4 pt-5">
        <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(124,92,255,.24),transparent_36%),linear-gradient(160deg,#15132a_0%,#090a10_66%)] p-5 shadow-[0_24px_70px_rgba(0,0,0,.35)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium tracking-[0.22em] text-violet-300">MOOX TODAY</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">今日共振雷达</h1>
            </div>
            <Link href="/member/daily" className="rounded-full border border-violet-400/20 bg-violet-500/12 px-3 py-1.5 text-xs text-violet-100">日报 →</Link>
          </div>

          {canViewDaily ? (
            <div className="mt-5 grid grid-cols-3 gap-2">
              <RadarStat label="奇六共振" value={resonanceCount} tone="text-emerald-200" />
              <RadarStat label="存在分歧" value={divergenceCount} tone="text-amber-100" />
              <RadarStat label="已发布" value={`${publishedCount}/9`} tone="text-white" />
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-violet-400/15 bg-violet-500/[0.07] p-4">
              <p className="text-sm font-medium">登录后查看今日完整研究</p>
              <p className="mt-1 text-xs leading-5 text-white/45">{accessMessage}</p>
              <Link href="/login?next=/" className="mt-3 inline-flex rounded-full bg-violet-500 px-4 py-2 text-xs font-medium">登录查看</Link>
            </div>
          )}
        </div>
      </section>

      <section className="px-4 pt-4">
        <div className="flex items-center justify-between"><div><p className="text-[11px] tracking-[0.18em] text-white/35">FOCUS</p><h2 className="mt-1 text-lg font-semibold">最值得关注的3个市场</h2></div><Link href="/member/daily" className="text-xs text-violet-200">全部 →</Link></div>
        <div className="mt-3 grid gap-3">
          {markets.length ? markets.map((market, index) => <Link key={market.symbol} href="/member/daily" className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-xs font-semibold text-white/60">{index + 1}</span><div><div className="font-semibold">{market.name}</div><div className="mt-0.5 text-xs text-white/35">{market.symbol} · {market.resonance || "关系待确认"}</div></div></div><div className="text-right"><div className="text-sm font-semibold text-violet-100">{market.direction}</div><div className="mt-1 text-[11px] tracking-[0.08em] text-amber-200">{"★".repeat(market.confidenceStars)}{"☆".repeat(Math.max(0, 5 - market.confidenceStars))}</div></div></div>
            {market.reason ? <p className="mt-3 line-clamp-2 text-xs leading-5 text-white/48">{market.reason}</p> : null}
            <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-white/36"><span>支撑 {market.support}</span><span>压力 {market.resistance}</span></div>
          </Link>) : <div className="rounded-3xl border border-dashed border-white/10 p-5 text-sm text-white/40">今日研究尚未形成可展示的重点市场。</div>}
        </div>
      </section>

      <section className="px-4 pt-5">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/member/ai-trading" className="rounded-3xl border border-cyan-400/12 bg-[linear-gradient(150deg,rgba(7,34,42,.95),rgba(7,9,14,.98))] p-4"><p className="text-[11px] tracking-[0.16em] text-cyan-300/70">TRADE</p><h3 className="mt-1 font-semibold">官方账户 / AI</h3><p className="mt-3 text-2xl font-semibold">{livePublicReadable ? openOfficialPositions : "—"}</p><p className="mt-1 text-xs text-white/38">{livePublicReadable ? "当前公开持仓" : "公示接口暂不可读"}</p></Link>
          <Link href="/member/strategy" className="rounded-3xl border border-violet-400/12 bg-[linear-gradient(150deg,rgba(33,20,55,.95),rgba(8,9,14,.98))] p-4"><p className="text-[11px] tracking-[0.16em] text-violet-300/70">STRATEGY</p><h3 className="mt-1 font-semibold">策略中心</h3><p className="mt-3 text-2xl font-semibold">3</p><p className="mt-1 text-xs text-white/38">现有策略母版</p></Link>
        </div>
      </section>

      <section className="px-4 pt-5">
        <div className="flex items-center justify-between"><div><p className="text-[11px] tracking-[0.18em] text-white/35">VERIFICATION</p><h2 className="mt-1 text-lg font-semibold">最近验证</h2></div><Link href="/verification" className="text-xs text-emerald-200">历史 →</Link></div>
        <div className="mt-3 overflow-hidden rounded-3xl border border-white/8 bg-white/[0.025]">
          {verification.length ? verification.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-4 last:border-b-0"><div><div className="font-medium">{item.assetName}</div><div className="mt-1 text-xs text-white/38">{item.date} · 预测 {item.predicted} · 实际 {item.actual}</div></div><span className="shrink-0 rounded-full border border-emerald-400/18 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">{item.verdict}</span></div>) : <div className="p-5 text-sm text-white/40">暂无可展示的已验证记录。</div>}
        </div>
      </section>
    </div>
  );
}

function RadarStat({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-center"><div className={`text-xl font-semibold ${tone}`}>{value}</div><div className="mt-1 text-[10px] text-white/35">{label}</div></div>;
}
