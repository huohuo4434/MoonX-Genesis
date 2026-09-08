import React from "react";
import { septemberThreeMarketReview, septemberReviewState, SEPTEMBER_REVIEW_VERSION } from "@/lib/presentation/september-three-market-review";

export function SeptemberThreeMarketReview({ en, nowMs }: { en: boolean; nowMs: number }) {
  const state = septemberReviewState(nowMs);
  if (state === "upcoming") return null;
  const body = <>
    <p className="mt-2 text-xs leading-6 text-white/55">{en ? "Sep 8 update · Forward view through Sep 30. Forecast thresholds, not live quotes or guaranteed returns." : "9月8日更新 · 观察至9月30日。预测门槛不是实时行情，不保证结果。"}</p>
    <div className="mt-4 grid gap-3 lg:grid-cols-3">{septemberThreeMarketReview.map(row => <article key={row.symbol} className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-4">
      <h3 className="font-semibold">{row.symbol} · {en ? row.nameEn : row.nameZh}</h3>
      <p className="mt-2 text-sm font-medium leading-6">{en ? row.conclusionEn : row.conclusionZh}</p>
      <p className="mt-2 text-sm leading-6 text-amber-100/80">{en ? row.responseEn : row.responseZh}</p>
      <details className="mt-3 text-xs leading-6 text-white/55"><summary className="cursor-pointer">{en ? "Timing and conditions" : "时间与条件"}</summary><p className="mt-2">{en ? row.detailEn : row.detailZh}</p></details>
    </article>)}</div>
  </>;
  if (state === "archive") return <details id="september-three-market-review" data-september-review={SEPTEMBER_REVIEW_VERSION} className="my-5 rounded-2xl border border-white/10 p-5"><summary className="cursor-pointer font-semibold">{en ? "Historical reference · Sep 8 review (not current guidance)" : "历史参考 · 9月8日三项判断（非当前指引）"}</summary>{body}</details>;
  return <section id="september-three-market-review" data-september-review={SEPTEMBER_REVIEW_VERSION} className="my-5 rounded-2xl border border-amber-300/20 bg-amber-300/[.035] p-5"><h2 className="text-xl font-semibold">{en ? "September focus: BTC, Nasdaq and oil" : "9月重点：比特币、纳指与原油"}</h2>{body}</section>;
}
