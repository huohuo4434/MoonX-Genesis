import "server-only";

import { hasPrisma, prisma } from "@/lib/prisma";
import { calculateWaveWeight } from "@/lib/wave/scoring";
import {
  listWaveAnalystsWithPredictionsJson,
  listWavePredictionsJson,
  seedWaveJsonDefaults,
  upsertWaveAnalystJson,
  upsertWavePredictionJson,
  validateWavePredictionJson,
  type WaveDirection,
  type WaveValidationStatus,
} from "@/lib/wave/store";

export type WaveUpsertInput = {
  analystSlug: string;
  analystName: string;
  source?: string;
  marketCode: string;
  marketName: string;
  timeframe: string;
  publishedAt: string;
  validUntil?: string | null;
  direction: WaveDirection;
  summary: string;
  waveLabel?: string | null;
  supportLevels: number[];
  resistanceLevels: number[];
  targetLevels: number[];
  invalidationLevel?: number | null;
  confirmationLevel?: number | null;
  expectedPath?: string[];
  sourceImageUrl?: string | null;
  rawText?: string | null;
};

function serializePrediction(row: {
  id: string;
  analystId: string;
  marketCode: string;
  marketName: string;
  timeframe: string;
  publishedAt: Date | string;
  validUntil: Date | string | null;
  direction: string;
  summary: string;
  waveLabel: string | null;
  supportLevels: unknown;
  resistanceLevels: unknown;
  targetLevels: unknown;
  invalidationLevel: number | null;
  confirmationLevel: number | null;
  expectedPath: unknown;
  sourceImageUrl: string | null;
  sourceMessageId?: string | null;
  rawText: string | null;
  status: string;
  entryReference?: number | null;
  maxFavorableMove?: number | null;
  maxAdverseMove?: number | null;
  realizedReturn?: number | null;
  rewardRisk: number | null;
  validatedAt: Date | string | null;
  validationNote: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  analyst?: {
    id: string;
    slug: string;
    name: string;
    source: string | null;
    active: boolean;
    baseWeight: number;
    maxWeight: number;
  };
}) {
  return {
    ...row,
    publishedAt:
      row.publishedAt instanceof Date ? row.publishedAt.toISOString() : row.publishedAt,
    validUntil:
      row.validUntil instanceof Date
        ? row.validUntil.toISOString()
        : row.validUntil,
    validatedAt:
      row.validatedAt instanceof Date
        ? row.validatedAt.toISOString()
        : row.validatedAt,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

export async function getLatestWavePredictions(limit = 20) {
  if (hasPrisma() && prisma) {
    try {
      const rows = await prisma.wavePrediction.findMany({
        where: { analyst: { active: true } },
        include: { analyst: true },
        orderBy: { publishedAt: "desc" },
        take: Math.min(Math.max(limit, 1), 100),
      });
      return rows.map(serializePrediction);
    } catch {
      /* fall through to JSON */
    }
  }
  return listWavePredictionsJson(limit);
}

export async function getWaveRanking() {
  type AnalystBundle = {
    slug: string;
    name: string;
    baseWeight: number;
    maxWeight: number;
    predictions: Array<{
      status: string;
      rewardRisk: number | null;
      publishedAt: Date | string;
    }>;
  };

  let analysts: AnalystBundle[] = [];

  if (hasPrisma() && prisma) {
    try {
      analysts = await prisma.waveAnalyst.findMany({
        where: { active: true },
        include: { predictions: { orderBy: { publishedAt: "desc" } } },
      });
    } catch {
      analysts = [];
    }
  }

  if (!analysts.length) {
    analysts = await listWaveAnalystsWithPredictionsJson();
  }

  const now = Date.now();
  return analysts
    .map((analyst) => {
      const validated = analyst.predictions.filter((x) => x.status !== "PENDING");
      const recent = validated.slice(0, 30);
      const wins = validated.filter((x) => x.status === "HIT").length;
      const partials = validated.filter((x) => x.status === "PARTIAL").length;
      const recentWins = recent.filter((x) => x.status === "HIT").length;
      const recentPartials = recent.filter((x) => x.status === "PARTIAL").length;
      const rr = validated
        .map((x) => x.rewardRisk)
        .filter((x): x is number => typeof x === "number");
      const averageRewardRisk = rr.length ? rr.reduce((a, b) => a + b, 0) / rr.length : 1;
      const last = analyst.predictions[0]?.publishedAt;
      const lastMs = last ? new Date(last).getTime() : NaN;
      const days = Number.isFinite(lastMs) ? Math.floor((now - lastMs) / 86400000) : 999;
      const weight = calculateWaveWeight({
        total: validated.length,
        wins,
        partials,
        recentWins,
        recentPartials,
        recentTotal: recent.length,
        averageRewardRisk,
        daysSinceLastPrediction: days,
        baseWeight: analyst.baseWeight,
        maxWeight: analyst.maxWeight,
      });
      return {
        slug: analyst.slug,
        name: analyst.name,
        validatedCount: validated.length,
        hitRate: validated.length
          ? Number((((wins + partials * 0.5) / validated.length) * 100).toFixed(1))
          : null,
        weight,
        weightPercent: Number((weight * 100).toFixed(1)),
        lastPredictionAt: last ? new Date(last).toISOString() : null,
      };
    })
    .sort((a, b) => b.weight - a.weight);
}

export async function upsertWavePrediction(input: WaveUpsertInput) {
  if (hasPrisma() && prisma) {
    try {
      const analyst = await prisma.waveAnalyst.upsert({
        where: { slug: input.analystSlug },
        update: { name: input.analystName, source: input.source, active: true },
        create: {
          slug: input.analystSlug,
          name: input.analystName,
          source: input.source,
          baseWeight: 0.05,
          maxWeight: 0.22,
        },
      });
      const data = await prisma.wavePrediction.upsert({
        where: {
          analystId_marketCode_publishedAt: {
            analystId: analyst.id,
            marketCode: input.marketCode,
            publishedAt: new Date(input.publishedAt),
          },
        },
        update: {
          marketName: input.marketName,
          timeframe: input.timeframe,
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          direction: input.direction,
          summary: input.summary,
          waveLabel: input.waveLabel ?? null,
          supportLevels: input.supportLevels,
          resistanceLevels: input.resistanceLevels,
          targetLevels: input.targetLevels,
          invalidationLevel: input.invalidationLevel ?? null,
          confirmationLevel: input.confirmationLevel ?? null,
          expectedPath: input.expectedPath ?? [],
          sourceImageUrl: input.sourceImageUrl ?? null,
          rawText: input.rawText ?? null,
        },
        create: {
          analystId: analyst.id,
          marketCode: input.marketCode,
          marketName: input.marketName,
          timeframe: input.timeframe,
          publishedAt: new Date(input.publishedAt),
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          direction: input.direction,
          summary: input.summary,
          waveLabel: input.waveLabel ?? null,
          supportLevels: input.supportLevels,
          resistanceLevels: input.resistanceLevels,
          targetLevels: input.targetLevels,
          invalidationLevel: input.invalidationLevel ?? null,
          confirmationLevel: input.confirmationLevel ?? null,
          expectedPath: input.expectedPath ?? [],
          sourceImageUrl: input.sourceImageUrl ?? null,
          rawText: input.rawText ?? null,
        },
      });
      return serializePrediction({ ...data, analyst });
    } catch {
      /* fall through */
    }
  }

  const analyst = await upsertWaveAnalystJson({
    slug: input.analystSlug,
    name: input.analystName,
    source: input.source,
  });
  const data = await upsertWavePredictionJson({
    analystId: analyst.id,
    marketCode: input.marketCode,
    marketName: input.marketName,
    timeframe: input.timeframe,
    publishedAt: new Date(input.publishedAt).toISOString(),
    validUntil: input.validUntil ? new Date(input.validUntil).toISOString() : null,
    direction: input.direction,
    summary: input.summary,
    waveLabel: input.waveLabel,
    supportLevels: input.supportLevels,
    resistanceLevels: input.resistanceLevels,
    targetLevels: input.targetLevels,
    invalidationLevel: input.invalidationLevel,
    confirmationLevel: input.confirmationLevel,
    expectedPath: input.expectedPath,
    sourceImageUrl: input.sourceImageUrl,
    rawText: input.rawText,
  });
  return { ...data, analyst };
}

export async function validateWavePrediction(input: {
  predictionId: string;
  status: WaveValidationStatus;
  rewardRisk?: number | null;
  validationNote?: string | null;
}) {
  if (hasPrisma() && prisma) {
    try {
      const data = await prisma.wavePrediction.update({
        where: { id: input.predictionId },
        data: {
          status: input.status,
          rewardRisk: input.rewardRisk ?? undefined,
          validationNote: input.validationNote ?? undefined,
          validatedAt: new Date(),
        },
        include: { analyst: true },
      });
      return serializePrediction(data);
    } catch {
      /* fall through */
    }
  }
  const data = await validateWavePredictionJson(input);
  if (!data) return null;
  return data;
}

export async function seedWaveData() {
  let prismaSeeded = false;
  if (hasPrisma() && prisma) {
    try {
      const { WaveDirection } = await import("@prisma/client");
      const analyst = await prisma.waveAnalyst.upsert({
        where: { slug: "wave-theory-academy" },
        update: { name: "波浪理论学习", source: "Imported analyst screenshots" },
        create: {
          slug: "wave-theory-academy",
          name: "波浪理论学习",
          source: "Imported analyst screenshots",
          baseWeight: 0.05,
          maxWeight: 0.22,
        },
      });
      const rows = [
        {
          marketCode: "XAUUSD",
          marketName: "黄金",
          timeframe: "1D",
          publishedAt: new Date("2026-07-28T00:00:00+08:00"),
          direction: WaveDirection.UP_AFTER_PULLBACK,
          summary:
            "三角形整理接近尾声，若再形成一个低点并完成第五段 abc，随后可能展开较大反弹。",
          waveLabel: "Triangle / b-wave",
          supportLevels: [3864, 3538],
          resistanceLevels: [4301],
          targetLevels: [],
          expectedPath: ["再形成一个低点", "完成第五段abc", "展开较大反弹"],
          rawText: "从蓝点开始接近三角形，可能是b子浪。",
        },
        {
          marketCode: "000660.KS",
          marketName: "SK海力士",
          timeframe: "1D",
          publishedAt: new Date("2026-07-28T00:00:00+08:00"),
          direction: WaveDirection.REBOUND,
          summary:
            "红色五浪可能结束，目前处于回撤；1,649,000 已到达，1,494,000 附近为可能反弹区域。",
          waveLabel: "Five-wave completion",
          supportLevels: [1649000, 1494000],
          resistanceLevels: [],
          targetLevels: [],
          expectedPath: ["继续回撤", "观察1494000", "可能反弹"],
          rawText: "1649000已经到达，观察1494000附近。",
        },
        {
          marketCode: "SNDK",
          marketName: "闪迪",
          timeframe: "1D",
          publishedAt: new Date("2026-07-28T00:00:00+08:00"),
          validUntil: new Date("2026-08-06T23:59:59+08:00"),
          direction: WaveDirection.REBOUND,
          summary: "预计在 8月6日前于 1,177 美元附近见底并开始反弹。",
          waveLabel: "Wave V bottom",
          supportLevels: [1177],
          resistanceLevels: [2456],
          targetLevels: [],
          expectedPath: ["下探1177附近", "形成底部", "开始反弹"],
          rawText: "1177左右见底开始反弹。",
        },
        {
          marketCode: "CL",
          marketName: "WTI轻质原油",
          timeframe: "1H",
          publishedAt: new Date("2026-07-27T00:00:00+08:00"),
          direction: WaveDirection.UP_AFTER_PULLBACK,
          summary:
            "跌破 88.48 美元表示上涨段结束，观察 83.39、80.27、77.15 三个回撤区域；完成回撤后仍可能再次上涨。",
          waveLabel: "Impulse completion",
          supportLevels: [83.39, 80.27, 77.15],
          resistanceLevels: [88.48, 92.07, 98.3],
          targetLevels: [],
          confirmationLevel: 88.48,
          expectedPath: ["跌破88.48", "回撤三个支撑区", "回撤后再涨"],
          rawText: "回撤三个位置83.39/80.27/77.15。",
        },
      ] as const;

      for (const row of rows) {
        await prisma.wavePrediction.upsert({
          where: {
            analystId_marketCode_publishedAt: {
              analystId: analyst.id,
              marketCode: row.marketCode,
              publishedAt: row.publishedAt,
            },
          },
          update: row,
          create: { analystId: analyst.id, ...row },
        });
      }
      prismaSeeded = true;
    } catch {
      prismaSeeded = false;
    }
  }

  const json = await seedWaveJsonDefaults();
  return { prismaSeeded, json };
}
