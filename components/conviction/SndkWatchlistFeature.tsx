"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SNDK_FOCUS_PROMO_20260808 } from "@/lib/data/conviction/google-focus-research-20260808";

export default function SndkWatchlistFeature() {
  const { locale, href } = useLocale();
  const en = locale === "en";
  const r = SNDK_FOCUS_PROMO_20260808;
  return (
    <section className="relative overflow-hidden rounded-[20px] border border-rose-400/20 bg-[radial-gradient(circle_at_82%_18%,rgba(251,113,133,.13),transparent_34%),linear-gradient(145deg,rgba(38,15,27,.98),rgba(18,11,18,.98))] p-6 shadow-[0_18px_48px_rgba(20,1,8,.28)]">
      <div className="pointer-events-none absolute -bottom-8 -right-2 text-[clamp(80px,15vw,165px)] font-black tracking-[-.08em] text-rose-200/[.04]">SNDK</div>
      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-2 text-caption font-semibold tracking-[.08em] text-rose-300">
          <span className="rounded-full border border-rose-300/25 bg-rose-400/10 px-2.5 py-1">{en ? "Memory-cycle watch" : "存储周期重点观察"}</span>
          <span>{en ? "Updated Aug 8, 2026" : "双框架复核 · 2026-08-08"}</span>
        </div>
        <h2 className="mt-3 max-w-[900px] text-[clamp(25px,4vw,40px)] font-semibold leading-[1.12] tracking-[-.035em] text-white">
          {en ? "SNDK: medium-term constructive, but late-August volatility matters" : r.title}
        </h2>
        <p className="mt-4 max-w-[920px] text-body-sm leading-8 text-slate-300">
          {en ? "The medium-term setup remains constructive, but SNDK is more exposed to the NAND pricing and inventory cycle. The key late-August window is a potential rally followed by a sharp pullback and repair." : r.publicSummary}
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-caption text-white/45">{en ? "Direction" : "研究方向"}</p><p className="mt-1 font-semibold text-emerald-300">{en ? "Medium-term bullish" : r.direction}</p></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-caption text-white/45">{en ? "Primary window" : "重点窗口"}</p><p className="mt-1 font-semibold text-amber-200">{r.coreWindow}</p></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-caption text-white/45">{en ? "Risk window" : "主要回撤窗口"}</p><p className="mt-1 font-semibold text-rose-300">{r.riskWindow}</p></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={href("/featured-stocks/sandisk")} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br from-rose-200 to-orange-300 px-4 text-body-sm font-semibold text-slate-950">{en ? "Open SNDK research" : "查看 SNDK 重点研究"}</Link>
          <Link href={href("/pricing")} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-300/25 bg-rose-950/25 px-4 text-body-sm font-semibold text-rose-100">{en ? "Unlock full roadmap" : "解锁会员完整路径"}</Link>
        </div>
      </div>
    </section>
  );
}
