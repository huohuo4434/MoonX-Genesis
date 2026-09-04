import Link from "next/link";
import { ANNUAL_SOURCE_REVIEW as review } from "@/lib/research/annual-source-corrections-20260905";

export function BtcAnnualWindowAmendment({ en = false }: { en?: boolean }) {
  return <section data-annual-source-review={review.version} className="rounded-2xl border border-amber-300/25 bg-amber-300/[.05] p-5">
    <p className="text-xs text-amber-200">{en ? "BTC · Annual / cross-year update · Sep 5" : "BTC · 年度／跨年修订 · 9月5日"}</p>
    <h2 className="mt-2 text-lg font-semibold text-white">{en ? review.btcEn : review.btcZh}</h2>
    <p className="mt-2 text-sm leading-6 text-white/65">{en ? review.boundaryEn : review.boundaryZh}</p>
    <Link className="mt-3 inline-block text-sm text-amber-200 underline" href="/member/weekly-report">{en ? "View the current weekly outlook" : "查看本周走势"}</Link>
  </section>;
}
