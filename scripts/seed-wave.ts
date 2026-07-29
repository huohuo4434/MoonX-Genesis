/**
 * Seed wave analyst data: gold, SK Hynix, SanDisk, WTI.
 * Prefers Prisma when DATABASE_URL is set; also mirrors into moonx-data JSON when Supabase admin is configured.
 */
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";

loadProductionEnv();

if (
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production"
) {
  throw new Error("Production seed is disabled");
}

type Direction =
  | "UP"
  | "DOWN"
  | "SIDEWAYS"
  | "UP_AFTER_PULLBACK"
  | "DOWN_AFTER_REBOUND"
  | "REBOUND"
  | "PULLBACK";

const SEED_ROWS: Array<{
  marketCode: string;
  marketName: string;
  timeframe: string;
  publishedAt: Date;
  validUntil?: Date;
  direction: Direction;
  summary: string;
  waveLabel: string;
  supportLevels: number[];
  resistanceLevels: number[];
  targetLevels: number[];
  confirmationLevel?: number;
  expectedPath: string[];
  rawText: string;
}> = [
  {
    marketCode: "XAUUSD",
    marketName: "黄金",
    timeframe: "1D",
    publishedAt: new Date("2026-07-28T00:00:00+08:00"),
    direction: "UP_AFTER_PULLBACK",
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
    direction: "REBOUND",
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
    direction: "REBOUND",
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
    direction: "UP_AFTER_PULLBACK",
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
];

function seedId(key: string): string {
  return `wseed_${createHash("sha1").update(key).digest("hex").slice(0, 16)}`;
}

async function seedPrisma(): Promise<boolean> {
  if (!process.env.DATABASE_URL?.trim()) return false;
  const { PrismaClient, WaveDirection } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const analyst = await prisma.waveAnalyst.upsert({
      where: { slug: "wave-theory-academy" },
      update: { name: "波浪理论学习", source: "Imported analyst screenshots" },
      create: {
        slug: "wave-theory-academy",
        name: "波浪理论学习",
        source: "Imported analyst screenshots",
        baseWeight: 0.05,
        maxWeight: 0.2,
      },
    });
    for (const row of SEED_ROWS) {
      const direction = WaveDirection[row.direction];
      await prisma.wavePrediction.upsert({
        where: {
          analystId_marketCode_publishedAt: {
            analystId: analyst.id,
            marketCode: row.marketCode,
            publishedAt: row.publishedAt,
          },
        },
        update: {
          marketName: row.marketName,
          timeframe: row.timeframe,
          validUntil: row.validUntil ?? null,
          direction,
          summary: row.summary,
          waveLabel: row.waveLabel,
          supportLevels: row.supportLevels,
          resistanceLevels: row.resistanceLevels,
          targetLevels: row.targetLevels,
          confirmationLevel: row.confirmationLevel ?? null,
          expectedPath: row.expectedPath,
          rawText: row.rawText,
        },
        create: {
          analystId: analyst.id,
          marketCode: row.marketCode,
          marketName: row.marketName,
          timeframe: row.timeframe,
          publishedAt: row.publishedAt,
          validUntil: row.validUntil ?? null,
          direction,
          summary: row.summary,
          waveLabel: row.waveLabel,
          supportLevels: row.supportLevels,
          resistanceLevels: row.resistanceLevels,
          targetLevels: row.targetLevels,
          confirmationLevel: row.confirmationLevel ?? null,
          expectedPath: row.expectedPath,
          rawText: row.rawText,
        },
      });
    }
    return true;
  } finally {
    await prisma.$disconnect();
  }
}

