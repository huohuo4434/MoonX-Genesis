import { lt } from "@/lib/i18n/config";
import type { ResearchRecord } from "@/types/research";

/**
 * Forward-locked, anonymized cycle research captured after the 2026-08-22
 * Substack monitoring baseline. The paid source is retained internally only;
 * this record is a concise paraphrase and is excluded from formal consensus.
 */
export const cycleResearchFcx20260822Records: ResearchRecord[] = [
  {
    id: "CYCLE-RESEARCH-FCX-20260822",
    publishedAt: "2026-08-22",
    sourcePublishedAt: "2026-08-22T06:09:35.348Z",
    sourcePublishedAtVerified: true,
    ingestedAt: "2026-08-22T10:35:53.896Z",
    forecastStart: "2026-08-24",
    forecastEnd: "2026-12-31",
    expiresAt: "2027-01-01T00:00:00-05:00",
    accessLevel: "member",
    excludeFromHomeViews: true,
    excludeFromLongTermConsensus: true,
    assetId: "freeport-mcmoran",
    assetName: lt("自由港麦克莫兰", "自由港麥克莫蘭", "Freeport-McMoRan"),
    symbol: "FCX",
    market: "us-equity",
    framework: "cycle",
    sourceType: "public-analyst",
    internalSourceRef: "https://agentmat.substack.com/p/fcx-forecast-from-aug-to-dec-2026",
    publicSourceLabel: lt("周期预测师", "週期預測師", "Cycle Forecaster"),
    sourceProfileId: "cycle-forecaster",
    direction: "bullish",
    editorialConfidence: 45,
    consensusEligible: false,
    horizon: lt("2026年8月至12月", "2026年8月至12月", "August to December 2026"),
    title: lt("FCX下半年周期路径观察", "FCX下半年週期路徑觀察", "FCX H2 Cycle Path Watch"),
    summary: lt(
      "周期模型维持FCX长周期偏多，但认为突破后不宜追价；近期先观察8月24日至25日上沿窗口，再观察8月26日至27日是否回撤形成低点。原文明确给出时间与价格区间，但没有给出独立失效条件。",
      "週期模型維持FCX長週期偏多，但認為突破後不宜追價；近期先觀察8月24日至25日上沿窗口，再觀察8月26日至27日是否回撤形成低點。原文明確給出時間與價格區間，但沒有給出獨立失效條件。",
      "The cycle model remains constructive on FCX over the longer horizon but advises against chasing the breakout. It first watches an Aug 24-25 upper window, then an Aug 26-27 pullback-low window. The source states dates and ranges explicitly but provides no standalone invalidation condition."
    ),
    thesis: [
      lt("8月24日至25日关注79至81美元的近期上沿窗口。", "8月24日至25日關注79至81美元的近期上沿窗口。", "Watch USD 79-81 as the near-term upper window on Aug 24-25."),
      lt("8月26日至27日关注73.5至75.5美元的回撤低点窗口。", "8月26日至27日關注73.5至75.5美元的回撤低點窗口。", "Watch USD 73.5-75.5 as a pullback-low window on Aug 26-27."),
      lt("9月15日至16日的72至75美元被列为更重要的中期低点窗口。", "9月15日至16日的72至75美元被列為更重要的中期低點窗口。", "USD 72-75 on Sep 15-16 is identified as a more important medium-term low window."),
      lt("10月27日至30日的69至73美元被列为第四季度主要积累窗口；年末模型中心约85美元。", "10月27日至30日的69至73美元被列為第四季度主要累積窗口；年末模型中心約85美元。", "USD 69-73 on Oct 27-30 is identified as the main Q4 accumulation window, with a year-end model center near USD 85."),
    ],
    supports: [69, 72, 73, 73.5, 75, 75.5],
    resistances: [79, 81],
    targets: [85],
    invalidation: lt(
      "原文未明确独立失效条件；不得补造。需以后续价格行为验证，且不得用于自动交易。",
      "原文未明確獨立失效條件；不得補造。需以後續價格行為驗證，且不得用於自動交易。",
      "The source does not state a standalone invalidation condition; none is inferred. Subsequent price action must verify the path, and this record cannot drive automated trading."
    ),
    turningWindows: [
      { id: "fcx-upper-20260824", start: "2026-08-24", end: "2026-08-25", label: lt("近期上沿观察", "近期上沿觀察", "Near-term upper watch"), note: lt("79至81美元（原文明确）", "79至81美元（原文明確）", "USD 79-81 (source explicit)") },
      { id: "fcx-low-20260826", start: "2026-08-26", end: "2026-08-27", label: lt("近期回撤低点", "近期回撤低點", "Near-term pullback low"), note: lt("73.5至75.5美元（原文明确）", "73.5至75.5美元（原文明確）", "USD 73.5-75.5 (source explicit)") },
      { id: "fcx-low-20260915", start: "2026-09-15", end: "2026-09-16", label: lt("九月重要低点", "九月重要低點", "September major low"), note: lt("72至75美元（原文明确）", "72至75美元（原文明確）", "USD 72-75 (source explicit)") },
      { id: "fcx-low-20261027", start: "2026-10-27", end: "2026-10-30", label: lt("第四季度积累窗口", "第四季度累積窗口", "Q4 accumulation window"), note: lt("69至73美元（原文明确）", "69至73美元（原文明確）", "USD 69-73 (source explicit)") },
      { id: "fcx-year-end-20261231", date: "2026-12-31", label: lt("年末模型中心", "年末模型中心", "Year-end model center"), note: lt("约85美元（原文明确）", "約85美元（原文明確）", "About USD 85 (source explicit)") },
    ],
    risks: [
      lt("这是外部周期研究摘要，只作辅助观察，不覆盖MOOX已锁定正式方向，不回写历史预测。", "這是外部週期研究摘要，只作輔助觀察，不覆蓋MOOX已鎖定正式方向，不回寫歷史預測。", "This external cycle-research summary is auxiliary only; it cannot override locked MOOX direction or rewrite history."),
      lt("该记录不得直接触发Bitget或任何自动交易。", "該記錄不得直接觸發Bitget或任何自動交易。", "This record cannot directly trigger Bitget or any automated trade."),
    ],
    status: "active",
    visibility: "internal",
    tags: ["fcx", "copper", "cycle", "public-analyst", "anonymous", "research-only", "no-auto-trade"],
  },
];
