import "server-only";

import { consensusStarsFromInputs } from "@/lib/forecasts/consensus-confidence";
import { defaultCutoffAt } from "@/lib/market-data/daily-prices";
import { prisma, hasPrisma } from "@/lib/prisma";
import { listFocusVerificationEvidence } from "@/lib/verification/focus-verification-evidence";
import { focusDailyQuoteCapability } from "@/lib/data/conviction/focus-daily-generation-core";
import { STATIC_MEMBER_AUTOMATION_FOCUS } from "@/lib/data/conviction/focus-registry-core";
import { listDailyForecastRecords, upsertDailyForecastRecord } from "@/lib/data/daily-accuracy-store";
import { ensureGeneratedForecastSourceSchema } from "@/lib/weekly-source/generated-source-schema";
import { generatedDirection, generatedPattern } from "@/lib/verification/sync-generated-dailies";
import { DIRECTION_LABELS, PATTERN_LABELS, type DailyAccuracyMarket, type DailyForecastRecord } from "@/types/daily-accuracy";

export const MEMBER_FOCUS_VERIFICATION_START = "2026-08-24";

const CORE_DUPLICATE_ASSETS = new Set(["btc", "eth", "gold", "silver", "wti-crude"]);
const NON_CANONICAL_PUBLIC_QUOTES = new Set(["asteroid", "spcx"]);

export type FocusGeneratedSyncReport = {
  sourceAvailable: boolean;
  scanned: number;
  created: number;
  existing: number;
  unsupported: number;
  errors: string[];
  deferred: number;
};

function chinaDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function datePlusDays(date: Date, days: number): string {
  return chinaDateKey(new Date(date.getTime() + days * 86_400_000));
}

function focusAssetId(marketCode: string): string | null {
  const match = /^FOCUS:([A-Z0-9-]+)$/i.exec(marketCode.trim());
  return match?.[1]?.toLowerCase() ?? null;
}

