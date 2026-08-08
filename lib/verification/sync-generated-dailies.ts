import "server-only";

import { prisma, hasPrisma } from "@/lib/prisma";
import {
  listDailyForecastRecords,
  upsertDailyForecastRecord,
} from "@/lib/data/daily-accuracy-store";
import { defaultCutoffAt } from "@/lib/market-data/daily-prices";
import { consensusStarsFromInputs } from "@/lib/forecasts/consensus-confidence";
import {
  DAILY_ACCURACY_ASSETS,
  DIRECTION_LABELS,
  PATTERN_LABELS,
  type DailyAccuracyPattern,
  type DailyForecastRecord,
} from "@/types/daily-accuracy";

export const OFFICIAL_GENERATED_DAILY_SYNC_START = "2026-08-01";

export type GeneratedDailySyncReport = {
  sourceAvailable: boolean;
  scanned: number;
  created: number;
  existing: number;
  unsupported: number;
  latePublished: number;
  errors: string[];
};

type VerificationAsset = (typeof DAILY_ACCURACY_ASSETS)[number];

type GeneratedDailyLike = {
  id: string;
  marketCode: string;
  forecastDate: string;
  direction: string;
  upProbability: number;
  sidewaysProbability: number;
  downProbability: number;
  expectedPath: string;
  supportLevels: unknown;
  resistanceLevels: unknown;
  confirmationLevel: string | null;
  invalidationLevel: string | null;
  liuyaoEvidence: string | null;
  qimenEvidence: string | null;
  calendarEvidence: unknown;
  newsEvidence: string | null;
  revisionReason: string | null;
  version: number;
  status: string;
  generatedAt: Date;
  publishedAt: Date | null;
  lockedAt: Date | null;
  createdAt: Date;
};

function cleanCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const ASSET_ALIASES: Record<string, string> = {
  BTC: "BTC",
  BTCUSD: "BTC",
  BITCOIN: "BTC",
  ETH: "ETH",
  ETHUSD: "ETH",
  ETHEREUM: "ETH",
  SPX: "SPX",
  GSPC: "SPX",
  SP500: "SPX",
  SANDP500: "SPX",
  NDX: "NDX",
  NASDAQ: "NDX",
  NASDAQ100: "NDX",
  SSE: "SSE",
  SSEC: "SSE",
  SHCOMP: "SSE",
  "000001SS": "SSE",
  HSTECH: "HSTECH",
  "3033HK": "HSTECH",
  GLD: "GLD",
  GOLD: "GLD",
  XAU: "GLD",
  XAUUSD: "GLD",
  GCF: "GLD",
  SILVER: "SILVER",
  XAG: "SILVER",
  XAGUSD: "SILVER",
  SIF: "SILVER",
  WTI: "WTI",
  CLF: "WTI",
  USOIL: "WTI",
};

export function verificationAssetForMarketCode(marketCode: string): VerificationAsset | null {
  const cleaned = cleanCode(marketCode);
  const key = ASSET_ALIASES[cleaned] ?? cleaned;
  return DAILY_ACCURACY_ASSETS.find((asset) => asset.key === key) ?? null;
}

