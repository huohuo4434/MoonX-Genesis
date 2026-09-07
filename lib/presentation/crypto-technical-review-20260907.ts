// A dated research overlay, deliberately disconnected from forecast and order engines.
export const cryptoTechnicalReview20260907 = {
  version: "CRYPTO-TECH-20260907-V1",
  recordedAt: "2026-09-07T11:31:42.000Z",
  reviewAfter: "2026-09-13T16:00:00.000Z",
  status: "RESEARCH_ONLY",
  officialDirectionMutation: false,
  tradingAuthority: false,
  confidenceDelta: 0,
  retrospectiveScoreEligible: false,
  title: { zh: "加密技术观察 · 9月7日", en: "Crypto technical watch · Sep 7" },
  note: {
    zh: "美元计价研究区间，非实时行情或委托价；交易场所与合约口径未统一核验，不直接叠加到真实K线或自动下单。",
    en: "USD-denominated research areas, not live quotes or order prices. Venue and contract specifications are not fully reconciled; these are not plotted as verified chart levels or sent to execution.",
  },
  assets: [
    {
      symbol: "BTC",
      horizon: { zh: "本周修复／更大级别回撤分开", en: "Weekly recovery vs. larger pullback" },
      conclusion: { zh: "仍可试高，不按强主升追涨。", en: "Another test higher is possible; do not assume a strong trend leg." },
      levels: [
        { zh: "上方观察：81,500 → 82,800 → 83,000—85,000", en: "Upside watch: 81,500 → 82,800 → 83,000–85,000" },
        { zh: "回踩观察：76,150；失守后才评估70,000—72,000，67,000属深回撤情景", en: "Pullback watch: 76,150; only a breakdown activates assessment of 70,000–72,000, with 67,000 a deeper scenario" },
      ],
      condition: { zh: "先看日线能否收回81,500。冲高受阻才评估防守；若85,000上方站稳且回踩守住，上冲受限假设需复核，不机械摸顶。", en: "Watch for a daily reclaim of 81,500. Assess defense after rejection; holding above 85,000 with a successful retest challenges the capped-rally hypothesis. Do not short by price alone." },
      disagreement: { zh: "短期仍有上冲空间较一致；长期是熊转牛还是熊市反弹，分歧未消除。", en: "There is partial agreement on another push higher, but a bull transition versus a bear-market rally remains disputed." },
    },
    {
      symbol: "ETH",
      horizon: { zh: "短线1—3天／反方情景10—20天", en: "1–3 days vs. a 10–20 day alternative" },
      conclusion: { zh: "短线可再冲高，周内仍防回吐。", en: "A further short-term push is possible; retain weekly giveback risk." },
      levels: [
        { zh: "回踩观察：2,350；先看2,547附近能否突破并守住", en: "Pullback watch: 2,350; first assess a break and hold near 2,547" },
        { zh: "10—20天反方上行情景：2,800—3,000，3,100下方为更远压力参考", en: "10–20 day alternative upside scenario: 2,800–3,000; below 3,100 is a farther resistance reference" },
      ],
      condition: { zh: "2,800—3,000不是本周必达目标。突破后回踩守住才继续评估；跌破2,350且无法收回，则该修复方案不再适用。", en: "2,800–3,000 is not a guaranteed weekly target. Reassess after a breakout and successful retest; losing 2,350 without a reclaim invalidates this recovery setup." },
      disagreement: { zh: "10—20天续涨设想与本周先涨后跌并非完整共振；不据此上调信心。", en: "A 10–20 day continuation thesis is not full agreement with this week's rise-then-fall path; conviction is not increased." },
    },
    {
      symbol: "ZEC",
      horizon: { zh: "高波动研究观察，非新增交易标的", en: "High-volatility research only, not a new trading asset" },
      conclusion: { zh: "不追多，也不因涨幅大就猜顶做空。", en: "Do not chase or call a short solely because the rally is large." },
      levels: [],
      condition: { zh: "等待顶部结构、RSI背离、MACD转弱及颈线跌破相互确认；仅超买或未平仓量高，不足以判定反转。", en: "Wait for a top structure, RSI divergence, weaker MACD and a neckline break to confirm each other. Overbought readings or high open interest alone do not establish reversal." },
      disagreement: { zh: "缺少独立正式方向与完整实时数据；24亿未平仓量等原始说法未独立核实，不当作已确认事实。", en: "No independent official direction or complete live dataset. The source's $2.4bn open-interest claim is not independently verified and is not treated as confirmed fact." },
    },
  ],
} as const;

export function cryptoReviewState(nowMs: number): "upcoming" | "active" | "archive" {
  if (!Number.isFinite(nowMs)) return "archive";
  if (nowMs < Date.parse(cryptoTechnicalReview20260907.recordedAt)) return "upcoming";
  return nowMs < Date.parse(cryptoTechnicalReview20260907.reviewAfter) ? "active" : "archive";
}
