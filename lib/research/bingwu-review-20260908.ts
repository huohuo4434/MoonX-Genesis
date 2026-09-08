import type { ResearchRecord } from "@/types/research";
import { lt } from "@/lib/i18n/config";
import { septemberThreeMarketReview, SEPTEMBER_REVIEW_VERSION, SEPTEMBER_REVIEW_RECORDED_AT, SEPTEMBER_REVIEW_EXPIRES_AT } from "@/lib/presentation/september-three-market-review";

// Original titles + local SHA-256 evidence are recorded in docs/bingwu-review-20260908.md.
// Source says charts were cast Sep 7 before White Dew. Exact upload time is NOT verified.
const sources = {
  BTC: { assetId: "bitcoin", market: "crypto", ref: "比特币9月30日前能不能突破8.7万美金" },
  NDX: { assetId: "nasdaq-100", market: "index", ref: "纳斯达克100，九月份走势如何" },
  WTI: { assetId: "wti-crude", market: "commodity", ref: "月底之前WTI油价能否突破98美金" },
} as const;
export const bingwuReviewRecords: ResearchRecord[] = septemberThreeMarketReview.map((row) => ({
  id: `${SEPTEMBER_REVIEW_VERSION}-${row.symbol}`, publishedAt: SEPTEMBER_REVIEW_RECORDED_AT,
  ingestedAt: SEPTEMBER_REVIEW_RECORDED_AT, sourcePublishedAt: null, sourcePublishedAtVerified: false,
  forecastStart: "2026-09-08", forecastEnd: "2026-09-30", expiresAt: SEPTEMBER_REVIEW_EXPIRES_AT,
  assetId: sources[row.symbol].assetId, assetName: lt(row.nameZh, row.nameZh, row.nameEn), symbol: row.symbol, market: sources[row.symbol].market,
  framework: "oracle-six-yao", sourceType: "private-teacher", sourceProfileId: "core-liuyao-cycle",
  internalSourceRef: `local:丙午0908/${sources[row.symbol].ref}.txt + .png`, sourceStatus: "raw_source_saved",
  publicSourceLabel: lt("六爻月度研究", "六爻月度研究", "Monthly Liu Yao research"),
  accessLevel: "member", visibility: "internal", direction: row.symbol === "NDX" ? "bearish" : "insufficient-evidence",
  editorialConfidence: 0, consensusEligible: false, verificationEligibility: "provisional", excludeFromLongTermConsensus: true,
  horizon: lt("9月8日起至月底复核", "9月8日起至月底復核", "Forward review from Sep 8 through month-end"),
  title: lt(`${row.symbol} · 9月8日月度复核`, `${row.symbol} · 9月8日月度復核`, `${row.symbol} · Sep 8 monthly review`),
  summary: lt(row.conclusionZh, row.conclusionZh, row.conclusionEn),
  thesis: [lt(row.detailZh, row.detailZh, row.detailEn)], risks: [lt(row.responseZh, row.responseZh, row.responseEn)],
  status: "active", tags: ["research-only", "no-direction-score", "no-auto-trade", "source:bingwu", "manual-transcript-and-chart-review", "not-a-full-month-forward-sample"],
}));
