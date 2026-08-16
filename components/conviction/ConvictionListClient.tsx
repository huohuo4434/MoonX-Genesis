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
  const teaserBySlug = useMemo(() => new Map(WATCHLIST_TEASERS.map((teaser) => [teaser.slug, teaser])), []);
  const rankIndex = useMemo(() => new Map(payload.rankOrder.map((slug, index) => [slug, index])), [payload.rankOrder]);
  const signalBySlug = useMemo(() => new Map((payload.resonanceSignals ?? []).map((signal) => [signal.slug, signal])), [payload.resonanceSignals]);
  const visible = useMemo(
    () => WATCHLIST_TEASERS
      .filter((teaser) => teaser.slug === "spcx" || cardBySlug.has(teaser.slug))
      .filter((teaser) => filter === "ALL" || teaser.assetType === filter)
      .sort((a, b) => (rankIndex.get(a.slug) ?? 999) - (rankIndex.get(b.slug) ?? 999) || a.priority - b.priority),
    [cardBySlug, filter, rankIndex]
  );
  const rankedSignals = useMemo(() => (payload.resonanceSignals ?? []).filter((signal) => {
    const teaser = teaserBySlug.get(signal.slug);
    return teaser && (filter === "ALL" || teaser.assetType === filter);
  }), [filter, payload.resonanceSignals, teaserBySlug]);
  const publicRankedSlugs = useMemo(() => payload.rankOrder.filter((slug) => {
    const teaser = teaserBySlug.get(slug);
    return teaser && (filter === "ALL" || teaser.assetType === filter);
  }), [filter, payload.rankOrder, teaserBySlug]);
  const filters = en
    ? ([['ALL', 'All'], ['STOCK', 'Stocks'], ['CRYPTO', 'Crypto']] as const)
    : ([['ALL', '全部'], ['STOCK', '股票'], ['CRYPTO', '加密资产']] as const);
  const trackedCount = payload.trackedCount + (cardBySlug.has("spcx") ? 0 : 1);
  const weekLabel = payload.resonanceWindow.labelZh;

  return (
    <div className="min-h-screen bg-[#07080a] text-white">
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-10">
        <header className="relative overflow-hidden rounded-[24px] border border-white/[.08] bg-[radial-gradient(circle_at_82%_0%,rgba(84,170,255,.12),transparent_32%),linear-gradient(145deg,#0c0f15,#08090c)] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-4 -top-10 text-[clamp(90px,18vw,190px)] font-black tracking-[-.08em] text-white/[.025]">MOOX</div>
          <div className="relative z-10 max-w-4xl">
            <p className="font-mono text-caption uppercase tracking-[0.22em] text-cyan-200/55">{en ? "MOOX SPECIAL RESEARCH" : "MOOX 重点关注 · 专题研究"}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              {payload.mode === "publicOnly"
                ? (en ? "The assets worth watching first next week are already ranked." : "下周先看谁，答案已经排好顺序。")
                : (en ? "Start with the clearest setups for the target week." : "下周先看谁，按当前信号清晰度直接排。")}
            </h1>
            <p className="mt-4 max-w-3xl text-body leading-7 text-white/58">
              {payload.mode === "publicOnly"
                ? (en ? "This is not a flat list of popular assets. The higher a dossier sits, the more attention it deserves first. Public cards reveal research depth and selected clues; the decisive call, timing and execution map stay inside the full dossier." : "重点关注不是把所有资产平铺给你。越靠前，越值得先打开专题。公开卡只展示研究深度和部分节奏线索，真正的结论、关键时间与执行位置留在完整专题。")
                : (en ? "Open the front-ranked dossiers first, then use the full page for the target-week call, weekly rhythm, key timing and execution levels." : "先看前排，再进专题拿目标周结论、周内节奏、关键时间和执行位置；不需要在十几个标的之间自己猜谁更值得先看。")}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-white/60">
              <p>{en ? "Research dossiers" : "当前专题"}: <span className="text-white">{trackedCount}</span></p>
              {payload.latestResearchUpdatedAt ? <p>{en ? "Latest update" : "最近研究更新"}: <span className="text-white">{formatDate(payload.latestResearchUpdatedAt, en)}</span></p> : null}
              <p className="text-amber-100/75">{payload.mode === "publicOnly"
                ? (en ? "The ordering itself is a clue; the decisive answer stays locked." : "顺序本身就是线索；越靠前，越值得优先研究，真正答案仍留在专题里。")
                : (en ? "The front of the list is the first research tier for the target week." : "前排就是目标周第一研究梯队；方向和证据在会员专题里直接展开。")}</p>
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
              {en ? "What members get →" : "会员直接看到什么 →"}
            </Link>
          ) : (
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[.06] px-3 py-1.5 text-caption text-emerald-100/80">{en ? "Member access active" : "会员完整研究已解锁"}</span>
          )}
        </div>

        <section className="mt-6 overflow-hidden rounded-[22px] border border-amber-300/15 bg-[radial-gradient(circle_at_12%_0%,rgba(251,191,36,.10),transparent_32%),#0a0c11] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-caption uppercase tracking-[.16em] text-amber-200/60">{en ? (payload.mode === "publicOnly" ? "NEXT-WEEK PRIORITY" : "TARGET-WEEK PRIORITY") : (payload.mode === "publicOnly" ? "下周优先关注" : "目标周优先级")}</p>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{en ? `Priority watchlist · ${weekLabel}` : `${weekLabel}：这几个先看`}</h2>
              <p className="mt-2 max-w-3xl text-body-sm leading-7 text-white/58">
                {payload.mode === "publicOnly"
                  ? (en ? "The front of the list contains the setups with the clearest concentration of research signals. Public view tells you what deserves attention first; the full direction and timing stay locked." : "靠前不代表最热，而是当前研究里最值得先盯的几只。公开页只告诉你谁值得优先看；真正方向、关键时间和执行区进入专题后才揭晓。")
                  : (en ? "Higher-ranked dossiers have stronger target-week alignment. Bullish and bearish opportunities can both rank near the top; execution levels are shown inside each dossier." : "越靠前，目标周信号越集中。看多和看空机会都可能排在前面；进入专题后直接看唯一方向、周内节奏和执行位置。")}
              </p>
            </div>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/[.07] px-3 py-1.5 text-caption text-amber-100/85">
              {en ? "Top 3 = first research tier" : "前3名 = 本周先看"}
            </span>
          </div>

          {payload.mode === "fullAccess" ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {rankedSignals.slice(0, 3).map((signal, index) => {
                const teaser = teaserBySlug.get(signal.slug);
                const card = cardBySlug.get(signal.slug);
                const name = en ? (teaser?.nameEn || card?.nameEn || signal.slug.toUpperCase()) : (teaser?.nameZh || card?.nameZh || signal.slug.toUpperCase());
                return (
                  <Link key={signal.slug} href={href(teaser?.detailHref || card?.detailHref || `/featured-stocks/${signal.slug}`)} className={`rounded-xl border p-4 transition hover:-translate-y-0.5 ${signal.direction === "BULLISH" ? "border-emerald-300/20 bg-emerald-300/[.045]" : signal.direction === "BEARISH" ? "border-rose-300/20 bg-rose-300/[.045]" : "border-amber-300/20 bg-amber-300/[.035]"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-sm font-semibold text-amber-100">#{index + 1}</span>
                      <span className="text-caption text-white/45">{signal.strengthZh}</span>
                    </div>
                    <p className="mt-3 text-xl font-semibold text-white">{name}</p>
                    <p className={`mt-2 text-lg font-semibold ${signal.direction === "BULLISH" ? "text-emerald-200" : signal.direction === "BEARISH" ? "text-rose-200" : "text-amber-100"}`}>{signal.direction === "BULLISH" ? "↑ 看涨" : signal.direction === "BEARISH" ? "↓ 看跌" : "↔ 方向不明确"}</p>
                    <p className="mt-2 text-caption leading-6 text-white/55">{signal.evidenceZh.join(" · ")}</p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {publicRankedSlugs.slice(0, 3).map((slug, index) => {
                const teaser = teaserBySlug.get(slug);
                const card = cardBySlug.get(slug);
                const name = en ? (teaser?.nameEn || card?.nameEn || slug.toUpperCase()) : (teaser?.nameZh || card?.nameZh || slug.toUpperCase());
                return (
                  <div key={slug} className="rounded-xl border border-white/[.08] bg-black/20 p-4">
                    <p className="font-mono text-sm font-semibold text-amber-100">#{index + 1}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{name}</p>
                    <p className="mt-2 text-caption text-white/45">{en ? "The full answer and timing map are inside the member dossier." : "完整答案、周内节奏和关键时间仅在会员专题展开。"}</p>
                  </div>
                );
              })}
            </div>
          )}

          {payload.mode === "fullAccess" && rankedSignals.length > 3 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {rankedSignals.slice(3).map((signal, index) => {
                const teaser = teaserBySlug.get(signal.slug);
                const card = cardBySlug.get(signal.slug);
                const name = en ? (teaser?.nameEn || card?.nameEn || signal.slug.toUpperCase()) : (teaser?.nameZh || card?.nameZh || signal.slug.toUpperCase());
                return <span key={signal.slug} className="rounded-full border border-white/10 bg-white/[.025] px-3 py-1.5 text-caption text-white/55">#{index + 4} {name} · {signal.strengthZh}</span>;
              })}
            </div>
          ) : null}
        </section>

                <section className="mt-6 rounded-[22px] border border-violet-300/15 bg-violet-300/[.035] p-5 sm:p-6">
          <p className="font-mono text-caption uppercase tracking-[.16em] text-violet-200/60">{en ? "MEMBER WEEKLY ALPHA" : "会员独享 · 本周精选5"}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{en ? "Weekly Top 5 stays behind the member gate" : "本周最值得交易的5个标的，只在会员周报公布"}</h2>
          <p className="mt-2 max-w-3xl text-body-sm leading-7 text-white/58">{en ? "This dossier index is intentionally neutral. Members receive ranked Top 5, hexagram evidence, support/resistance and weekly path." : "这里不再通过列表顺序暗示本周热门。Top 5、方向、支撑压力和周内推演只进入会员周报。"}</p>
        </section>

<div className="mt-6 space-y-6">
          {visible.map((teaser) => {
            const rank = (rankIndex.get(teaser.slug) ?? -1) + 1;
            void rank; // V7.17.4: public rank badge removed; consume private dead value for strict TS.
            return <ResearchSpotlightCard key={teaser.slug} teaser={teaser} card={cardBySlug.get(teaser.slug)} mode={payload.mode} signal={signalBySlug.get(teaser.slug)} targetWeekLabel={weekLabel} />;
          })}
        </div>

        {!visible.length ? <Text variant="body-sm" className="mt-8 text-white/55">{en ? "No published research-watchlist assets yet." : "暂无已发布的重点关注资产。"}</Text> : null}

        <footer className="mt-12 border-t border-white/[0.08] pt-6">
          <p className="max-w-3xl text-caption leading-relaxed text-white/40">{en ? "MOOX provides multi-horizon metaphysical direction research, technical level references and research archives. Direction calls do not guarantee outcomes and are not investment advice." : "MOOX提供多周期玄学方向研究、技术点位与长期跟踪记录。方向结论不代表保证盈利；所有内容仅供研究参考，不构成任何投资建议。"}</p>
        </footer>
      </div>
    </div>
  );
}
