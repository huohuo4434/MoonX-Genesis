import React from "react";
import { cryptoReviewState, cryptoTechnicalReview20260907 as review } from "@/lib/presentation/crypto-technical-review-20260907";

export function CryptoTechnicalReview({ en, nowMs }: { en: boolean; nowMs: number }) {
  const state = cryptoReviewState(nowMs);
  if (state === "upcoming") return null;
  const lang = en ? "en" : "zh";
  const body = <>
    <p className="mt-2 text-sm leading-6 text-foreground-secondary">{review.note[lang]}</p>
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      {review.assets.map((asset) => <article key={asset.symbol} className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4">
        <h3 className="font-semibold text-amber-100">{asset.symbol}</h3>
        <p className="mt-1 text-xs text-foreground-tertiary">{asset.horizon[lang]}</p>
        <p className="mt-3 font-semibold">{asset.conclusion[lang]}</p>
        {asset.levels.length ? <ul className="mt-3 space-y-2 text-sm leading-6">{asset.levels.map((level) => <li key={level.en}>{level[lang]}</li>)}</ul> : null}
        <p className="mt-3 text-sm leading-6 text-foreground-secondary">{asset.condition[lang]}</p>
        <details className="mt-3 text-sm leading-6 text-foreground-secondary">
          <summary className="cursor-pointer">{en ? "Uncertainty" : "分歧与保留项"}</summary>
          <p className="mt-2">{asset.disagreement[lang]}</p>
        </details>
      </article>)}
    </div>
    <p className="mt-3 text-xs text-foreground-tertiary">{en ? "Research addendum V1 · Reassess after Sep 13; no change to locked forecasts, conviction scores or trading permissions." : "研究补充 V1 · 9月13日后转入历史参考；正式方向、信心评分与交易权限不变。"}</p>
  </>;
  if (state === "archive") return <details id="crypto-technical-watch" data-crypto-review={review.version} className="rounded-3xl border border-white/10 p-5">
    <summary className="cursor-pointer font-semibold">{en ? "Historical reference · Sep 7 crypto research (not current guidance)" : "历史参考 · 9月7日加密研究（非当前指引）"}</summary>
    {body}
  </details>;
  return <section id="crypto-technical-watch" data-crypto-review={review.version} className="rounded-3xl border border-amber-300/20 bg-amber-300/[0.035] p-5 sm:p-6">
    <h2 className="text-xl font-semibold">{review.title[lang]}</h2>
    {body}
  </section>;
}
