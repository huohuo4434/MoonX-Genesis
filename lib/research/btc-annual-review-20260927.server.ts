import "server-only";

export const BTC_ANNUAL_REVIEW_VERSION = "btc-annual-20260927-v1";
export const BTC_ANNUAL_REVIEW_POLICY = {
  mode: "RESEARCH_ONLY", modifiesLockedForecasts: false, executionAuthority: false,
  sourceAsset: "BTC", probability: null, hitRate: null, consensusStars: null,
} as const;
export const BTC_ANNUAL_MONTHS = [
  { month: "2026-09", zh: "高点候选窗口，尚不能宣布全年顶部已确认", en: "Candidate high window; the annual top is not confirmed", origin: "TEACHER_WINDOW", watchZh: "只记录本次复核后仍可观察的部分；不把9月已经发生的上涨计入新版前瞻命中。", watchEn: "Only the remaining observable part follows this review; prior September gains are not prospective hits for this edition." },
  { month: "2026-10", zh: "高点窗口后防范回撤；原文未指定本月方向", en: "Watch for a pullback after the high window; no source-defined monthly direction", origin: "USER_SCENARIO", watchZh: "回撤是易老师的条件情景，不是年卦原文的逐月结论；观察反弹能否越过阶段高点。", watchEn: "A pullback is Yi's conditional scenario, not a monthly claim from the annual reading; watch whether rebounds clear the swing high." },
  { month: "2026-11", zh: "中间路径待月／阶段卦补充，不预设冬季必有低点", en: "Intermediate path awaits a monthly/stage reading; no guaranteed winter low", origin: "UNSPECIFIED", watchZh: "若继续出现更低高点与更低低点，回撤情景增强；若结构转强，应保留与偏空情景的分歧。", watchEn: "Lower highs and lower lows would support the pullback scenario; strengthening structure must remain visible as dissent." },
  { month: "2026-12", zh: "观察通向跨年高点窗口的结构，不预设整月上涨", en: "Watch structure ahead of the cross-year high window; no assumed month-long rally", origin: "UNSPECIFIED", watchZh: "只有价格止跌并形成抬高低点、突破后守住，才增加修复情景的依据；年卦本身没有给出12月起涨日。", watchEn: "Higher lows and a held breakout would support repair; the annual source provides no December rally-start date." },
  { month: "2027-01", zh: "另一高点候选窗口，与2026年9月谁更高尚未确定", en: "Another candidate high window; not ranked against September 2026", origin: "TEACHER_WINDOW", watchZh: "不是保证创新高、不是2027全年最高点结论，也不构成机械卖出日期；窗口落空应如实保留。", watchEn: "Not a guaranteed new high, the highest point of all 2027, or a mechanical sell date. A failed window must be retained." },
] as const;

export function btcAnnualReviewArchived(nowMs: number) {
  // Conservative archive boundary, not an invented exact solar-term endpoint.
  return nowMs >= Date.parse("2027-03-01T00:00:00+08:00");
}
