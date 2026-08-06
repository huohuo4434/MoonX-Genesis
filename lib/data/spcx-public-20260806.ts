export type SpcxLanguage = "zh" | "en";

export const SPCX_PUBLIC_RESEARCH = {
  id: "spcx-20260806",
  symbol: "SPCX",
  assetNameZh: "SpaceX",
  assetNameEn: "SpaceX",
  market: "NASDAQ",
  lockedAt: "2026-08-06T06:29:00+08:00",
  referencePriceAtCast: 116,
  consensusStars: 4,
  executionState: "WAITING_FOR_TECHNICAL_CONFIRMATION",
  directionZh: "先消化供给冲击，后进入反弹窗口",
  directionEn: "Absorb the supply shock first, then enter a rebound window",
  publicSummaryZh:
    "两套六爻方法与多周期结构没有给出“解锁后一路下跌”的单一路径。更值得观察的是：前段仍会剧烈消化抛压，真正偏强的时间窗口集中在8月下旬至9月初。",
  publicSummaryEn:
    "Two separate Liu Yao frameworks and the multi-horizon sequence do not point to a simple post-unlock collapse. The more important setup is an early supply-absorption phase followed by a stronger late-August to early-September window.",
  publicWindows: [
    {
      period: "2026-08-06 / 2026-08-16",
      zh: "高波动消化期：反弹会反复，暂不把单日大涨视为主升确认。",
      en: "High-volatility absorption: rebounds may be repeatedly sold; one strong day is not yet a confirmed trend.",
    },
    {
      period: "2026-08-17 / 2026-08-23",
      zh: "节奏转强期：更容易出现加速，但仍伴随快速回撤。",
      en: "Momentum transition: acceleration becomes more likely, but sharp pullbacks remain possible.",
    },
    {
      period: "2026-08-24 / 2026-09-06",
      zh: "核心观察窗：结构更顺，反弹延续性优于前半月。",
      en: "Primary watch window: structure is cleaner and rebound persistence is better than in the first half of August.",
    },
  ],
  teaserZh:
    "会员版已锁定：两位老师各自依据、周级路径、最强窗口、实时技术确认、失效条件与事后验证。",
  teaserEn:
    "Member research includes each teacher’s separate evidence, the weekly path, the strongest window, live technical confirmation, invalidation and post-event verification.",
  disclaimerZh:
    "研究对象为纳斯达克 SPCX 标的。第三方代币化股票、RWA 或交易所映射产品可能存在额外的发行人、跟踪误差与流动性风险。研究不构成投资建议。",
  disclaimerEn:
    "The research target is the Nasdaq-listed SPCX underlying. Third-party tokenized shares, RWA wrappers or exchange representations may carry additional issuer, tracking and liquidity risks. This is not investment advice.",
} as const;
