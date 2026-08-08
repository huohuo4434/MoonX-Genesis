"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { ConvictionPublicCard } from "@/types/conviction-asset";
import type { WatchlistTeaser } from "@/lib/data/conviction/watchlist-teasers";

type Props = {
  teaser: WatchlistTeaser;
  card?: ConvictionPublicCard;
  mode: "publicOnly" | "fullAccess";
};

const ACCENTS: Record<WatchlistTeaser["accent"], {
  border: string;
  glow: string;
  badge: string;
  title: string;
  button: string;
}> = {
  gold: { border: "border-amber-300/20", glow: "from-amber-300/[.10] via-transparent to-transparent", badge: "border-amber-300/25 bg-amber-300/10 text-amber-200", title: "text-amber-100", button: "from-amber-200 to-yellow-400" },
  rose: { border: "border-rose-300/20", glow: "from-rose-300/[.10] via-transparent to-transparent", badge: "border-rose-300/25 bg-rose-300/10 text-rose-200", title: "text-rose-100", button: "from-rose-200 to-orange-300" },
  blue: { border: "border-blue-300/20", glow: "from-blue-300/[.10] via-transparent to-transparent", badge: "border-blue-300/25 bg-blue-300/10 text-blue-200", title: "text-blue-100", button: "from-cyan-200 to-blue-400" },
  cyan: { border: "border-cyan-300/20", glow: "from-cyan-300/[.10] via-transparent to-transparent", badge: "border-cyan-300/25 bg-cyan-300/10 text-cyan-200", title: "text-cyan-100", button: "from-cyan-200 to-teal-300" },
  emerald: { border: "border-emerald-300/20", glow: "from-emerald-300/[.10] via-transparent to-transparent", badge: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200", title: "text-emerald-100", button: "from-emerald-200 to-cyan-300" },
  violet: { border: "border-violet-300/20", glow: "from-violet-300/[.10] via-transparent to-transparent", badge: "border-violet-300/25 bg-violet-300/10 text-violet-200", title: "text-violet-100", button: "from-violet-200 to-fuchsia-300" },
  indigo: { border: "border-indigo-300/20", glow: "from-indigo-300/[.10] via-transparent to-transparent", badge: "border-indigo-300/25 bg-indigo-300/10 text-indigo-200", title: "text-indigo-100", button: "from-indigo-200 to-violet-300" },
  slate: { border: "border-slate-300/15", glow: "from-slate-300/[.08] via-transparent to-transparent", badge: "border-slate-300/20 bg-slate-300/[.08] text-slate-200", title: "text-slate-100", button: "from-slate-100 to-slate-300" },
};

function assetTypeLabel(type: WatchlistTeaser["assetType"], en: boolean) {
  if (type === "CRYPTO") return en ? "Crypto" : "加密资产";
  if (type === "ETF") return "ETF";
  if (type === "INDEX") return en ? "Index" : "指数";
  if (type === "COMMODITY") return en ? "Commodity" : "商品";
  return en ? "Stock" : "股票";
}

export default function ResearchSpotlightCard({ teaser, card, mode }: Props) {
  const { locale, href } = useLocale();
  const en = locale === "en";
  const accent = ACCENTS[teaser.accent];
  const name = en ? (teaser.nameEn || card?.nameEn || card?.nameZh || teaser.slug.toUpperCase()) : (teaser.nameZh || card?.nameZh || teaser.slug.toUpperCase());
  const symbol = teaser.symbol || card?.symbol || teaser.slug.toUpperCase();
  const rating = teaser.rating || card?.rating || "A";
  const risk = teaser.riskZh || card?.riskLevel || "高";
  const detailHref = teaser.detailHref || card?.detailHref || `/featured-stocks/${teaser.slug}`;
  const locked = mode === "publicOnly";
  const lockedItems = en ? teaser.lockedPreviewEn : teaser.lockedPreviewZh;

  return (
    <article className={`group relative overflow-hidden rounded-[22px] border ${accent.border} bg-[#0a0c11] shadow-[0_20px_65px_rgba(0,0,0,.22)]`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.glow}`} />
      <div className="pointer-events-none absolute -bottom-8 -right-1 select-none text-[clamp(72px,13vw,150px)] font-black tracking-[-.08em] text-white/[.035]">
        {symbol}
      </div>

      <div className="relative z-10 p-5 sm:p-6 lg:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-caption font-semibold ${accent.badge}`}>
                {en ? teaser.eyebrowEn : teaser.eyebrowZh}
              </span>
              <Badge variant="outline" className="border-white/10 bg-black/10 text-white/55">{assetTypeLabel(teaser.assetType, en)}</Badge>
            </div>
            <p className="mt-3 text-caption font-mono tracking-[.16em] text-white/35">{symbol} · {en ? "MOOX SPECIAL RESEARCH" : "MOOX 专题研究"}</p>
            <h2 className={`mt-2 max-w-[980px] text-[clamp(25px,3.7vw,40px)] font-semibold leading-[1.14] tracking-[-.035em] ${accent.title}`}>
              {en ? teaser.headlineEn : teaser.headlineZh}
            </h2>
          </div>
          <div className="shrink-0 rounded-xl border border-white/[.08] bg-black/20 px-4 py-3 text-right">
            <p className="text-caption text-white/35">{en ? "MOOX dossier" : "研究档案"}</p>
            <p className="mt-1 font-mono text-lg font-semibold text-white">{name}</p>
            <p className="mt-1 text-caption text-white/45">{en ? "Rating" : "评级"} {rating} · {en ? "Risk" : "风险"} {risk}</p>
          </div>
        </div>

        <p className="mt-4 max-w-[980px] text-body-sm leading-7 text-slate-300/90">
          {en ? teaser.hookEn : teaser.hookZh}
        </p>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1.1fr_1.9fr]">
          <section className="rounded-xl border border-white/[.08] bg-black/20 p-4">
            <p className="text-caption uppercase tracking-[.14em] text-white/35">{en ? "Research coverage" : "研究覆盖"}</p>
            <p className="mt-2 text-body-sm font-medium text-white/85">{en ? teaser.coverageEn : teaser.coverageZh}</p>
            <p className="mt-3 text-caption leading-relaxed text-white/45">
              {locked
                ? (en ? "Public view confirms what has been researched, without exposing the actionable answer." : "公开页确认“研究到了哪里”，但不直接泄露可交易答案。")
                : (en ? "Your member access is active. Open the dossier for the full roadmap." : "当前账号已解锁，进入专题页查看完整路径。")}
            </p>
          </section>

          <section className="relative overflow-hidden rounded-xl border border-white/[.08] bg-gradient-to-br from-white/[.04] to-transparent p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-caption uppercase tracking-[.14em] text-white/35">{en ? "Inside the member dossier" : "会员专题里有什么"}</p>
              <span className={`rounded-full border px-2.5 py-1 text-caption ${locked ? "border-amber-300/20 bg-amber-300/[.06] text-amber-100/80" : "border-emerald-300/20 bg-emerald-300/[.06] text-emerald-100/80"}`}>
                {locked ? (en ? "Locked" : "已锁定") : (en ? "Unlocked" : "已解锁")}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {lockedItems.map((item, index) => (
                <div key={item} className="flex items-center justify-between gap-3 rounded-lg border border-white/[.06] bg-black/15 px-3 py-2.5">
                  <span className="text-body-sm text-white/65">{item}</span>
                  <span className="font-mono text-caption text-white/30">{locked ? `0${index + 1} · LOCK` : `0${index + 1} · OPEN`}</span>
                </div>
              ))}
            </div>
            {locked ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#0a0c11] to-transparent" aria-hidden />
            ) : null}
          </section>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={href(detailHref)} className={`inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br ${accent.button} px-4 text-body-sm font-semibold text-slate-950 transition hover:brightness-105`}>
            {locked ? (en ? "Open public dossier" : "查看公开专题档案") : (en ? "Open full dossier" : "进入完整专题研究")}
          </Link>
          {locked ? (
            <Link href={href("/pricing")} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/[.03] px-4 text-body-sm font-semibold text-white/80 transition hover:bg-white/[.07]">
              {en ? "Unlock direction, dates & levels" : "解锁方向 · 日期 · 支撑压力"}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
