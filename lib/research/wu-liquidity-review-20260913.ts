/** Dated research addendum, not an executable signal or a replacement for locked forecasts. */
export const WU_LIQUIDITY_REVIEW_20260913 = {
  version: "wu-liquidity-20260913-v2",
  supersedes: "wu-liquidity-20260913-v1",
  recordedOn: "2026-09-13",
  classification: "RESEARCH_ONLY",
  source: { author: "吴昌燁", videoId: "ghriN1BWfxc", filmedAt: "2026-09-10T12:10:00+08:00" },
  revisionReason: "Correct the Fed summary to foreground debt-constrained hiking and inflation-constrained easing. The 03:34 subtitle is disputed and original audio has not been checked. Preserve v1 in Git and retain the dated directions and Aug 20 risk prior.",
  directionOverride: false,
  confidenceChange: 0,
  executionImpact: "NONE",
  evidence: [
    { time: "00:14–01:52", finding: "9月28日后变化，10月至11月初科技股与流动性回调风险；属于预测，非已验证事件。" },
    { time: "01:55–02:51", finding: "油价及农产品通胀压力；90美元未指定油种，不录入为技术支撑。" },
    { time: "02:54–03:42", finding: "主要论述：债务负担限制美联储加息，通胀又限制降息，整体倾向维持利率，与不加息观点同向。03:34–03:36字幕写有限度的加息，用户核看视频后提出异议；原声尚未核听，不据此归类为看加息。日本政策收紧是另一条风险线索，不与美联储混同。" },
    { time: "04:25–05:05", finding: "黄金、石油、科技之后可能轮动BTC，农业也有机会；未给出可执行点位。" },
    { time: "06:36–07:24", finding: "科技股风险可能延至11月初，回调后再找股票机会；没有具体底部日期。" },
  ],
  zh: {
    title: "科技股：短线看确认，跨月防回撤",
    summary: "9月28日后提高警惕，10月至11月初重点防范科技股流动性收紧与快速回调。风险窗口不是必跌日期，也不是统一清仓日。",
    rows: [
      ["短线", "按各标的本周方向和已确认点位执行；反弹遇压力、日K动能转弱时保护利润，不把短线仓拖成长线。"],
      ["中长线", "SNDK、MU及AI科技股不因周内看涨就一路持有到10月。若日K跌破关键支撑、反抽不过且周线同步转弱，优先减小风险；若支撑守住并放量突破，则重新评估回调情景。"],
      ["BTC与其他市场", "BTC保留资金轮动、相对抗跌的观察情景，不自动跟随科技股看空。黄金、原油和农业分别看供需与自身结构，不共用买卖点。"],
    ],
    detailTitle: "观察条件与判断边界",
    detail: "重点检查已闭合日K的支撑压力、EMA60和MACD动能，并结合周线；这些是后续确认条件，不表示目前已经触发。债务负担制约加息，通胀又限制降息，整体倾向维持利率，与9月不加息判断同向，仍待决议检验。日本政策、油价和地缘变化作为条件观察；回调后也须重新确认底部，不预设11月初一定买入。",
    footer: "9月13日风险补充 · 既有周预测与历史记录保留 · 未改变自动交易权限或订单",
  },
  en: {
    title: "Technology: confirm short-term setups, watch cross-month drawdowns",
    summary: "Raise vigilance after September 28. October through early November is a watch window for tighter liquidity and a sharp technology-stock correction—not a guaranteed decline or a universal exit date.",
    rows: [
      ["Short term", "Use each asset's dated weekly outlook and confirmed levels. Protect profits when a rebound meets resistance and daily momentum weakens; do not turn a short-term trade into an unplanned long-term holding."],
      ["Swing / position", "A bullish week in SNDK, MU or AI stocks is not a reason to hold unconditionally into October. A daily support break, failed retest and weakening weekly structure favor reducing risk. If support holds and a breakout gains volume, reassess the correction scenario."],
      ["BTC & other markets", "Retain a possible rotation into BTC and relative-strength scenario; do not automatically copy the bearish technology scenario. Gold, oil and agriculture need their own supply-demand and price-structure checks."],
    ],
    detailTitle: "Confirmation conditions & limits",
    detail: "Check closed daily candles, support/resistance, EMA60 and MACD momentum alongside weekly structure. These are future confirmation conditions, not claims that signals have triggered. Debt burdens constrain hiking while inflation limits easing: the overall argument favors holding rates, aligning with September's no-hike thesis, still pending the decision. Japanese policy, oil and geopolitics are conditional risks. A correction still requires fresh bottom confirmation—not an automatic early-November entry.",
    footer: "September 13 risk addendum · Existing weekly forecasts and history retained · No change to automated-trading authority or orders",
  },
} as const;
