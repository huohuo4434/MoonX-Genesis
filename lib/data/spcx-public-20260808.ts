export type SpcxLanguage = "zh" | "en";

export const SPCX_PUBLIC_RESEARCH = {
  id: "spcx-20260808-v2",
  symbol: "SPCX",
  assetNameZh: "SpaceX",
  assetNameEn: "SpaceX",
  market: "NASDAQ",
  version: 2,
  revisedAt: "2026-08-08T20:50:00+08:00",
  revisionOf: "spcx-20260806-v1",
  consensusStars: 4,
  publicHeadlineZh: "解锁后实际走势明显前移：V1保留，V2已经重新校准",
  publicHeadlineEn: "Post-unlock timing moved materially: V1 stays locked and V2 is recalibrated",
  publicSummaryZh:
    "解锁后的真实K线让原先的时间节奏需要重算。MOOX没有覆盖旧版，而是保留V1并新增V2。公开版只展示为什么需要修订、研究覆盖到哪些周期；下一阶段方向、关键枢轴、回踩条件和第二段路径只在会员版展示。",
  publicSummaryEn:
    "Post-unlock price action changed the timing assumptions. MOOX keeps V1 intact and adds V2 rather than rewriting history. The public view shows why a revision was required and which horizons are covered; the next-stage direction, pivots, pullback conditions and path remain member-only.",
  revisionNoteZh:
    "这次修订的价值在于记录‘实际走势与原节奏发生偏移’并保留审计链。具体偏移方向、技术枢轴和后续执行条件不再放在公开页。",
  revisionNoteEn:
    "The revision records a material timing drift while preserving the audit trail. The direction of that drift, technical pivots and execution conditions are no longer exposed publicly.",
  publicWindows: [
    {
      period: "2026-08-10 / 2026-08-14",
      zh: "第一阶段已完成逐日拆分与技术条件树。公开版只显示该研究已更新，不公开方向、枢轴与具体执行条件。",
      en: "Stage one has a completed day-by-day path and technical condition tree. Public view confirms the update without revealing direction, pivots or execution rules.",
    },
    {
      period: "2026-08-17 / 2026-08-23",
      zh: "第二阶段已建立供给与承接情景。哪一种情景占优、什么条件触发切换，仅会员可见。",
      en: "Stage two includes supply/absorption scenarios. Which scenario leads and what triggers a switch remain member-only.",
    },
    {
      period: "2026-08-24 / 2026-08-30",
      zh: "第三阶段已完成独立周卦与中期衔接。公开页不提前泄露它是延续、整理还是风险窗口。",
      en: "Stage three has an independent weekly reading tied into the medium-term view. Public users are not shown whether it represents continuation, consolidation or risk.",
    },
  ],
  teaserZh:
    "会员版包含：8/10—8/14逐日路径、周/月/三个月/一年/五年分层判断、事件后K线复盘、动态支撑压力、失效条件与V1→V2修订记录。",
  teaserEn:
    "Member research includes a day-by-day Aug. 10–14 path, weekly/monthly/three-month/one-year/five-year layers, post-unlock price review, live support/resistance, invalidation rules and the V1→V2 revision log.",
  disclaimerZh:
    "研究对象为纳斯达克SPCX正股。第三方代币化股票、RWA或交易所映射产品可能存在额外发行人、跟踪误差与流动性风险。研究仅用于情景分析，不构成投资建议。",
  disclaimerEn:
    "The research target is the Nasdaq-listed SPCX share. Third-party tokenized shares, RWA wrappers or exchange representations may carry additional issuer, tracking and liquidity risks. This is scenario research, not investment advice.",
} as const;
