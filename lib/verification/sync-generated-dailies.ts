import "server-only";

import { prisma, hasPrisma } from "@/lib/prisma";
import {
  listDailyForecastRecords,
  upsertDailyForecastRecord,
} from "@/lib/data/daily-accuracy-store";
import { defaultCutoffAt } from "@/lib/market-data/daily-prices";
import { consensusStarsFromInputs } from "@/lib/forecasts/consensus-confidence";
import { ensureGeneratedForecastSourceSchema } from "@/lib/weekly-source/generated-source-schema";
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
  upProbability?: number | null;
  sidewaysProbability?: number | null;
  downProbability?: number | null;
  expectedPath?: string | null;
  supportLevels?: unknown;
  resistanceLevels?: unknown;
  confirmationLevel?: string | null;
  invalidationLevel?: string | null;
  liuyaoEvidence?: string | null;
  qimenEvidence?: string | null;
  calendarEvidence?: unknown;
  newsEvidence?: string | null;
  revisionReason?: string | null;
  version?: number | null;
  status: string;
  generatedAt?: Date | null;
  publishedAt?: Date | null;
  lockedAt?: Date | null;
  createdAt: Date;
};

type GeneratedQueryMode = "full" | "core" | "minimum";

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
  const version = Math.max(1, Number(row.version) || 1);

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
    originalVersion: version,
    source: "MOOX GeneratedDailyForecast locked publication",
    isSystemTest: false,
    quoteSymbol: asset.quoteSymbol,
    createdAt: row.createdAt.toISOString(),
    updatedAt: (row.generatedAt ?? row.createdAt).toISOString(),
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

function formalGeneratedStatus(row: GeneratedDailyLike): boolean {
  const status = String(row.status ?? "").trim().toUpperCase();
  if (status === "PUBLISHED" || status === "LOCKED") return true;
  if (status === "ARCHIVED") return Boolean(row.publishedAt || row.lockedAt);
  return false;
}

async function queryGeneratedDailyRows(
  mode: GeneratedQueryMode,
  futureDateKey: string
): Promise<GeneratedDailyLike[]> {
  if (!prisma) return [];
  const where = {
    marketCode: { not: { startsWith: "FOCUS:" } },
    forecastDate: {
      gte: OFFICIAL_GENERATED_DAILY_SYNC_START,
      lte: futureDateKey,
    },
  };
  const versionedOrderBy = [{ forecastDate: "asc" as const }, { marketCode: "asc" as const }, { version: "asc" as const }];

  if (mode === "full") {
    const rows = await prisma.generatedDailyForecast.findMany({
      where,
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
      orderBy: versionedOrderBy,
      take: 2000,
    });
    return rows as unknown as GeneratedDailyLike[];
  }

  if (mode === "core") {
    const rows = await prisma.generatedDailyForecast.findMany({
      where,
      select: {
        id: true,
        marketCode: true,
        forecastDate: true,
        direction: true,
        upProbability: true,
        sidewaysProbability: true,
        downProbability: true,
        expectedPath: true,
        version: true,
        status: true,
        generatedAt: true,
        publishedAt: true,
        lockedAt: true,
        createdAt: true,
      },
      orderBy: versionedOrderBy,
      take: 2000,
    });
    return rows as unknown as GeneratedDailyLike[];
  }

  const rows = await prisma.generatedDailyForecast.findMany({
    where,
    select: {
      id: true,
      marketCode: true,
      forecastDate: true,
      direction: true,
      status: true,
      createdAt: true,
    },
    orderBy: [{ forecastDate: "asc" }, { marketCode: "asc" }],
    take: 2000,
  });
  return rows as unknown as GeneratedDailyLike[];
}

export async function listFormalGeneratedDailiesForVerification(
  now = new Date()
): Promise<GeneratedDailyLike[]> {
  if (!hasPrisma() || !prisma) return [];
  const futureDateKey = beijingDateKey(new Date(now.getTime() + 45 * 86_400_000));
  const modes: GeneratedQueryMode[] = ["full", "core", "minimum"];
  let lastError: unknown = null;

  for (const mode of modes) {
    try {
      const rows = await queryGeneratedDailyRows(mode, futureDateKey);
      if (mode !== "full") {
        console.warn(`[verification-generated-source] using ${mode} compatibility projection`);
      }
      return rows.filter(formalGeneratedStatus);
    } catch (error) {
      lastError = error;
      console.warn(
        `[verification-generated-source] ${mode} projection failed`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // Production databases created before this optional source table was migrated
  // can self-heal without waiting for a manual database operation. The bootstrap
  // is additive only (CREATE/ADD COLUMN/CREATE INDEX IF NOT EXISTS).
  const repaired = await ensureGeneratedForecastSourceSchema();
  if (repaired.ready) {
    for (const mode of modes) {
      try {
        const rows = await queryGeneratedDailyRows(mode, futureDateKey);
        console.warn(`[verification-generated-source] recovered after additive schema bootstrap via ${mode} projection`);
        return rows.filter(formalGeneratedStatus);
      } catch (error) {
        lastError = error;
      }
    }
  } else if (repaired.error) {
    lastError = new Error(repaired.error);
  }

  throw new Error(
    `GeneratedDailyForecast source unavailable after compatibility fallbacks: ${
      lastError instanceof Error ? lastError.message : String(lastError ?? "unknown")
    }`
  );
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

  const schema = await ensureGeneratedForecastSourceSchema();
  if (!schema.ready) {
    report.errors.push(`generated-schema:${schema.error ?? "unavailable"}`);
    return report;
  }

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
    const version = Math.max(1, Number(row.version) || 1);
    const identity = generatedVerificationIdentity({
      forecastDate: row.forecastDate,
      symbol: asset.symbol,
      version,
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
      report.errors.push(
        `${row.marketCode}:${row.forecastDate}:v${version}:${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return report;
}
