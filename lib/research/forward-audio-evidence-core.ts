import type { ResearchRecord } from "@/types/research";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function validDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_KEY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Shared gate for every production consumer of a forward audio interpretation. */
export function isForwardAudioResearchRecordEligible(record: ResearchRecord): boolean {
  if (record.verificationEligibility !== "forward-audio" || record.sourcePublishedAtVerified !== true) return false;
  if (!record.tags.includes("source-mode:audio-transcript") || !record.tags.includes("source-locked")) return false;
  if (!validDateKey(record.forecastStart) || !validDateKey(record.forecastEnd) || record.forecastStart > record.forecastEnd) return false;
  const start = new Date(`${record.forecastStart}T00:00:00.000Z`).getTime();
  const published = record.sourcePublishedAt ? new Date(record.sourcePublishedAt).getTime() : Number.NaN;
  const locked = record.ingestedAt ? new Date(record.ingestedAt).getTime() : Number.NaN;
  if (![start, published, locked].every(Number.isFinite) || published >= start || locked >= start) return false;
  const evidence = record.verbalForecastEvidence;
  if (evidence?.sourceMode !== "AUDIO_TRANSCRIPT") return false;
  if (evidence.interpretation.trim().length < 20 || !evidence.confirmation.trim() || !evidence.invalidation.trim()) return false;
  return record.direction !== "insufficient-evidence";
}
