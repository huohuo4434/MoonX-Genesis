"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { WATCHLIST_TEASERS } from "@/lib/data/conviction/watchlist-teasers";
import type { ConvictionListPagePayload } from "@/lib/data/conviction/access";
import type { ConvictionAssetType, ConvictionPublicCard } from "@/types/conviction-asset";
import type { WatchlistResonanceSignal } from "@/lib/data/conviction/resonance-types";

export type RecommendationKind = Extract<ConvictionAssetType, "STOCK" | "CRYPTO">;

type RecommendationRow = {
  slug: string;
  nameZh: string;
  nameEn: string;
  symbol: string;
  detailHref: string;
  summaryZh: string;
  summaryEn: string;
  riskZh: string;
  rating: string;
  updatedAt: string | null;
  signal: WatchlistResonanceSignal | null;
  priority: number;
};

function mergeRows(payload: ConvictionListPagePayload, kind: RecommendationKind): RecommendationRow[] {
  const cardBySlug = new Map<string, ConvictionPublicCard>(payload.cards.map((card) => [card.slug, card]));
  const signalBySlug = new Map((payload.resonanceSignals ?? []).map((signal) => [signal.slug, signal]));
  const signalOrder = new Map((payload.resonanceSignals ?? []).map((signal, index) => [signal.slug, index]));
  return WATCHLIST_TEASERS
    .filter((teaser) => teaser.assetType === kind)
    .filter((teaser) => teaser.slug === "spcx" || cardBySlug.has(teaser.slug))
    .map((teaser) => {
      const card = cardBySlug.get(teaser.slug);
      return {
        slug: teaser.slug,
        nameZh: teaser.nameZh ?? card?.nameZh ?? teaser.slug.toUpperCase(),
        nameEn: teaser.nameEn ?? card?.nameEn ?? teaser.slug.toUpperCase(),
        symbol: teaser.symbol ?? card?.symbol ?? teaser.slug.toUpperCase(),
        detailHref: teaser.detailHref ?? card?.detailHref ?? `/featured-stocks/${teaser.slug}`,
        summaryZh: card?.summaryZh ?? teaser.hookZh,
        summaryEn: card?.summaryEn ?? teaser.hookEn,
        riskZh: card?.riskLevel ?? teaser.riskZh ?? "中高",
        rating: card?.rating ?? teaser.rating ?? "研究中",
        updatedAt: card?.researchUpdatedAt ?? null,
        signal: signalBySlug.get(teaser.slug) ?? null,
        priority: signalOrder.get(teaser.slug) ?? 1000 + teaser.priority,
      };
    })
    .sort((left, right) => left.priority - right.priority || left.slug.localeCompare(right.slug));
}

function signalLabel(signal: WatchlistResonanceSignal | null, en: boolean): string {
  if (!signal) return en ? "Research available" : "研究已发布";
  if (signal.direction === "BULLISH") return en ? "Bullish" : "看涨";
  if (signal.direction === "BEARISH") return en ? "Bearish" : "看跌";
  return en ? "Unclear" : "方向不明确";
}

function signalTone(signal: WatchlistResonanceSignal | null): string {
  if (signal?.direction === "BULLISH") return "border-emerald-300/25 bg-emerald-300/[0.05] text-emerald-100";
  if (signal?.direction === "BEARISH") return "border-rose-300/25 bg-rose-300/[0.05] text-rose-100";
  return "border-sky-300/20 bg-sky-300/[0.04] text-sky-100";
}

export function MemberRecommendationList({ payload, kind }: { payload: ConvictionListPagePayload; kind: RecommendationKind }) {
  const { locale, href } = useLocale();
  const en = locale === "en";
  const rows = mergeRows(payload, kind);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((row) => (
        <Link key={row.slug} href={href(row.detailHref)} className="group rounded-2xl border border-white/[0.08] bg-[#0c0e12] p-5 transition hover:-translate-y-0.5 hover:border-violet-300/25">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xl font-semibold text-white">{en ? row.nameEn : row.nameZh}</p>
              <p className="mt-1 font-mono text-caption text-white/40">{row.symbol}</p>
            </div>
            <div className="flex flex-wrap gap-2"><Badge variant="outline">{en ? `Rating ${row.rating}` : `评级 ${row.rating}`}</Badge><Badge variant="outline">{en ? `Risk ${row.riskZh}` : `风险 ${row.riskZh}`}</Badge></div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2"><span className={`rounded-full border px-3 py-1 text-body-sm font-semibold ${signalTone(row.signal)}`}>{signalLabel(row.signal, en)}</span>{row.signal ? <span className="text-caption text-white/45">{row.signal.strengthZh}</span> : null}</div>
          <p className="mt-3 line-clamp-3 text-body-sm leading-6 text-white/58">{en ? row.summaryEn : row.summaryZh}</p>
          {row.signal?.evidenceZh?.length ? <p className="mt-3 text-caption leading-6 text-violet-100/55">{row.signal.evidenceZh.slice(0, 2).join(" · ")}</p> : null}
          <div className="mt-4 flex items-center justify-between gap-3 text-caption text-white/38"><span>{row.updatedAt ? (en ? `Updated ${row.updatedAt.slice(0, 10)}` : `更新 ${row.updatedAt.slice(0, 10)}`) : (en ? "Open dossier" : "进入专题")}</span><span className="text-violet-200/80">{en ? "Details →" : "查看详情 →"}</span></div>
        </Link>
      ))}
      {!rows.length ? <div className="rounded-2xl border border-white/[0.08] p-5 text-body-sm text-white/55">{en ? "No published recommendations yet." : "暂无已发布推荐。"}</div> : null}
    </div>
  );
}
