import "server-only";

import type { ResearchRecord } from "@/types/research";
import { filterPublicResearchRecords } from "@/lib/research/visibility";

export {
  filterPublicResearchRecords,
  isPublicResearchRecord,
  resolveResearchVisibility,
} from "@/lib/research/visibility";

/** Strip member-only price levels and detail before serializing to public pages. */
export function redactResearchRecordForPublic(record: ResearchRecord): ResearchRecord {
  const base =
    record.accessLevel !== "member"
      ? { ...record }
      : {
          ...record,
          supports: undefined,
          resistances: undefined,
          targets: undefined,
          memberContent: undefined,
          invalidation: undefined,
          summary: record.previewSummary ?? record.summary,
        };
  // Long-term forecast candles / internal source refs never ship to public HTML.
  delete base.forecastChart;
  delete base.internalSourceRef;
  delete base.comparison;
  delete base.engineUsage;
  delete base.hexagramDetail;
  delete base.hexagramPrimary;
  delete base.hexagramChanged;
  return base;
}

export function redactResearchRecordsForPublic(records: ResearchRecord[]): ResearchRecord[] {
  return records.map(redactResearchRecordForPublic);
}

export async function listPublicResearchRecords(
  loader: () => Promise<ResearchRecord[]>
): Promise<ResearchRecord[]> {
  const records = await loader();
  return redactResearchRecordsForPublic(filterPublicResearchRecords(records));
}

export async function countPublicResearchRecords(
  loader: () => Promise<ResearchRecord[]>
): Promise<number> {
  return (await listPublicResearchRecords(loader)).length;
}
