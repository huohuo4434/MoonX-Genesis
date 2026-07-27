import "server-only";

import type { ResearchRecord } from "@/types/research";

/** Strip member-only price levels and detail before serializing to public pages. */
export function redactResearchRecordForPublic(record: ResearchRecord): ResearchRecord {
  if (record.accessLevel !== "member") return record;
  return {
    ...record,
    supports: undefined,
    resistances: undefined,
    targets: undefined,
    memberContent: undefined,
    invalidation: undefined,
    summary: record.previewSummary ?? record.summary,
  };
}

export function redactResearchRecordsForPublic(records: ResearchRecord[]): ResearchRecord[] {
  return records.map(redactResearchRecordForPublic);
}