export function generatedVerificationIdentity(input: {
  forecastDate: string;
  symbol: string;
  version: number;
}): string {
  return `${input.forecastDate}|${input.symbol.toUpperCase()}|v${Math.max(1, input.version || 1)}`;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function hasEvidence(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

export function generatedDirection(text: string): DailyForecastRecord["direction"] {
  if (/先涨后跌|冲高回落|震荡下跌|看跌|下跌/.test(text)) return "DOWN";
  if (/先跌后涨|探底回升|震荡上涨|看涨|上涨/.test(text)) return "UP";
  return "FLAT";
}

export function generatedPattern(text: string): DailyAccuracyPattern {
  if (/冲高回落/.test(text)) return "SURGE_THEN_PULLBACK";
  if (/探底回升/.test(text)) return "DIP_THEN_RECOVERY";
  if (/先涨后跌/.test(text)) return "UP_THEN_DOWN";
  if (/先跌后涨/.test(text)) return "DOWN_THEN_UP";
  if (/震荡上涨/.test(text)) return "RANGE_UP";
  if (/震荡下跌/.test(text)) return "RANGE_DOWN";
  if (/看涨|上涨/.test(text)) return "UP";
  if (/看跌|下跌/.test(text)) return "DOWN";
  return "RANGE";
}

export function generatedDailyToVerificationRecord(
  row: GeneratedDailyLike,
  asset: VerificationAsset
): DailyForecastRecord {
  const published = row.publishedAt ?? row.lockedAt ?? row.generatedAt ?? row.createdAt;
  const publishedAt = published.toISOString();
  const supportLevels = asStringArray(row.supportLevels);
  const resistanceLevels = asStringArray(row.resistanceLevels);
  const formalDirection = row.direction ?? "";
  const formalPath = `${formalDirection} ${row.expectedPath ?? ""}`.trim();
  // Match the production UI contract: the formal direction comes from the
  // locked direction field, while the richer path may use expectedPath.
  const direction = generatedDirection(formalDirection);
  const pattern = generatedPattern(formalPath);
  const probability = Math.max(
    Number(row.upProbability) || 0,
    Number(row.sidewaysProbability) || 0,
    Number(row.downProbability) || 0
  );
  const frameworkCount = Math.max(
    1,
    [row.liuyaoEvidence, row.qimenEvidence, row.calendarEvidence, row.newsEvidence].filter(hasEvidence).length
  );
  const consensus = consensusStarsFromInputs({
    confidence: probability,
    frameworkCount,
    hasTechnical: Boolean(supportLevels.length && resistanceLevels.length),
    pathDefined: Boolean(row.expectedPath?.trim()),
  });
  const cutoffAt = defaultCutoffAt(row.forecastDate, asset.market);

  return {
    id: `generated-daily:${row.id}`,
    forecastDate: row.forecastDate,
    assetName: asset.assetName,
    symbol: asset.symbol,
    market: asset.market,
    direction,
    directionLabel: DIRECTION_LABELS[direction],
    predictedPattern: pattern,
    predictedPatternLabel: PATTERN_LABELS[pattern],
    expectedPath: row.expectedPath?.trim() ? [row.expectedPath.trim()] : [],
    probability,
    consensusStars: consensus.stars,
    consensusScore: consensus.score,
    consensusLabel: consensus.label,
    summary: [row.expectedPath, row.liuyaoEvidence, row.revisionReason]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join("。"),
    publishedAt,
    cutoffAt,
    status: "published",
    originalVersion: Math.max(1, Number(row.version) || 1),
    source: "MOOX GeneratedDailyForecast locked publication",
    isSystemTest: false,
    quoteSymbol: asset.quoteSymbol,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.generatedAt.toISOString(),
    supportLevels,
    resistanceLevels,
    confirmation: row.confirmationLevel ?? undefined,
    invalidation: row.invalidationLevel ?? undefined,
  };
}

function beijingDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function listFormalGeneratedDailiesForVerification(
  now = new Date()
): Promise<GeneratedDailyLike[]> {
  if (!hasPrisma() || !prisma) return [];
  const futureLimit = new Date(now.getTime() + 45 * 86_400_000);
  return prisma.generatedDailyForecast.findMany({
    where: {
      forecastDate: {
        gte: OFFICIAL_GENERATED_DAILY_SYNC_START,
        lte: beijingDateKey(futureLimit),
      },
      OR: [
        { status: { in: ["PUBLISHED", "LOCKED"] } },
        {
          status: "ARCHIVED",
          OR: [{ publishedAt: { not: null } }, { lockedAt: { not: null } }],
        },
      ],
    },
    select: {
      id: true,
      marketCode: true,
      forecastDate: true,
      direction: true,
      upProbability: true,
      sidewaysProbability: true,
      downProbability: true,
      expectedPath: true,
      supportLevels: true,
      resistanceLevels: true,
      confirmationLevel: true,
      invalidationLevel: true,
      liuyaoEvidence: true,
      qimenEvidence: true,
      calendarEvidence: true,
      newsEvidence: true,
      revisionReason: true,
      version: true,
      status: true,
      generatedAt: true,
      publishedAt: true,
      lockedAt: true,
      createdAt: true,
    },
    orderBy: [{ forecastDate: "asc" }, { marketCode: "asc" }, { version: "asc" }],
    take: 2000,
  });
}

export async function syncGeneratedDailyForecastsToVerificationStore(input: {
  now?: Date;
} = {}): Promise<GeneratedDailySyncReport> {
  const now = input.now ?? new Date();
  const report: GeneratedDailySyncReport = {
    sourceAvailable: hasPrisma(),
    scanned: 0,
    created: 0,
    existing: 0,
    unsupported: 0,
    latePublished: 0,
    errors: [],
  };
  if (!hasPrisma() || !prisma) return report;

  let rows: GeneratedDailyLike[];
  try {
    rows = await listFormalGeneratedDailiesForVerification(now);
  } catch (error) {
    report.errors.push(`generated-source:${error instanceof Error ? error.message : String(error)}`);
    return report;
  }

  const existing = await listDailyForecastRecords();
  const identities = new Set(
    existing.map((record) =>
      generatedVerificationIdentity({
        forecastDate: record.forecastDate,
        symbol: record.symbol,
        version: record.originalVersion,
      })
    )
  );

  for (const row of rows) {
    report.scanned += 1;
    const asset = verificationAssetForMarketCode(row.marketCode);
    if (!asset) {
      report.unsupported += 1;
      continue;
    }
    const identity = generatedVerificationIdentity({
      forecastDate: row.forecastDate,
      symbol: asset.symbol,
      version: row.version,
    });
    if (identities.has(identity)) {
      report.existing += 1;
      continue;
    }

    try {
      const record = generatedDailyToVerificationRecord(row, asset);
      if (new Date(record.publishedAt).getTime() > new Date(record.cutoffAt).getTime()) {
        report.latePublished += 1;
      }
      await upsertDailyForecastRecord(record);
      identities.add(identity);
      report.created += 1;
    } catch (error) {
      report.errors.push(`${row.marketCode}:${row.forecastDate}:v${row.version}:${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return report;
}
