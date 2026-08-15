import type { FocusSupplementalEvidence } from "@/types/focus-dossier";

const SUPPLEMENTS: Readonly<Record<string, readonly FocusSupplementalEvidence[]>> = {
  mu: [
    {
      id: "MU-20260810-16-LATE-SOURCE-V1",
      periodStart: "2026-08-10",
      periodEnd: "2026-08-16",
      status: "LATE_INGESTED_SOURCE",
      executionAuthority: "RESEARCH_ONLY",
      sourceArtifact: "MU 2026-08-10..2026-08-16 source archive",
      sourcePublishedAt: null,
      lockedAt: null,
      summary: null,
      gapNote: "资料在对应周期结束后补发现；正文与原始发布时间尚未完成可靠结构化，因此不回填正式周预测，也不计入历史命中。",
      includedInHistoricalHitRate: false,
    },
    {
      id: "MU-CHAN-MACRO-SUPPLEMENT-20260814-V1",
      periodStart: "2026-08-14",
      periodEnd: "2026-08-18",
      status: "LATE_INGESTED_SOURCE",
      executionAuthority: "RESEARCH_ONLY",
      sourceArtifact: "2026-08-14 Chan transcript/chart plus market transcript",
      sourcePublishedAt: "2026-08-14T08:03:00+08:00",
      lockedAt: "2026-08-15T16:02:00+08:00",
      summary: "易老师综合解读：MU处在三买推进后的冲高回踩阶段，结构相对SNDK更稳；保持偏多观察但不追高。来源中的具体价位因标的映射不清未采用。",
      gapNote: "本资料于观察时点之后录入，只参与结构复盘，不回填已发生的日预测。",
      includedInHistoricalHitRate: false,
    },
  ],
  sandisk: [
    {
      id: "SNDK-GAOSHAN-NANA-SOURCE-GAP-V1",
      periodStart: "2026-08-10",
      periodEnd: "2026-08-16",
      status: "SOURCE_GAP",
      executionAuthority: "RESEARCH_ONLY",
      sourceArtifact: "SNDK 高山 / NANA 补充资料",
      sourcePublishedAt: null,
      lockedAt: null,
      summary: null,
      gapNote: "补充来源的正文与时间尚不能可靠结构化；暂不写入方向结论，仅保留资料缺口。",
      includedInHistoricalHitRate: false,
    },
    {
      id: "SNDK-CHAN-SUPPLEMENT-20260814-V1",
      periodStart: "2026-08-14",
      periodEnd: "2026-08-18",
      status: "LATE_INGESTED_SOURCE",
      executionAuthority: "RESEARCH_ONLY",
      sourceArtifact: "2026-08-14 Chan transcript and chart",
      sourcePublishedAt: "2026-08-14T08:03:00+08:00",
      lockedAt: "2026-08-15T16:02:00+08:00",
      summary: "易老师综合解读：SNDK已出现5分钟买点并形成30分钟三买结构，但位置偏高、力度偏弱；可作为偏多确认，不适合追价。",
      gapNote: "次日录入，只作为结构复盘与后续验证样本。",
      includedInHistoricalHitRate: false,
    },
  ],
  bitcoin: [
    {
      id: "BTC-WEEKLY-AUXILIARY-20260815-V1",
      periodStart: "2026-08-17",
      periodEnd: "2026-08-23",
      status: "FORWARD_AUXILIARY",
      executionAuthority: "RESEARCH_ONLY",
      sourceArtifact: "2026-08-15 weekly Liuyao transcript without original chart",
      sourcePublishedAt: "2026-08-15T00:00:00+08:00",
      lockedAt: "2026-08-15T16:02:00+08:00",
      summary: "易老师综合解读：17日至19日可能快速修复但伴随冲顶风险；19日至20日为主要变盘窗口，20日需防周内高点后回落。来源同时给出相反路径，因此保持中性辅助，不改变正式周方向。",
      gapNote: "缺少可核验原卦、互卦、变卦与动爻，不能升级为完整六爻证据或动态权重样本。",
      includedInHistoricalHitRate: false,
    },
  ],
  eth: [
    {
      id: "ETH-WEEKLY-AUXILIARY-20260815-V1",
      periodStart: "2026-08-17",
      periodEnd: "2026-08-23",
      status: "FORWARD_AUXILIARY",
      executionAuthority: "RESEARCH_ONLY",
      sourceArtifact: "2026-08-15 weekly Liuyao transcript without original chart",
      sourcePublishedAt: "2026-08-15T00:00:00+08:00",
      lockedAt: "2026-08-15T16:02:00+08:00",
      summary: "易老师综合解读：ETH仍偏高波动震荡，17日至19日存在快速反弹窗口；20日前后若反弹失败，回落风险显著。当前只作为日内节奏提醒。",
      gapNote: "原始盘面不完整且来源承认此前时点偏差，不进入动态权重。",
      includedInHistoricalHitRate: false,
    },
  ],
};

export function listFocusResearchSupplements(assetId: string): FocusSupplementalEvidence[] {
  return (SUPPLEMENTS[assetId] ?? []).map((item) => ({ ...item }));
}