async function seedJson(): Promise<boolean> {
  const url = normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  );
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  )?.trim();
  if (!url || !serviceKey || serviceKey === "[SENSITIVE]" || url.includes("[SENSITIVE]")) {
    return false;
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bucket = "moonx-data";
  const file = "wave/store.json";
  const now = new Date().toISOString();
  const analystId = seedId("analyst:wave-theory-academy");

  let existing: {
    version: 1;
    updatedAt: string;
    analysts: Array<Record<string, unknown>>;
    predictions: Array<Record<string, unknown>>;
  } = { version: 1, updatedAt: now, analysts: [], predictions: [] };

  const downloaded = await admin.storage.from(bucket).download(file);
  if (downloaded.data) {
    try {
      existing = JSON.parse(await downloaded.data.text());
    } catch {
      /* keep empty */
    }
  }

  const analysts = Array.isArray(existing.analysts) ? [...existing.analysts] : [];
  const predictions = Array.isArray(existing.predictions) ? [...existing.predictions] : [];
  const analystIdx = analysts.findIndex((a) => a.slug === "wave-theory-academy");
  const analyst = {
    id: analystId,
    slug: "wave-theory-academy",
    name: "波浪理论学习",
    source: "Imported analyst screenshots",
    active: true,
    baseWeight: 0.05,
    maxWeight: 0.2,
    createdAt: now,
    updatedAt: now,
  };
  if (analystIdx >= 0) analysts[analystIdx] = { ...analysts[analystIdx], ...analyst };
  else analysts.push(analyst);

  for (const row of SEED_ROWS) {
    const publishedAt = row.publishedAt.toISOString();
    const id = seedId(`${analystId}:${row.marketCode}:${publishedAt}`);
    const payload = {
      id,
      analystId,
      marketCode: row.marketCode,
      marketName: row.marketName,
      timeframe: row.timeframe,
      publishedAt,
      validUntil: row.validUntil ? row.validUntil.toISOString() : null,
      direction: row.direction,
      summary: row.summary,
      waveLabel: row.waveLabel,
      supportLevels: row.supportLevels,
      resistanceLevels: row.resistanceLevels,
      targetLevels: row.targetLevels,
      invalidationLevel: null,
      confirmationLevel: row.confirmationLevel ?? null,
      expectedPath: row.expectedPath,
      sourceImageUrl: null,
      sourceMessageId: null,
      rawText: row.rawText,
      status: "PENDING",
      entryReference: null,
      maxFavorableMove: null,
      maxAdverseMove: null,
      realizedReturn: null,
      rewardRisk: null,
      validatedAt: null,
      validationNote: null,
      createdAt: now,
      updatedAt: now,
    };
    const idx = predictions.findIndex(
      (p) =>
        p.analystId === analystId &&
        p.marketCode === row.marketCode &&
        p.publishedAt === publishedAt
    );
    if (idx >= 0) predictions[idx] = { ...predictions[idx], ...payload };
    else predictions.push(payload);
  }

  const body = JSON.stringify(
    { version: 1, updatedAt: now, analysts, predictions },
    null,
    2
  );
  const { error } = await admin.storage.from(bucket).upload(file, body, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) throw new Error(error.message);
  return true;
}

async function main() {
  let prismaSeeded = false;
  let jsonSeeded = false;
  try {
    prismaSeeded = await seedPrisma();
  } catch (err) {
    console.warn("[seed-wave] prisma:", err instanceof Error ? err.message : err);
  }
  try {
    jsonSeeded = await seedJson();
  } catch (err) {
    console.warn("[seed-wave] json:", err instanceof Error ? err.message : err);
  }

  if (!prismaSeeded && !jsonSeeded) {
    // Local fallback file so APIs can still be developed offline.
    const fs = await import("fs");
    const path = await import("path");
    const dir = path.resolve(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    const now = new Date().toISOString();
    const analystId = seedId("analyst:wave-theory-academy");
    const store = {
      version: 1 as const,
      updatedAt: now,
      analysts: [
        {
          id: analystId,
          slug: "wave-theory-academy",
          name: "波浪理论学习",
          source: "Imported analyst screenshots",
          active: true,
          baseWeight: 0.05,
          maxWeight: 0.2,
          createdAt: now,
          updatedAt: now,
        },
      ],
      predictions: SEED_ROWS.map((row) => {
        const publishedAt = row.publishedAt.toISOString();
        return {
          id: seedId(`${analystId}:${row.marketCode}:${publishedAt}`),
          analystId,
          marketCode: row.marketCode,
          marketName: row.marketName,
          timeframe: row.timeframe,
          publishedAt,
          validUntil: row.validUntil ? row.validUntil.toISOString() : null,
          direction: row.direction,
          summary: row.summary,
          waveLabel: row.waveLabel,
          supportLevels: row.supportLevels,
          resistanceLevels: row.resistanceLevels,
          targetLevels: row.targetLevels,
          invalidationLevel: null,
          confirmationLevel: row.confirmationLevel ?? null,
          expectedPath: row.expectedPath,
          sourceImageUrl: null,
          sourceMessageId: null,
          rawText: row.rawText,
          status: "PENDING",
          entryReference: null,
          maxFavorableMove: null,
          maxAdverseMove: null,
          realizedReturn: null,
          rewardRisk: null,
          validatedAt: null,
          validationNote: null,
          createdAt: now,
          updatedAt: now,
        };
      }),
    };
    fs.writeFileSync(path.join(dir, "wave-store.json"), JSON.stringify(store, null, 2));
    console.log(
      JSON.stringify({
        ok: true,
        prismaSeeded: false,
        jsonSeeded: false,
        localFile: "data/wave-store.json",
        message: "Seeded local file (no DATABASE_URL / Supabase admin available)",
      })
    );
    return;
  }

  console.log(
    JSON.stringify({
      ok: true,
      prismaSeeded,
      jsonSeeded,
      message: "Wave seed completed (gold / SK Hynix / SanDisk / WTI)",
    })
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