function verificationMarket(input: { assetType: string; quoteMarket: string | null }): DailyAccuracyMarket {
  if (input.assetType === "CRYPTO") return "CRYPTO";
  if (input.assetType === "COMMODITY") return "US_FUTURES";
  if (input.quoteMarket === "HK") return "HK";
  if (input.quoteMarket === "CN") return "CN";
  return "US";
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

export async function syncFocusGeneratedDailiesToVerificationStore(
  now = new Date(),
  options: { maxRecords?: number; deadlineAt?: number } = {}
): Promise<FocusGeneratedSyncReport> {
  const report: FocusGeneratedSyncReport = {
    sourceAvailable: hasPrisma(),
    scanned: 0,
    created: 0,
    existing: 0,
    unsupported: 0,
    errors: [],
    deferred: 0,
  };
  if (!hasPrisma() || !prisma) return report;

  const schema = await ensureGeneratedForecastSourceSchema();
  if (!schema.ready) {
    report.errors.push(`generated-schema:${schema.error ?? "unavailable"}`);
    return report;
  }

  let rows: Awaited<ReturnType<typeof prisma.generatedDailyForecast.findMany>>;
  let evidence: Awaited<ReturnType<typeof listFocusVerificationEvidence>>;
  let existing: Awaited<ReturnType<typeof listDailyForecastRecords>>;
  try {
    [rows, evidence, existing] = await Promise.all([
      prisma.generatedDailyForecast.findMany({
        where: {
          marketCode: { startsWith: "FOCUS:" },
          // Verification only needs completed/current dates. Future member rows remain
          // in the authoritative GeneratedDailyForecast store until their day arrives.
          forecastDate: { gte: MEMBER_FOCUS_VERIFICATION_START, lte: datePlusDays(now, 0) },
          status: { in: ["PUBLISHED", "LOCKED", "ARCHIVED"] },
        },
        orderBy: [{ forecastDate: "asc" }, { marketCode: "asc" }, { version: "asc" }],
        take: 3000,
      }),
      listFocusVerificationEvidence(),
      listDailyForecastRecords(),
    ]);
  } catch (error) {
    report.errors.push(`focus-source:${error instanceof Error ? error.message : String(error)}`);
    return report;
  }
  const evidenceById = new Map(evidence.map((item) => [item.assetId, item]));
  const existingIds = new Set(existing.map((item) => item.id));

  for (const row of rows) {
    report.scanned += 1;
    const assetId = focusAssetId(row.marketCode);
    if (!assetId || CORE_DUPLICATE_ASSETS.has(assetId) || NON_CANONICAL_PUBLIC_QUOTES.has(assetId)) {
      report.unsupported += 1;
      continue;
    }
    const id = `member-focus-daily:${row.id}`;
    if (existingIds.has(id)) {
      report.existing += 1;
      continue;
    }
    const asset = evidenceById.get(assetId);
    if (!asset) {
      report.unsupported += 1;
      report.errors.push(`${row.marketCode}:${row.forecastDate}:asset-metadata-missing`);
      continue;
    }
    const quote = focusDailyQuoteCapability({
      symbol: asset.symbol,
      assetType: asset.assetType,
      exchange: asset.exchange,
    });
    if (!quote.available || !quote.quoteSymbol || !quote.market) {
      report.unsupported += 1;
      continue;
    }
    const source = asset.forecasts.find((forecast) => forecast.id === row.sourceWeeklyForecastId) ?? null;
    const formalPath = `${row.direction} ${row.expectedPath ?? ""}`.trim();
    const direction = generatedDirection(row.direction);
    const pattern = generatedPattern(formalPath);
    const supportLevels = strings(row.supportLevels);
    const resistanceLevels = strings(row.resistanceLevels);
    const probability = Math.max(row.upProbability, row.sidewaysProbability, row.downProbability);
    const consensus = consensusStarsFromInputs({
      confidence: probability,
      frameworkCount: Math.max(1, [row.liuyaoEvidence, row.qimenEvidence, row.calendarEvidence].filter(Boolean).length),
      hasTechnical: Boolean(supportLevels.length && resistanceLevels.length),
      pathDefined: Boolean(row.expectedPath?.trim()),
    });
    const publishedAt = (row.publishedAt ?? row.lockedAt ?? row.generatedAt ?? row.createdAt).toISOString();
    const definition = STATIC_MEMBER_AUTOMATION_FOCUS[assetId as keyof typeof STATIC_MEMBER_AUTOMATION_FOCUS];
    const market = verificationMarket({ assetType: asset.assetType, quoteMarket: quote.market });

    const record: DailyForecastRecord = {
      id,
      forecastDate: row.forecastDate,
      assetName: definition?.displayName ?? asset.symbol,
      symbol: asset.symbol,
      market,
      direction,
      directionLabel: DIRECTION_LABELS[direction],
      predictedPattern: pattern,
      predictedPatternLabel: PATTERN_LABELS[pattern],
      expectedPath: row.expectedPath?.trim() ? [row.expectedPath.trim()] : [],
      probability,
      consensusStars: consensus.stars,
      consensusScore: consensus.score,
      consensusLabel: consensus.label,
      summary: source?.summary ?? row.expectedPath ?? "",
      publishedAt,
      cutoffAt: defaultCutoffAt(row.forecastDate, market),
      status: "published",
      originalVersion: Math.max(1, row.version),
      source: "会员重点关注 · 锁定周卦派生",
      quoteSymbol: quote.quoteSymbol,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.generatedAt.toISOString(),
      supportLevels,
      resistanceLevels,
      confirmation: row.confirmationLevel ?? undefined,
      invalidation: row.invalidationLevel ?? undefined,
      visibility: "MEMBER",
      sourceForecastId: source?.id ?? row.sourceWeeklyForecastId,
      sourcePeriodStart: source?.periodStart ?? null,
      sourcePeriodEnd: source?.periodEnd ?? null,
      sourcePrimaryHexagram: source?.ichingEvidence.primaryHexagram ?? null,
      sourceChangedHexagram: source?.ichingEvidence.changingHexagram ?? null,
      sourceInterpretation: source?.ichingEvidence.notes ?? null,
      sourceWeeklyDirection: source?.direction ?? null,
      revisionReason: row.revisionReason,
    };

    if (report.created >= (options.maxRecords ?? Infinity) || Date.now() >= (options.deadlineAt ?? Infinity)) {
      report.deferred += 1;
      continue;
    }
    try {
      await upsertDailyForecastRecord(record);
      existingIds.add(id);
      report.created += 1;
    } catch (error) {
      report.errors.push(`${row.marketCode}:${row.forecastDate}:v${row.version}:${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return report;
}
