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
  ],
};

export function listFocusResearchSupplements(assetId: string): FocusSupplementalEvidence[] {
  return (SUPPLEMENTS[assetId] ?? []).map((item) => ({ ...item }));
}
