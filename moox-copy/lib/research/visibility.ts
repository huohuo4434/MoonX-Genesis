import { pickLocalized } from "@/lib/i18n/config";
import type { ResearchRecord, ResearchVisibility } from "@/types/research";

const INTERNAL_SUMMARY_MARKERS = [
  "目前没有可用结论",
  "目前没有足够清晰的结论",
  "等待录入",
  "尚未完成",
] as const;

function summaryText(record: ResearchRecord): string {
  return pickLocalized(record.summary, "zh-CN");
}

/** Resolve effective visibility when not explicitly set on the record. */
export function resolveResearchVisibility(record: ResearchRecord): ResearchVisibility {
  if (record.visibility === "archived" || record.visibility === "draft") return record.visibility;
  // Long-horizon research is always internal for public surfaces.
  const horizonBlob = `${record.horizon?.zhCN ?? ""} ${record.horizon?.en ?? ""} ${record.id}`.toLowerCase();
  if (
    /周|week|月|month|季|quarter|半年|半年度|年|year|annual|多年|十年|decade|long/.test(horizonBlob) ||
    /annual|yearly|monthly|weekly|quarter|framework|risk-event|long/.test(record.id.toLowerCase())
  ) {
    return "internal";
  }
  if (record.visibility) return record.visibility;
  if (record.direction === "insufficient-evidence") return "internal";
  if (record.humanReviewStatus === "pending-review") return "internal";
  const summary = summaryText(record);
  if (INTERNAL_SUMMARY_MARKERS.some((m) => summary.includes(m))) return "internal";
  // Default: internal — public product no longer exposes research library records.
  return "internal";
}

export function isPublicResearchRecord(record: ResearchRecord): boolean {
  return resolveResearchVisibility(record) === "public";
}

export function filterPublicResearchRecords(records: ResearchRecord[]): ResearchRecord[] {
  return records.filter(isPublicResearchRecord);
}
