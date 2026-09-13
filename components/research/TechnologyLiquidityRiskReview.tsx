import { WU_LIQUIDITY_REVIEW_20260913 as review } from "@/lib/research/wu-liquidity-review-20260913";

export function TechnologyLiquidityRiskReview({ en = false }: { en?: boolean }) {
  const copy = en ? review.en : review.zh;
  return <section id="technology-liquidity-risk" data-risk-review={review.version} className="mb-6 rounded-2xl border border-amber-300/25 bg-amber-300/[.05] p-5">
    <p className="text-xs text-amber-200">{en ? "2026 outlook · September 13 addendum" : "2026年展望 · 9月13日补充"}</p>
    <h2 className="mt-2 text-lg font-semibold text-white">{copy.title}</h2>
    <p className="mt-2 text-sm leading-6 text-amber-100">{copy.summary}</p>
    <dl className="mt-3 grid gap-3 lg:grid-cols-3">{copy.rows.map(([label, body]) => <div key={label} className="rounded-xl bg-black/15 p-3"><dt className="text-sm font-semibold text-white">{label}</dt><dd className="mt-1 text-sm leading-6 text-white/70">{body}</dd></div>)}</dl>
    <details className="mt-3 text-sm text-white/60"><summary className="cursor-pointer">{copy.detailTitle}</summary><p className="mt-2 leading-6">{copy.detail}</p></details>
    <p className="mt-3 text-xs text-white/45">{copy.footer}</p>
  </section>;
}
