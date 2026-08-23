import { cycleResearchBtcGold20260823Records } from "@/lib/data/cycle-research-btc-gold-20260823";

export type MemberCycleResearchOverlay = {
  id: string;
  symbol: string;
  assetNameZh: string;
  assetNameEn: string;
  sourceLabelZh: string;
  sourceLabelEn: string;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  relationship: "ALIGNED" | "DIVERGENT";
  relationshipZh: string;
  relationshipEn: string;
  sourcePublishedAt: string;
  sourceDetailsExplicit: boolean;
  invalidationExplicit: boolean;
  windows: Array<{
    id: string;
    start: string;
    end: string;
    labelZh: string;
    labelEn: string;
    noteZh: string;
    noteEn: string;
  }>;
};

/**
 * Explicit allow-list projection. Do not spread ResearchRecord here: the
 * internal paid-source URL and profile metadata must never cross this boundary.
 */
export function getMemberCycleResearchOverlays(): MemberCycleResearchOverlay[] {
  return cycleResearchBtcGold20260823Records.map((record) => {
    const divergent = record.tags.includes("divergent-from-teacher-short-path");
    return {
      id: record.id,
      symbol: record.symbol ?? record.assetId.toUpperCase(),
      assetNameZh: record.assetName.zhCN,
      assetNameEn: record.assetName.en,
      sourceLabelZh: record.publicSourceLabel.zhCN,
      sourceLabelEn: record.publicSourceLabel.en,
      titleZh: record.title.zhCN,
      titleEn: record.title.en,
      summaryZh: record.summary.zhCN,
      summaryEn: record.summary.en,
      relationship: divergent ? "DIVERGENT" : "ALIGNED",
      relationshipZh: divergent ? "与老师短线/月内路径有分歧" : "与MOOX九月、十月主路径基本同向",
      relationshipEn: divergent ? "Diverges from the teacher short/monthly path" : "Broadly aligned with the MOOX September/October path",
      sourcePublishedAt: record.sourcePublishedAt ?? record.publishedAt,
      sourceDetailsExplicit: true,
      invalidationExplicit: false,
      windows: (record.turningWindows ?? []).map((window) => ({
        id: window.id,
        start: window.date ?? window.start ?? "",
        end: window.date ?? window.end ?? "",
        labelZh: window.label.zhCN,
        labelEn: window.label.en,
        noteZh: window.note?.zhCN ?? "",
        noteEn: window.note?.en ?? "",
      })),
    };
  });
}
