"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Heading,
  Text,
} from "@/components/ui";
import {
  FEATURED_MEMBER_LOCKS,
  listFeaturedStocks,
  starsDisplay,
} from "@/lib/data/featured-stocks";
import { formatDateChina } from "@/lib/utils/datetime";
import type { FeaturedStock } from "@/types/featured-stock";

function ThesisCard({ stock }: { stock: FeaturedStock }) {
  return (
    <article className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0e12] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="font-mono text-caption uppercase tracking-[0.2em] text-white/40">
              Long-term Observation
            </p>
            <Heading as="h2" size="h2" className="text-white">
              {stock.name}
              {stock.nameEn ? (
                <span className="ml-3 text-body font-normal text-white/45">{stock.nameEn}</span>
              ) : null}
            </Heading>
            <p className="font-mono text-body-sm text-white/50">
              {stock.symbol} · {stock.marketLabel}
            </p>
            <p className="text-lg tracking-wide text-amber-400/90" aria-label={`${stock.convictionStars} stars`}>
              {starsDisplay(stock.convictionStars)}
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.1] bg-black/40 px-4 py-3 text-right">
            <p className="text-caption uppercase tracking-[0.16em] text-white/40">Long-term Rating</p>
            <p className="mt-1 font-mono text-h3 text-white">{stock.longTermRating}</p>
            <p className="mt-1 text-caption text-white/50">{stock.ratingNote}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {stock.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="border-white/15 bg-white/[0.03] font-mono text-caption text-white/70"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <section className="border-b border-white/[0.06] px-6 py-6 sm:px-8 lg:border-r lg:border-b-0">
          <h3 className="font-mono text-caption uppercase tracking-[0.18em] text-white/40">
            Investment Thesis · 为什么关注
          </h3>
          <ul className="mt-4 space-y-2.5">
            {stock.whyWatch.map((line) => (
              <li key={line} className="flex gap-2 text-body-sm text-white/75">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/35" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-b border-white/[0.06] px-6 py-6 sm:px-8">
          <h3 className="font-mono text-caption uppercase tracking-[0.18em] text-white/40">
            Research Scores · 投资逻辑
          </h3>
          <dl className="mt-4 space-y-3">
            {stock.thesisScores.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4">
                <dt className="text-body-sm text-white/60">{row.label}</dt>
                <dd className="font-mono text-body-sm tracking-wide text-amber-400/85">
                  {starsDisplay(row.stars)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-b border-white/[0.06] px-6 py-6 sm:px-8 lg:border-b-0 lg:border-r">
          <h3 className="font-mono text-caption uppercase tracking-[0.18em] text-white/40">
            Catalysts · 主要催化剂
          </h3>
          <ul className="mt-4 space-y-2.5">
            {stock.catalysts.map((line) => (
              <li key={line} className="flex gap-2 text-body-sm text-white/75">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/35" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="px-6 py-6 sm:px-8">
          <h3 className="font-mono text-caption uppercase tracking-[0.18em] text-white/40">
            MOOX Long-term Rating
          </h3>
          <p className="mt-4 font-mono text-h2 text-white">{stock.longTermRating}</p>
          <p className="mt-2 text-body-sm text-white/55">{stock.ratingNote}</p>
          <p className="mt-4 text-caption text-white/35">
            Research · Analysis · Forecast · Risk · Catalysts
          </p>
        </section>
      </div>
    </article>
  );
}

function UnlockPremiumDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#0c0e12] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">解锁MOOX会员研究</DialogTitle>
          <DialogDescription className="text-white/55">
            会员可查看完整重点资产预测与多周期研究。
          </DialogDescription>
        </DialogHeader>
        <ul className="mt-2 space-y-2 text-body-sm text-white/75">
          {[
            "今日预测",
            "明日预测",
            "本周预测",
            "长期预测",
            "AI分析",
            "六爻分析",
            "Wave分析",
            "Featured Stocks完整预测",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-emerald-400/90">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <DialogFooter className="mt-4 sm:justify-start">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/pricing">查看会员方案</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FeaturedStocksPageClient({ isMember }: { isMember: boolean }) {
  const stocks = listFeaturedStocks();
  const [unlockOpen, setUnlockOpen] = useState(false);

  function requestUnlock() {
    if (isMember) return;
    setUnlockOpen(true);
  }

  return (
    <div className="min-h-screen bg-[#07080a] text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <header className="max-w-3xl border-b border-white/[0.08] pb-10">
          <p className="font-mono text-caption uppercase tracking-[0.22em] text-white/40">
            MOOX Research Desk
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            MOOX重点关注资产
          </h1>
          <p className="mt-3 text-body text-white/55">
            持续研究、验证并跟踪少数高关注度资产。
          </p>
          <div className="mt-6 space-y-2 text-body-sm text-white/70">
            <p className="font-medium text-white/85">MOOX长期重点关注标的</p>
            <p>我们不会每天发布个股意见。</p>
            <p>这里只展示经过长期研究、持续跟踪的少数资产。</p>
            <p className="pt-2 font-mono text-caption text-white/40">
              Hard cap: {stocks.length} / 5 · Adjust only when long-term thesis changes
            </p>
          </div>
        </header>

        <div className="mt-10 space-y-8">
          {stocks.map((stock) => (
            <ThesisCard key={stock.id} stock={stock} />
          ))}
        </div>

        {/* Member forecast gate */}
        <section className="mt-14 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0e12]">
          <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
            <p className="font-mono text-caption uppercase tracking-[0.2em] text-white/35">
              ━━━━━━━━━━━━━━━━━━
            </p>
            <h2 className="mt-2 text-h3 text-white">会员专享预测</h2>
            <p className="mt-1 font-mono text-caption uppercase tracking-[0.16em] text-white/40">
              Member Forecast Access
            </p>
            <p className="mt-2 font-mono text-caption text-white/35">━━━━━━━━━━━━━━━━━━</p>
            <p className="mt-3 text-body-sm text-white/55">以下内容仅会员开放：</p>
          </div>

          <div className="grid gap-2 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
            {FEATURED_MEMBER_LOCKS.map((item) => {
              if (isMember) {
                const href =
                  item.key === "today" || item.key === "tomorrow" || item.key === "weekly"
                    ? stocks[0]?.memberDetailHref ?? "/member/stocks"
                    : "/pricing";
                return (
                  <Link
                    key={item.key}
                    href={href}
                    className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-3 text-body-sm text-white/80 transition-colors hover:bg-emerald-500/10"
                  >
                    <span className="text-emerald-400/90">✓</span>
                    <span>{item.labelZh}</span>
                  </Link>
                );
              }
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={requestUnlock}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/30 px-3 py-3 text-left text-body-sm text-white/65 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <span aria-hidden>🔒</span>
                  <span>{item.labelZh}</span>
                </button>
              );
            })}
          </div>

          {!isMember ? (
            <div className="flex flex-wrap gap-3 border-t border-white/[0.06] px-6 py-5 sm:px-8">
              <Button type="button" onClick={requestUnlock}>
                Unlock Full Forecast
              </Button>
              <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/5">
                <Link href="/pricing">立即开通会员</Link>
              </Button>
            </div>
          ) : (
            <div className="border-t border-white/[0.06] px-6 py-5 sm:px-8">
              <Text variant="body-sm" className="text-white/55">
                会员已解锁 Featured Stocks Forecast。可进入个股详情查看今日 / 明日 / 本周 Research。
              </Text>
              {stocks[0]?.memberDetailHref ? (
                <Button asChild className="mt-3" size="sm">
                  <Link href={stocks[0].memberDetailHref}>打开长鑫科技会员预测</Link>
                </Button>
              ) : null}
            </div>
          )}
        </section>

        {/* Research update history */}
        <section className="mt-14">
          <h2 className="font-mono text-caption uppercase tracking-[0.2em] text-white/40">
            Research Update History
          </h2>
          <p className="mt-2 text-body-sm text-white/50">
            持续研究记录——不是一次性发布。
          </p>
          <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.08]">
            <table className="w-full text-left text-body-sm">
              <thead className="border-b border-white/[0.08] bg-white/[0.03] font-mono text-caption uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-4 py-3 font-normal">Asset</th>
                  <th className="px-4 py-3 font-normal">Last Update</th>
                  <th className="px-4 py-3 font-normal">Research Count</th>
                  <th className="px-4 py-3 font-normal">Historical Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => (
                  <tr key={s.id} className="border-b border-white/[0.05] last:border-0">
                    <td className="px-4 py-3 text-white/85">
                      {s.name}
                      <span className="ml-2 font-mono text-caption text-white/40">{s.symbol}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-white/60">
                      {formatDateChina(s.research.lastUpdated)}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-white/60">
                      {s.research.researchCount}
                    </td>
                    <td className="px-4 py-3 text-white/60">{s.research.historicalAccuracyLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="mt-14 border-t border-white/[0.08] pt-8">
          <p className="max-w-3xl text-caption leading-relaxed text-white/40">
            MOOX提供的是多周期玄学方向研究、技术点位与长期跟踪记录。方向结论不代表保证盈利；所有内容仅供研究参考，不构成任何投资建议。
            MOOX publishes research, probabilistic forecasts, and long-term observation notes. Nothing
            on this page is investment advice.
          </p>
        </footer>
      </div>

      <UnlockPremiumDialog open={unlockOpen} onOpenChange={setUnlockOpen} />
    </div>
  );
}
