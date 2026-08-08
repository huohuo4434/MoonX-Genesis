"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Text } from "@/components/ui";
import ResearchSpotlightCard from "@/components/conviction/ResearchSpotlightCard";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatDateChina } from "@/lib/utils/datetime";
import type { ConvictionListPagePayload } from "@/lib/data/conviction/access";
import { WATCHLIST_TEASERS } from "@/lib/data/conviction/watchlist-teasers";

function formatDate(value: string, en: boolean): string {
  if (!en) return formatDateChina(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  }).format(date);
}

export function ConvictionListClient({ payload }: { payload: ConvictionListPagePayload }) {
  const { locale, href } = useLocale();
  const en = locale === "en";
  const [filter, setFilter] = useState<"ALL" | "STOCK" | "CRYPTO">("ALL");
  const cardBySlug = useMemo(() => new Map(payload.cards.map((card) => [card.slug, card])), [payload.cards]);
  const visible = useMemo(
    () => WATCHLIST_TEASERS
      .filter((teaser) => teaser.slug === "spcx" || cardBySlug.has(teaser.slug))
      .filter((teaser) => filter === "ALL" || teaser.assetType === filter)
      .sort((a, b) => a.priority - b.priority),
    [cardBySlug, filter]
  );
  const filters = en
    ? ([['ALL', 'All'], ['STOCK', 'Stocks'], ['CRYPTO', 'Crypto']] as const)
    : ([['ALL', '全部'], ['STOCK', '股票'], ['CRYPTO', '加密资产']] as const);
  const trackedCount = payload.trackedCount + (cardBySlug.has("spcx") ? 0 : 1);

  return (
    <div className="min-h-screen bg-[#07080a] text-white">
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-10">
        <header className="relative overflow-hidden rounded-[24px] border border-white/[.08] bg-[radial-gradient(circle_at_82%_0%,rgba(84,170,255,.12),transparent_32%),linear-gradient(145deg,#0c0f15,#08090c)] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-4 -top-10 text-[clamp(90px,18vw,190px)] font-black tracking-[-.08em] text-white/[.025]">MOOX</div>
          <div className="relative z-10 max-w-4xl">
            <p className="font-mono text-caption uppercase tracking-[0.22em] text-cyan-200/55">{en ? "MOOX SPECIAL RESEARCH" : "MOOX 重点关注 · 专题研究"}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              {en ? "See the depth. Unlock the answer." : "公开看研究深度，会员看真正答案。"}
            </h1>
            <p className="mt-4 max-w-3xl text-body leading-7 text-white/58">
              {en
                ? "Public pages show why an asset matters, what MOOX has researched, and which variables remain unresolved. Direction, timing windows, support/resistance and full Liu Yao evidence are kept inside the member dossier."
                : "公开页只告诉你：为什么值得研究、MOOX已经研究到哪一层、现在最值得盯什么。真正可用于决策的方向路径、关键日期、支撑压力和完整卦象证据只在会员专题里展示。"}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-white/60">
              <p>{en ? "Research dossiers" : "当前专题"}: <span className="text-white">{trackedCount}</span></p>
              {payload.latestResearchUpdatedAt ? <p>{en ? "Latest update" : "最近研究更新"}: <span className="text-white">{formatDate(payload.latestResearchUpdatedAt, en)}</span></p> : null}
              <p className="text-amber-100/75">{en ? "Public preview intentionally excludes actionable forecast answers." : "公开预览主动隐藏可交易结论，不再把会员价值泄露在展板上。"}</p>
            </div>
          </div>
        </header>

        {payload.deviceAccessRequired ? (
          <div className="mt-6 rounded-lg border border-amber-400/20 bg-amber-400/[0.05] p-4 text-body-sm text-amber-100">
            {en ? "Confirm this device to display full paid research." : "当前付费账号需要确认本设备后才能显示完整研究。"}
            <Link className="ml-1 underline" href={href("/account#account-security")}>{en ? "Manage trusted devices" : "管理登录设备"}</Link>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" aria-label={en ? "Research watchlist filters" : "重点资产筛选"}>
            {filters.map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-11 rounded-xl border px-4 text-body-sm transition-colors ${filter === value ? "border-cyan-300/35 bg-cyan-300/[.08] text-white" : "border-white/10 text-white/60 hover:border-white/20 hover:text-white"}`}>{label}</button>
            ))}
          </div>
          {payload.mode === "publicOnly" ? (
            <Link href={href("/pricing")} className="text-body-sm font-medium text-cyan-200/80 hover:text-cyan-100">
              {en ? "What membership unlocks →" : "会员到底多看到什么 →"}
            </Link>
          ) : (
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[.06] px-3 py-1.5 text-caption text-emerald-100/80">{en ? "Member access active" : "会员完整研究已解锁"}</span>
          )}
        </div>

        <div className="mt-6 space-y-6">
          {visible.map((teaser) => (
            <ResearchSpotlightCard key={teaser.slug} teaser={teaser} card={cardBySlug.get(teaser.slug)} mode={payload.mode} />
          ))}
        </div>

        {!visible.length ? <Text variant="body-sm" className="mt-8 text-white/55">{en ? "No published research-watchlist assets yet." : "暂无已发布的重点关注资产。"}</Text> : null}

        <footer className="mt-12 border-t border-white/[0.08] pt-6">
          <p className="max-w-3xl text-caption leading-relaxed text-white/40">{en ? "MOOX provides market research and probability-based outlooks. Nothing on this page is investment advice." : "MOOX提供市场研究、概率预测和长期跟踪观点。所有内容仅供研究参考，不构成任何投资建议。"}</p>
        </footer>
      </div>
    </div>
  );
}
