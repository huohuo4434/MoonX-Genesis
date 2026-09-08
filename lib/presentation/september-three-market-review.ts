export const SEPTEMBER_REVIEW_VERSION = "SEPTEMBER-20260908-E2";
export const SEPTEMBER_REVIEW_RECORDED_AT = "2026-09-08T11:40:15.000Z";
export const SEPTEMBER_REVIEW_EXPIRES_AT = "2026-09-30T16:00:00.000Z";

export const septemberThreeMarketReview = [
  { symbol: "BTC", nameZh: "比特币", nameEn: "Bitcoin",
    conclusionZh: "仍有冲高空间，但9月30日前突破8.7万美元难度较大。",
    conclusionEn: "Another upside push remains possible, but a break above USD 87,000 before Sep 30 looks difficult.",
    responseZh: "冲高受阻先保护利润，不为等8.7万而硬扛；该数字不是必达目标或精确顶部。",
    responseEn: "Protect gains on rejection rather than holding solely for USD 87,000. It is neither a guaranteed target nor an exact top.",
    detailZh: "9月10日前的8.5万判断与月底的8.7万判断分开保留。9—11日仍是转折观察窗，不锁定最终高点；也不预设月末必创新高。若月底前突破8.7万，应记录门槛判断偏差，不把门槛继续上移。",
    detailEn: "Keep the pre-Sep-10 USD 85,000 view separate from the month-end USD 87,000 view. Sep 9–11 remains a turn-watch window, not a final-top date; a new month-end high is not assumed. A break above USD 87,000 before the deadline must be recorded against this threshold view, not excused by moving the threshold." },
  { symbol: "NDX", nameZh: "纳斯达克100", nameEn: "Nasdaq 100",
    conclusionZh: "9月震荡下跌，偏向逐步走低，不是指定某天暴跌。",
    conclusionEn: "September retains a downward-ranging bias, favoring gradual weakness rather than a crash on a specified day.",
    responseZh: "反抽看承接，走弱及时重评风险；纳指偏弱不等于闪迪、美光或所有科技股同跌。",
    responseEn: "Assess demand on rebounds and reassess risk on weakness. A softer Nasdaq does not require SNDK, MU or every technology stock to fall.",
    detailZh: "与月度震荡下跌、9月7—13日下跌方向一致。局部反弹不改变月度偏弱背景。持续突破并守住主要压力区时，需重新复核，不能只凭日期做空。",
    detailEn: "This aligns with the monthly downward-ranging and Sep 7–13 bearish outlooks. A local rebound does not by itself reverse the monthly bias; sustained strength above major resistance requires reassessment, not date-driven shorts." },
  { symbol: "WTI", nameZh: "WTI原油 · 长周期专题", nameEn: "WTI oil · Long-cycle research",
    conclusionZh: "月内仍有上行动力，但9月30日前98美元附近难持续突破。",
    conclusionEn: "Upside momentum remains possible this month, but a sustained move through USD 98 before Sep 30 looks difficult.",
    responseZh: "接近98或短暂触及均需防回吐；只作长周期专题，不恢复日周预测或自动交易。",
    responseEn: "Watch giveback risk near USD 98 or after a brief touch. Long-cycle research only; no daily/weekly forecast or automated-trading reactivation.",
    detailZh: "原意允许接近98或短暂触及，不能算成绝不触及。98是预测门槛，尚未核准具体合约与报价，不能当作现成技术压力位。地缘摩擦、运输受阻及政策干预只是风险情景，不是已确认事件；农业不套用该价位。",
    detailEn: "The view allows a near approach or brief touch, not an absolute no-touch claim. USD 98 is a forecast threshold; the contract and quote basis are not reconciled, so it is not a validated technical resistance level. Geopolitical friction, transport disruption and policy intervention are scenarios, not confirmed events. The oil level does not apply to agriculture." },
] as const;

export function septemberReviewState(nowMs: number): "upcoming" | "active" | "archive" {
  if (!Number.isFinite(nowMs)) return "archive";
  if (nowMs < Date.parse(SEPTEMBER_REVIEW_RECORDED_AT)) return "upcoming";
  return nowMs < Date.parse(SEPTEMBER_REVIEW_EXPIRES_AT) ? "active" : "archive";
}
