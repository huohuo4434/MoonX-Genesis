import React from "react";
import Link from "next/link";
import { gannReviewAssets, gannReviewState, GANN_REVIEW_VERSION } from "@/lib/research/gann-review-20260908";

export function GannPriorityReview({ en, nowMs, compact = false }: { en: boolean; nowMs: number; compact?: boolean }) {
  const state = gannReviewState(nowMs);
  if (state === "upcoming") return null;
  const lang = en ? "en" : "zhCN";
  const assets = compact ? gannReviewAssets.filter((asset) => !asset.candidate) : gannReviewAssets;
  const body = <>
    <p className="mt-2 text-sm text-foreground-secondary">{en ? "Dated Sep 8 · Separate the current leg from the larger cycle. Reassess after Sep 13; not live quotes or guaranteed returns." : "9月8日更新 · 当前一段与较大周期分开看。9月13日后复核；非实时行情或收益承诺。"}</p>
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{assets.map((asset) => <article key={asset.symbol} className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="font-semibold text-cyan-100">{asset.symbol}{asset.candidate ? (en ? " · Candidate" : " · 候选") : ""}</h3>
      <p className="mt-2 text-sm font-medium leading-6">{asset.near[lang]}</p>
      <p className="mt-2 text-sm leading-6 text-foreground-secondary"><b>{en ? "Larger cycle: " : "较大周期："}</b>{asset.longer[lang]}</p>
      <p className="mt-2 text-sm leading-6 text-amber-100/80"><b>{en ? "Response: " : "应对："}</b>{asset.response[lang]}</p>
    </article>)}</div>
    {compact ? <Link href={`${en ? "/en" : ""}/member/gann#time-price-review`} className="mt-4 inline-block text-sm text-cyan-200 underline">{en ? "All 13 assets and time-price tracking →" : "查看全部13个标的与时间价格跟踪 →"}</Link> : null}
  </>;
  if (state === "archive") return <details id="time-price-review" data-gann-review={GANN_REVIEW_VERSION} className="my-5 rounded-3xl border border-white/10 p-5"><summary className="cursor-pointer font-semibold">{en ? "Historical reference · Sep 8 time-price review (not current guidance)" : "历史参考 · 9月8日时间价格观察（非当前指引）"}</summary>{body}</details>;
  return <section id="time-price-review" data-gann-review={GANN_REVIEW_VERSION} className="my-5 rounded-3xl border border-cyan-300/20 bg-cyan-300/[.035] p-5 sm:p-6"><h2 className="text-xl font-semibold">{en ? "Current leg vs. larger cycle" : "这段怎么走，后面防什么"}</h2>{body}</section>;
}
