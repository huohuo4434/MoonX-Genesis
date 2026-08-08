"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { GOOGLE_FOCUS_RESEARCH_20260808 } from "@/lib/data/conviction/google-focus-research-20260808";

export default function GoogleWatchlistFeature() {
  const { locale, href } = useLocale();
  const en = locale === "en";
  const r = GOOGLE_FOCUS_RESEARCH_20260808;
  return (
    <section className="relative overflow-hidden rounded-[20px] border border-blue-400/25 bg-[radial-gradient(circle_at_82%_18%,rgba(79,70,229,.18),transparent_34%),linear-gradient(145deg,rgba(10,24,46,.98),rgba(8,13,28,.98))] p-6 shadow-[0_18px_48px_rgba(1,8,20,.32)]">
      <div className="pointer-events-none absolute -bottom-8 -right-2 text-[clamp(80px,15vw,165px)] font-black tracking-[-.08em] text-blue-300/[.045]">GOOGL</div>
      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-2 text-caption font-semibold tracking-[.08em] text-blue-300">
          <span className="rounded-full border border-blue-300/30 bg-blue-400/10 px-2.5 py-1">{en ? "Featured research" : "重点研究更新"}</span>
          <span>{en ? "Updated Aug 8, 2026" : "双框架复核 · 2026-08-08"}</span>
        </div>
        <h2 className="mt-3 max-w-[900px] text-[clamp(26px,4vw,42px)] font-semibold leading-[1.12] tracking-[-.035em] text-white">
          {en ? "Google: strongest window from mid-August into early September" : r.title}
        </h2>
        <p className="mt-4 max-w-[920px] text-body-sm leading-8 text-slate-300">
          {en ? "The updated two-framework Liu Yao sequence is highly coherent: breakout, repair, continuation, then consolidation. September brings more disagreement; October–November are less directional; December improves again." : r.publicSummary}
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><p className="text-caption text-white/45">{en ? "Direction" : "研究方向"}</p><p className="mt-1 font-semibold text-emerald-300">{en ? "Medium-term bullish" : r.direction}</p></div>
          <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><p className="text-caption text-white/45">{en ? "Consistency" : "卦象连贯度"}</p><p className="mt-1 font-semibold text-white">★★★★★</p></div>
          <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><p className="text-caption text-white/45">{en ? "Core window" : "核心顺风窗口"}</p><p className="mt-1 font-semibold text-cyan-200">{r.coreWindow}</p></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={href("/featured-stocks/googl")} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-200 to-blue-400 px-4 text-body-sm font-semibold text-slate-950">{en ? "Open Google research" : "查看 Google 重点研究"}</Link>
          <Link href={href("/pricing")} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-300/30 bg-blue-950/35 px-4 text-body-sm font-semibold text-blue-100">{en ? "Unlock daily path" : "解锁逐日完整路径"}</Link>
        </div>
      </div>
    </section>
  );
}
