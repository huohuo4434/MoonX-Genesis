/** Published stock analysis — public only when status === published. */

export type StockPublishStatus = "draft" | "internal_review" | "published" | "archived";

export type StockAnalysisRecord = {
  id: string;
  name: string;
  symbol: string;
  market: string;
  direction: string;
  directionLabel: string;
  validUntil: string;
  coreScenario: string;
  keyLevels: string[];
  invalidation: string;
  lastUpdatedAt: string;
  verificationSummary?: string;
  status: StockPublishStatus;
  /** Internal only — never sent to public API/props. */
  internalNotes?: string;
  hexagramNotes?: string;
  sourceIds?: string[];
  createdAt: string;
  publishedAt?: string;
};

export function isPublicStock(s: StockAnalysisRecord): boolean {
  return s.status === "published";
}
