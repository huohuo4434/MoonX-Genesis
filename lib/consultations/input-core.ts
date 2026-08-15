import type { BaziInput, ConsultationInput, LiuyaoInput } from "@/types/member-consultation";

const IANA_ZONE = /^[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+)+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateConsultationInput(value: unknown): { ok: true; input: ConsultationInput } | { ok: false; missing: string[] } {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const missing: string[] = [];
  const requiredText = (key: string, min = 1) => {
    const v = row[key]; if (typeof v !== "string" || v.trim().length < min) missing.push(key);
  };
  if (row.kind === "LIUYAO") {
    ["question", "scope", "horizon", "castAt", "timezone", "location", "castMethod"].forEach((k) => requiredText(k));
    if (!IANA_ZONE.test(String(row.timezone ?? ""))) missing.push("timezone");
    if (!Array.isArray(row.linesBottomUp) || row.linesBottomUp.length !== 6 || row.linesBottomUp.some((n) => ![6,7,8,9].includes(Number(n)))) missing.push("linesBottomUp");
    if (row.consent !== true) missing.push("consent");
    return missing.length ? { ok: false, missing: [...new Set(missing)] } : { ok: true, input: row as LiuyaoInput };
  }
  if (row.kind === "BAZI") {
    ["calendarType", "birthDate", "timePrecision", "timezone", "location", "sourceConfidence", "topic", "horizon"].forEach((k) => requiredText(k));
    if (!ISO_DATE.test(String(row.birthDate ?? "")) || Number.isNaN(Date.parse(`${row.birthDate}T00:00:00Z`))) missing.push("birthDate");
    if (!IANA_ZONE.test(String(row.timezone ?? ""))) missing.push("timezone");
    if (row.timePrecision === "EXACT" && (typeof row.birthTime !== "string" || !/^\d{2}:\d{2}$/.test(row.birthTime))) missing.push("birthTime");
    if (row.trueSolarTimeConsent !== true) missing.push("trueSolarTimeConsent");
    if (row.consent !== true) missing.push("consent");
    return missing.length ? { ok: false, missing: [...new Set(missing)] } : { ok: true, input: row as BaziInput };
  }
  return { ok: false, missing: ["kind"] };
}

const TRIGRAMS = ["坤", "震", "坎", "兑", "艮", "离", "巽", "乾"] as const;
export function deriveLiuyaoStructure(input: LiuyaoInput) {
  const bits = input.linesBottomUp.map((n) => n === 7 || n === 9 ? 1 : 0);
  const lower = bits[0]! + bits[1]! * 2 + bits[2]! * 4;
  const upper = bits[3]! + bits[4]! * 2 + bits[5]! * 4;
  return {
    yinYangBottomUp: bits.map((n) => n ? "YANG" : "YIN"),
    movingLines: input.linesBottomUp.flatMap((n, index) => n === 6 || n === 9 ? [index + 1] : []),
    lowerTrigram: TRIGRAMS[lower], upperTrigram: TRIGRAMS[upper],
    basicHexagram: `${TRIGRAMS[upper]}上${TRIGRAMS[lower]}下`,
    omitted: ["用神", "世应", "纳甲"] as const,
  };
}
