import "server-only";

import type { MemberResearchRadarPack } from "@/types/member-research-radar";

const branch = (zh: string, en: string) => ({ branch: { zh, en }, dates: [] as never[] });

const PACK: MemberResearchRadarPack = {
  id: "MEMBER-QIMEN-STONE-RADAR-20260814",
  ingestedAt: "2026-08-14",
  sourcePeriod: { start: "2026-08-17", end: "2026-08-22" },
  sourcePublishedAt: null,
  verificationStatus: "UNVERIFIED_SOURCE_CLAIM",
  executionAuthority: "RESEARCH_ONLY",
  consensusEligible: false,
  qimenRole: {
    zh: "奇门只描述市场环境和择时分支，不修改六爻正式方向，也不直接触发交易。",
    en: "Qimen describes environment and timing branches only. It does not alter the formal Liu Yao direction or trigger trades.",
  },
  markets: [
    {
      id: "US_BROAD", label: { zh: "美股大盘", en: "US broad market" },
      qimenEnvironment: { zh: "震荡偏上，但趋势持续性较差；未来1—3周防范数据修正或回调。", en: "Range-bound with an upward bias, but trend persistence is weak; watch for data revisions or a pullback over the next one to three weeks." },
      branchRiskBranches: [branch("若上涨缺少持续性，保留数据修正或回调分支。", "If upside lacks persistence, retain the data-revision or pullback branch.")],
    },
    {
      id: "SP500", label: { zh: "标普500", en: "S&P 500" },
      qimenEnvironment: { zh: "未来1—3周总体向上，同时保留突发超跌或小黑天鹅风险分支。", en: "The next one to three weeks lean upward overall, while retaining a sudden-oversold or small-black-swan branch." },
      branchRiskBranches: [branch("亥、卯、未日作为风险分支保存；不在缺少历法证据时推算公历日期。", "Store Hai, Mao and Wei days as risk branches; do not infer Gregorian dates without calendar evidence.")],
    },
    {
      id: "SOX", label: { zh: "费城半导体指数", en: "SOX" },
      qimenEnvironment: { zh: "谨慎看多，或尝试前高，过程中可能反复折腾。", en: "Cautiously constructive and may test the prior high, with a choppy path." },
      branchRiskBranches: [branch("试前高过程中保留反复震荡分支。", "Retain a choppy consolidation branch during any prior-high test.")],
    },
    {
      id: "A_SHARES", label: { zh: "A股", en: "China A-shares" },
      qimenEnvironment: { zh: "分化上涨，板块轮动。", en: "Divergent advance with sector rotation." },
      branchRiskBranches: [branch("上涨若延续，仍按板块分化和轮动观察。", "If the advance continues, observe it through sector divergence and rotation.")],
    },
    {
      id: "BTC", label: { zh: "比特币", en: "Bitcoin" },
      qimenEnvironment: { zh: "谨慎看小反弹，但下降趋势不变；反弹不等于反转。", en: "A small rebound is possible, but the downtrend remains; a rebound is not a reversal." },
      branchRiskBranches: [branch("小反弹分支不得被解释为趋势反转。", "The small-rebound branch must not be presented as a trend reversal.")],
    },
    {
      id: "HSTECH", label: { zh: "恒生科技", en: "Hang Seng TECH" },
      qimenEnvironment: { zh: "震荡反复尝试突破，更期待8月下旬。", en: "A choppy series of breakout attempts, with greater interest in late August." },
      branchRiskBranches: [branch("突破未确认前保留震荡反复分支。", "Retain the choppy branch until a breakout is confirmed.")],
    },
  ],
  stone: {
    role: { zh: "Stone仅作为宏观流动性框架，不提供当前做多或做空结论。", en: "Stone is a macro-liquidity framework only and provides no current bullish or bearish call." },
    currentSignal: null,
    frameworkChain: ["JGB / UST / EU bonds", "repo / collateral / rehypothecation / FX swaps / rate swaps", "margin / deleveraging", "liquid asset selling / cross-asset pressure"],
    sourceClaims: [
      { zh: "日元偏弱可来自居民与企业换汇后进行海外配置。", en: "JPY weakness may arise from household and corporate FX conversion for overseas allocation." },
      { zh: "国家净海外资产较高不等同于本币必然走强。", en: "High national net foreign assets do not imply a necessarily strong domestic currency." },
      { zh: "日元或日本国债的双向极端波动都可能对美国资产形成压力。", en: "Extreme moves in either direction in JPY or JGBs may pressure US assets." },
    ],
    mooxInterpretation: [
      { zh: "观察债券、抵押品与衍生品链条如何传导到保证金、去杠杆和跨资产压力。", en: "Observe how bonds, collateral and derivatives transmit into margin, deleveraging and cross-asset pressure." },
    ],
    verificationNote: { zh: "所有具体数字、杠杆与资金流均为SOURCE_CLAIM待核验，不显示为已验证，也不用于交易。", en: "All specific figures, leverage and flow assertions remain unverified SOURCE_CLAIM items; they are neither shown as verified nor used for trading." },
  },
};

export function getMemberQimenStoneRadar20260814(): MemberResearchRadarPack {
  return PACK;
}
