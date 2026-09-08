import type { ResearchRecord } from "@/types/research";

// Editorial review order only. Never used as a direction vote or execution weight.
export function sourceReviewPriority(record: ResearchRecord): number {
  if (record.sourceProfileId === "core-liuyao-cycle" || /丙午|bingwu/i.test(record.internalSourceRef ?? "")) return 1;
  if (record.sourceProfileId === "gann-btctw0" || /(?:x\.com\/|@)BTCTW0\b/i.test(record.internalSourceRef ?? "")) return 2;
  return 3;
}

export function researchReviewQueue(records: ResearchRecord[], now = new Date()): ResearchRecord[] {
  const time = now.getTime();
  if (!Number.isFinite(time)) return [];
  return records.filter((record) => {
    const available = Date.parse(record.ingestedAt ?? record.publishedAt);
    const published = Date.parse(record.publishedAt);
    // Undated legacy theses remain in the library, not in a current review queue.
    const end = record.expiresAt ? Date.parse(record.expiresAt) : record.forecastEnd ? Date.parse(`${record.forecastEnd}T23:59:59.999Z`) : NaN;
    return Number.isFinite(available) && available <= time && Number.isFinite(published) && published <= time && end > time && record.status !== "archived" && record.status !== "invalidated";
  }).sort((a, b) => sourceReviewPriority(a) - sourceReviewPriority(b));
}
