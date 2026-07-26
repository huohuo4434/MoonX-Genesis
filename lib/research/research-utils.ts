/**
 * Shared helpers for the Research Library: filtering/search plus a
 * lightweight data-integrity validator (Part 15 of the V1.1 spec). The
 * validator is intended to run in development/build (see
 * `scripts/validate-research-data.ts`) and must never crash a production
 * page — components should treat missing optional fields with safe
 * fallbacks regardless of validator output.
 */
import type { Locale, LocalizedText } from "@/lib/i18n/config";
import { pickLocalized } from "@/lib/i18n/config";
import type { ResearchDirection, ResearchFramework, ResearchMarket, ResearchRecord, ResearchSourceType, ResearchStatus, TimelineEvent } from "@/types/research";

const VALID_FRAMEWORKS: ResearchFramework[] = [
  "oracle-six-yao",
  "qimen",
  "cycle",
  "gann",
  "harmonic",
  "chan",
  "market-flow",
  "macro",
  "technical",
  "internal",
];

const VALID_DIRECTIONS: ResearchDirection[] = [
  "strong-bullish",
  "bullish",
  "slightly-bullish",
  "neutral",
  "slightly-bearish",
  "bearish",
  "strong-bearish",
  "insufficient-evidence",
];

const VALID_MARKETS: ResearchMarket[] = [
  "crypto",
  "us-equity",
  "china-equity",
  "hong-kong-equity",
  "commodity",
  "index",
  "semiconductor",
];

const VALID_SOURCE_TYPES: ResearchSourceType[] = ["private-teacher", "public-analyst", "internal-research"];
const VALID_STATUSES: ResearchStatus[] = ["pending", "active", "partially-verified", "verified", "invalidated", "archived"];

export interface ValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  recordId?: string;
}

function isValidIsoDate(value: string | undefined): boolean {
  if (!value) return true;
  return !Number.isNaN(new Date(value).getTime());
}

function isEmptyLocalizedText(value: LocalizedText | undefined): boolean {
  if (!value) return true;
  return !value.zhCN?.trim() || !value.zhTW?.trim() || !value.en?.trim();
}

