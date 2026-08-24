import Link from "next/link";
import { Suspense } from "react";
import { HomeOfficialAccountTile } from "@/components/home/HomeOfficialAccountTile";
import { HomeIntradayLevelPair } from "@/components/home/HomeIntradayLevelPair";

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

export function HomeMobileAppView({
  canViewDaily,
  accessMessage,
  markets,
  resonanceCount,
  divergenceCount,
  publishedCount,
}: {
  canViewDaily: boolean;
  accessMessage: string;
  markets: MobileHomeMarket[];
  resonanceCount: number;
  divergenceCount: number;
  publishedCount: number;
}) {
  if (!canViewDaily) {
    return (
      <div className="md:hidden">
        <section className="px-4 pt-5">
          <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(124,92,255,.24),transparent_36%),linear-gradient(160deg,#15132a_0%,#090a10_66%)] p-5 shadow-[0_24px_70px_rgba(0,0,0,.35)]">
            <p className="text-[11px] font-medium tracking-[0.22em] text-violet-300">MOOX INTELLIGENCE</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">九大市场每日方向研究</h1>
            <p className="mt-3 text-sm leading-6 text-white/65">看方向，等确认，守失效。预测先锁定，结果再公开验证。</p>
            <p className="mt-2 text-xs leading-5 text-white/42">{accessMessage}</p>
            <div className="mt-5 grid gap-2">
              <Link href="/register?next=/" className="flex min-h-11 items-center justify-center rounded-full bg-violet-500 px-5 py-2.5 text-sm font-medium text-white">免费注册看今日</Link>
              <Link href="/verification" className="flex min-h-11 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/[0.08] px-5 py-2.5 text-sm font-medium text-cyan-100">查看公开验证</Link>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <RadarStat label="核心市场" value="9" tone="text-white" />
              <RadarStat label="日／周／月" value="3层" tone="text-violet-200" />
              <RadarStat label="失败也保留" value="公开" tone="text-emerald-200" />
            </div>
          </div>
        </section>

        <section className="px-4 pt-5">
          <p className="text-[11px] tracking-[0.18em] text-white/35">HOW TO READ</p>
          <h2 className="mt-1 text-lg font-semibold">研究不是一句涨或跌</h2>
          <div className="mt-3 grid gap-3">
            {[
              ["01", "先看方向", "明确当前阶段最主要的行情判断。"],
              ["02", "再等确认", "支撑、压力与市场结构决定是否执行。"],
              ["03", "最后守失效", "条件不再成立时停止执行或降低风险。"],
            ].map(([step, title, body]) => <div key={step} className="flex gap-3 rounded-3xl border border-white/8 bg-white/[0.025] p-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-xs font-semibold text-violet-200">{step}</span><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-white/45">{body}</p></div></div>)}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 px-4 pb-2 pt-5">
          <Link href="/guide" className="rounded-3xl border border-white/8 bg-white/[0.025] p-4"><p className="text-[11px] tracking-[0.16em] text-cyan-300/65">60秒了解</p><h3 className="mt-1 font-semibold">新手指南</h3><p className="mt-2 text-xs leading-5 text-white/38">看懂方向、信心、位置与失效。</p></Link>
          <Link href="/pricing" className="rounded-3xl border border-violet-400/12 bg-violet-500/[0.055] p-4"><p className="text-[11px] tracking-[0.16em] text-violet-300/70">会员权益</p><h3 className="mt-1 font-semibold">查看方案</h3><p className="mt-2 text-xs leading-5 text-white/38">比较免费用户与会员能看到的内容。</p></Link>
        </section>
      </div>
    );
  }

  return (
    <div className="md:hidden">
      <section className="px-4 pt-5">
        <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(124,92,255,.24),transparent_36%),linear-gradient(160deg,#15132a_0%,#090a10_66%)] p-5 shadow-[0_24px_70px_rgba(0,0,0,.35)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium tracking-[0.22em] text-violet-300">MOOX TODAY</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">今日共振雷达</h1>
            </div>
            <Link href="/member/daily" className="rounded-full border border-violet-400/20 bg-violet-500/12 px-3 py-1.5 text-xs text-violet-100">日报 →</Link>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <RadarStat label="奇六共振" value={resonanceCount} tone="text-emerald-200" />
            <RadarStat label="存在分歧" value={divergenceCount} tone="text-amber-100" />
            <RadarStat label="已发布" value={`${publishedCount}/9`} tone="text-white" />
          </div>
        </div>
      </section>

      <section className="px-4 pt-4">
        <div className="flex items-center justify-between"><div><p className="text-[11px] tracking-[0.18em] text-white/35">FOCUS</p><h2 className="mt-1 text-lg font-semibold">最值得关注的3个市场</h2></div><Link href="/member/daily" className="text-xs text-violet-200">全部 →</Link></div>
        <div className="mt-3 grid gap-3">
          {markets.length ? markets.map((market, index) => <Link key={market.symbol} href="/member/daily" className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-xs font-semibold text-white/60">{index + 1}</span><div><div className="font-semibold">{market.name}</div><div className="mt-0.5 text-xs text-white/35">{market.symbol} · {market.resonance || "关系待确认"}</div></div></div><div className="text-right"><div className="text-sm font-semibold text-violet-100">{market.direction}</div><div className="mt-1 text-[11px] tracking-[0.08em] text-amber-200">{"★".repeat(market.confidenceStars)}{"☆".repeat(Math.max(0, 5 - market.confidenceStars))}</div></div></div>
            {market.reason ? <p className="mt-3 line-clamp-2 text-xs leading-5 text-white/48">{market.reason}</p> : null}
            <Suspense fallback={<div className="mt-3 text-[11px] text-white/30">1H技术位计算中…</div>}><HomeIntradayLevelPair symbol={market.symbol} direction={market.direction} fallbackSupport={market.support} fallbackResistance={market.resistance} mode="inline" /></Suspense>
          </Link>) : <div className="rounded-3xl border border-dashed border-white/10 p-5 text-sm text-white/40">今日研究尚未形成可展示的重点市场。</div>}
        </div>
      </section>

      <section className="px-4 pt-5">
        <div className="grid grid-cols-2 gap-3">
          <HomeOfficialAccountTile />
          <Link href="/member/strategy" className="rounded-3xl border border-violet-400/12 bg-[linear-gradient(150deg,rgba(33,20,55,.95),rgba(8,9,14,.98))] p-4"><p className="text-[11px] tracking-[0.16em] text-violet-300/70">STRATEGY</p><h3 className="mt-1 font-semibold">策略中心</h3><p className="mt-3 text-2xl font-semibold">3</p><p className="mt-1 text-xs text-white/38">现有策略母版</p></Link>
        </div>
      </section>

    </div>
  );
}

function RadarStat({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-center"><div className={`text-xl font-semibold ${tone}`}>{value}</div><div className="mt-1 text-[10px] text-white/35">{label}</div></div>;
}
