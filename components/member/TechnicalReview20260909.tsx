import React from "react";
import Link from "next/link";
import { technicalReview20260909 as review, technicalReviewState } from "@/lib/presentation/technical-review-20260909";

type Props = { en: boolean; nowMs: number };

export function TechnicalReview20260909Link({ en, nowMs }: Props) {
  if (technicalReviewState(nowMs) !== "active") return null;
  return <Link href={`${en ? "/en" : ""}/member/key-dates#technical-review-20260909`} className="block rounded-2xl border border-amber-300/20 bg-amber-300/[.04] px-4 py-3 text-sm text-amber-100">
    {en ? "Sep 9 technical watch: BTC, SNDK and MU — levels and rejection risk →" : "9月9日技术应对：BTC、闪迪、美光等多级关键位与受阻风险 →"}
  </Link>;
}

export function TechnicalReview20260909({ en, nowMs }: Props) {
  const state = technicalReviewState(nowMs);
  if (state === "upcoming") return null;
  const lang = en ? "en" : "zh";
  const cards = review.assets.map(asset => <article key={asset.symbol} className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4">
    <h3 className="font-semibold text-amber-100">{asset.symbol}</h3>
    <p className="mt-1 text-xs text-foreground-tertiary">{asset.market} · {asset.basis === "text" ? (en ? "Text reference" : "文字参考") : (en ? "Chart checked" : "原图核对")}</p>
    <dl className="my-3 space-y-2 text-sm">
      <div><dt className="text-foreground-secondary">{en ? "Support / reclaim reference" : "支撑／收复观察"}</dt><dd className="mt-1 break-words font-mono">{asset.support}</dd></div>
      <div><dt className="text-foreground-secondary">{en ? "Resistance" : "压力"}</dt><dd className="mt-1 break-words font-mono">{asset.resistance}</dd></div>
    </dl>
    <p className="text-sm leading-6">{asset.action[lang]}</p>
    <details className="mt-3 text-xs leading-5 text-foreground-secondary"><summary className="cursor-pointer">{en ? "Limits & risk" : "边界与风险"}</summary><p className="mt-2">{asset.caution[lang]}</p></details>
  </article>);
  const body = <>
    <p className="mt-3 font-medium leading-6">{review.summary[lang]}</p>
    <p className="mt-2 text-xs leading-5 text-foreground-secondary">{review.note[lang]}</p>
    <div className="mt-4 grid gap-3 md:grid-cols-2">{cards.slice(0, 4)}</div>
    <details className="mt-4"><summary className="cursor-pointer text-sm text-amber-100">{en ? "More: NBIS · LITE · QQQ · PLTR · CDNS" : "展开其他：NBIS · LITE · QQQ · PLTR · CDNS"}</summary><div className="mt-3 grid gap-3 md:grid-cols-2">{cards.slice(4)}</div></details>
    <ul className="mt-4 space-y-2 text-xs leading-5 text-foreground-secondary">{review.events.map(event => <li key={event.url}><a href={event.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{event[lang]}</a></li>)}</ul>
    <p className="mt-3 text-xs text-foreground-tertiary">{en ? "Dated research · V1 · Archived after Sep 13. No new conviction score or execution permission." : "阶段技术参考 · V1 · 9月13日后归档，不新增信心评分或交易授权。"}</p>
  </>;
  const props = { id: "technical-review-20260909", "data-technical-review": review.version, className: "rounded-3xl border border-amber-300/20 bg-amber-300/[.035] p-5 sm:p-6" };
  if (state === "archive") return <details {...props}><summary className="cursor-pointer font-semibold">{en ? "Historical reference · Sep 9 technical watch (not current guidance)" : "历史参考 · 9月9日技术应对（非当前指引）"}</summary>{body}</details>;
  return <section {...props}><h2 className="text-xl font-semibold">{review.title[lang]}</h2>{body}</section>;
}