/** Validates the research record dataset. Never throws — always returns a list of issues. */
export function validateResearchRecords(records: ResearchRecord[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();

  for (const record of records) {
    const ref = record.id || "(missing id)";

    if (!record.id) {
      issues.push({ level: "error", code: "missing-id", message: "Record is missing an id.", recordId: ref });
    } else if (seenIds.has(record.id)) {
      issues.push({ level: "error", code: "duplicate-id", message: `Duplicate record id: ${record.id}`, recordId: ref });
    } else {
      seenIds.add(record.id);
    }

    if (!isValidIsoDate(record.publishedAt)) {
      issues.push({ level: "error", code: "invalid-date", message: `Invalid publishedAt date.`, recordId: ref });
    }
    if (!isValidIsoDate(record.forecastStart)) {
      issues.push({ level: "error", code: "invalid-date", message: `Invalid forecastStart date.`, recordId: ref });
    }
    if (!isValidIsoDate(record.forecastEnd)) {
      issues.push({ level: "error", code: "invalid-date", message: `Invalid forecastEnd date.`, recordId: ref });
    }
    if (record.forecastStart && record.forecastEnd) {
      if (new Date(record.forecastEnd).getTime() < new Date(record.forecastStart).getTime()) {
        issues.push({ level: "error", code: "forecast-end-before-start", message: "forecastEnd is before forecastStart.", recordId: ref });
      }
    }

    if (record.editorialConfidence < 0 || record.editorialConfidence > 100) {
      issues.push({ level: "error", code: "confidence-out-of-range", message: `editorialConfidence ${record.editorialConfidence} is outside 0-100.`, recordId: ref });
    }

    if (!VALID_FRAMEWORKS.includes(record.framework)) {
      issues.push({ level: "error", code: "unsupported-framework", message: `Unsupported framework: ${record.framework}`, recordId: ref });
    }
    if (!VALID_DIRECTIONS.includes(record.direction)) {
      issues.push({ level: "error", code: "invalid-direction", message: `Invalid direction: ${record.direction}`, recordId: ref });
    }
    if (!VALID_MARKETS.includes(record.market)) {
      issues.push({ level: "warning", code: "unsupported-market", message: `Unsupported market: ${record.market}`, recordId: ref });
    }
    if (!VALID_SOURCE_TYPES.includes(record.sourceType)) {
      issues.push({ level: "warning", code: "unsupported-source-type", message: `Unsupported sourceType: ${record.sourceType}`, recordId: ref });
    }
    if (!VALID_STATUSES.includes(record.status)) {
      issues.push({ level: "warning", code: "unsupported-status", message: `Unsupported status: ${record.status}`, recordId: ref });
    }

    if (record.consensusEligible && record.direction === "insufficient-evidence") {
      issues.push({
        level: "warning",
        code: "eligible-insufficient-evidence",
        message: "Record marked consensusEligible but direction is insufficient-evidence.",
        recordId: ref,
      });
    }

    for (const [field, value] of Object.entries({
      assetName: record.assetName,
      publicSourceLabel: record.publicSourceLabel,
      horizon: record.horizon,
      title: record.title,
      summary: record.summary,
    })) {
      if (isEmptyLocalizedText(value as LocalizedText)) {
        issues.push({ level: "warning", code: "missing-translation", message: `Field "${field}" is missing one or more locale variants.`, recordId: ref });
      }
    }

    if (!record.thesis || record.thesis.length === 0) {
      issues.push({ level: "warning", code: "empty-required-field", message: "thesis is empty.", recordId: ref });
    }
    if (record.internalSourceRef && record.internalSourceRef.trim().length === 0) {
      issues.push({ level: "warning", code: "empty-required-field", message: "internalSourceRef is set but empty.", recordId: ref });
    }
  }

  return issues;
}

export function validateTimelineEvents(events: TimelineEvent[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();

  for (const event of events) {
    const ref = event.id || "(missing id)";
    if (seenIds.has(event.id)) {
      issues.push({ level: "error", code: "duplicate-id", message: `Duplicate timeline event id: ${event.id}`, recordId: ref });
    } else {
      seenIds.add(event.id);
    }

    const signature = `${event.date ?? ""}|${event.start ?? ""}|${event.end ?? ""}|${event.title.en}`;
    if (seenSignatures.has(signature)) {
      issues.push({ level: "warning", code: "duplicate-timeline-event", message: "Possible duplicate timeline event.", recordId: ref });
    } else {
      seenSignatures.add(signature);
    }

    if (!isValidIsoDate(event.date) || !isValidIsoDate(event.start) || !isValidIsoDate(event.end)) {
      issues.push({ level: "error", code: "invalid-date", message: "Timeline event has an invalid date.", recordId: ref });
    }
    if (isEmptyLocalizedText(event.title)) {
      issues.push({ level: "warning", code: "missing-translation", message: "Timeline event title is missing a locale variant.", recordId: ref });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------
// Filtering & search helpers for the Research Library UI
// ---------------------------------------------------------------------

export interface ResearchFilters {
  query?: string;
  assetId?: string;
  market?: ResearchMarket;
  framework?: ResearchFramework;
  direction?: ResearchDirection;
  sourceType?: ResearchSourceType;
  status?: ResearchStatus;
}

export function filterResearchRecords(records: ResearchRecord[], filters: ResearchFilters, locale: Locale): ResearchRecord[] {
  const query = filters.query?.trim().toLowerCase();

  return records.filter((record) => {
    if (filters.assetId && record.assetId !== filters.assetId) return false;
    if (filters.market && record.market !== filters.market) return false;
    if (filters.framework && record.framework !== filters.framework) return false;
    if (filters.direction && record.direction !== filters.direction) return false;
    if (filters.sourceType && record.sourceType !== filters.sourceType) return false;
    if (filters.status && record.status !== filters.status) return false;

    if (query) {
      const haystack = [
        pickLocalized(record.assetName, locale),
        pickLocalized(record.title, locale),
        pickLocalized(record.summary, locale),
        record.symbol ?? "",
        ...record.tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

/** Safe fallback text shown whenever an optional/curated field is absent — never crash the UI. */
export function withFallback(value: string | undefined | null, fallback: string): string {
  return value && value.trim().length > 0 ? value : fallback;
}

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral" | "outline";

export function directionBadgeVariant(direction: ResearchDirection): BadgeVariant {
  switch (direction) {
    case "strong-bullish":
    case "bullish":
    case "slightly-bullish":
      return "success";
    case "strong-bearish":
    case "bearish":
    case "slightly-bearish":
      return "danger";
    case "insufficient-evidence":
      return "outline";
    default:
      return "neutral";
  }
}

export function statusBadgeVariant(status: ResearchStatus): BadgeVariant {
  switch (status) {
    case "verified":
      return "success";
    case "partially-verified":
      return "info";
    case "active":
      return "default";
    case "pending":
      return "warning";
    case "invalidated":
      return "danger";
    case "archived":
    default:
      return "neutral";
  }
}
