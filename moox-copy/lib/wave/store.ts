/**
 * Wave analyst JSON store — used when DATABASE_URL / Prisma is unavailable.
 * Path: moonx-data/wave/store.json
 */
import "server-only";

import { createHash, randomBytes } from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  WAVE_BASE_WEIGHT,
  WAVE_MAX_WEIGHT,
} from "@/lib/wave/scoring";

export type WaveDirection =
  | "UP"
  | "DOWN"
  | "SIDEWAYS"
  | "UP_AFTER_PULLBACK"
  | "DOWN_AFTER_REBOUND"
  | "REBOUND"
  | "PULLBACK";

export type WaveValidationStatus = "PENDING" | "HIT" | "PARTIAL" | "FAILED" | "EXPIRED";

export type WaveAnalystRecord = {
  id: string;
  slug: string;
  name: string;
  source: string | null;
  active: boolean;
  baseWeight: number;
  maxWeight: number;
  createdAt: string;
  updatedAt: string;
};

export type WavePredictionRecord = {
  id: string;
  analystId: string;
  marketCode: string;
  marketName: string;
  timeframe: string;
  publishedAt: string;
  validUntil: string | null;
  direction: WaveDirection;
  summary: string;
  waveLabel: string | null;
  supportLevels: number[];
  resistanceLevels: number[];
  targetLevels: number[];
  invalidationLevel: number | null;
  confirmationLevel: number | null;
  expectedPath: string[];
  sourceImageUrl: string | null;
  sourceMessageId: string | null;
  rawText: string | null;
  status: WaveValidationStatus;
  entryReference: number | null;
  maxFavorableMove: number | null;
  maxAdverseMove: number | null;
  realizedReturn: number | null;
  rewardRisk: number | null;
  validatedAt: string | null;
  validationNote: string | null;
  createdAt: string;
  updatedAt: string;
};

type WaveJsonStore = {
  version: 1;
  updatedAt: string;
  analysts: WaveAnalystRecord[];
  predictions: WavePredictionRecord[];
};

const BUCKET = "moonx-data";
const FILE = "wave/store.json";
const LOCAL_FILE = resolve(process.cwd(), "data", "wave-store.json");

function cuidLike(): string {
  return `w_${Date.now().toString(36)}_${randomBytes(6).toString("hex")}`;
}

function emptyStore(): WaveJsonStore {
  return { version: 1, updatedAt: new Date().toISOString(), analysts: [], predictions: [] };
}

function readLocalStore(): WaveJsonStore | null {
  try {
    if (!existsSync(LOCAL_FILE)) return null;
    const parsed = JSON.parse(readFileSync(LOCAL_FILE, "utf8")) as WaveJsonStore;
    if (!parsed?.analysts || !parsed?.predictions) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalStore(store: WaveJsonStore): void {
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  writeFileSync(LOCAL_FILE, JSON.stringify(store, null, 2), "utf8");
}

async function readStore(): Promise<WaveJsonStore> {
  try {
    const admin = getAdminClient();
    if (admin) {
      const { data, error } = await admin.storage.from(BUCKET).download(FILE);
      if (!error && data) {
        const text = await data.text();
        const parsed = JSON.parse(text) as WaveJsonStore;
        if (parsed?.analysts && parsed?.predictions) return parsed;
      }
    }
  } catch {
    /* fall through */
  }
  return readLocalStore() ?? emptyStore();
}

async function writeStore(store: WaveJsonStore): Promise<void> {
  const body: WaveJsonStore = { ...store, updatedAt: new Date().toISOString() };
  writeLocalStore(body);
  const admin = getAdminClient();
  if (!admin) return;
  const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
  const { error } = await admin.storage.from(BUCKET).upload(FILE, blob, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) {
    console.warn("[wave-store] supabase upload failed:", error.message);
  }
}

export async function listWaveAnalystsJson(): Promise<WaveAnalystRecord[]> {
  return (await readStore()).analysts.filter((a) => a.active);
}

export async function listWavePredictionsJson(limit = 20): Promise<
  Array<WavePredictionRecord & { analyst: WaveAnalystRecord }>
> {
  const store = await readStore();
  const byId = new Map(store.analysts.map((a) => [a.id, a]));
  return store.predictions
    .filter((p) => {
      const a = byId.get(p.analystId);
      return a?.active;
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, Math.min(Math.max(limit, 1), 100))
    .map((p) => ({ ...p, analyst: byId.get(p.analystId)! }));
}

export async function listWaveAnalystsWithPredictionsJson(): Promise<
  Array<WaveAnalystRecord & { predictions: WavePredictionRecord[] }>
> {
  const store = await readStore();
  return store.analysts
    .filter((a) => a.active)
    .map((a) => ({
      ...a,
      predictions: store.predictions
        .filter((p) => p.analystId === a.id)
        .sort((x, y) => y.publishedAt.localeCompare(x.publishedAt)),
    }));
}

export async function upsertWaveAnalystJson(input: {
  slug: string;
  name: string;
  source?: string | null;
}): Promise<WaveAnalystRecord> {
  const store = await readStore();
  const now = new Date().toISOString();
  const existing = store.analysts.find((a) => a.slug === input.slug);
  if (existing) {
    existing.name = input.name;
    existing.source = input.source ?? existing.source;
    existing.active = true;
    existing.updatedAt = now;
    await writeStore(store);
    return existing;
  }
  const created: WaveAnalystRecord = {
    id: cuidLike(),
    slug: input.slug,
    name: input.name,
    source: input.source ?? null,
    active: true,
    baseWeight: WAVE_BASE_WEIGHT,
    maxWeight: WAVE_MAX_WEIGHT,
    createdAt: now,
    updatedAt: now,
  };
  store.analysts.push(created);
  await writeStore(store);
  return created;
}

export async function upsertWavePredictionJson(input: {
  analystId: string;
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
}): Promise<WavePredictionRecord> {
  const store = await readStore();
  const now = new Date().toISOString();
  const existing = store.predictions.find(
    (p) =>
      p.analystId === input.analystId &&
      p.marketCode === input.marketCode &&
      p.publishedAt === input.publishedAt
  );
  const patch = {
    marketName: input.marketName,
    timeframe: input.timeframe,
    validUntil: input.validUntil ?? null,
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
    updatedAt: now,
  };
  if (existing) {
    Object.assign(existing, patch);
    await writeStore(store);
    return existing;
  }
  const created: WavePredictionRecord = {
    id: cuidLike(),
    analystId: input.analystId,
    marketCode: input.marketCode,
    publishedAt: input.publishedAt,
    sourceMessageId: null,
    status: "PENDING",
    entryReference: null,
    maxFavorableMove: null,
    maxAdverseMove: null,
    realizedReturn: null,
    rewardRisk: null,
    validatedAt: null,
    validationNote: null,
    createdAt: now,
    ...patch,
  };
  store.predictions.push(created);
  await writeStore(store);
  return created;
}

export async function validateWavePredictionJson(input: {
  predictionId: string;
  status: WaveValidationStatus;
  rewardRisk?: number | null;
  validationNote?: string | null;
}): Promise<WavePredictionRecord | null> {
  const store = await readStore();
  const row = store.predictions.find((p) => p.id === input.predictionId);
  if (!row) return null;
  row.status = input.status;
  row.rewardRisk = input.rewardRisk ?? row.rewardRisk;
  row.validationNote = input.validationNote ?? row.validationNote;
  row.validatedAt = new Date().toISOString();
  row.updatedAt = row.validatedAt;
  await writeStore(store);
  return row;
}

/** Deterministic seed ids so re-runs upsert cleanly. */
function seedId(key: string): string {
  return `wseed_${createHash("sha1").update(key).digest("hex").slice(0, 16)}`;
}

export async function seedWaveJsonDefaults(): Promise<{ analysts: number; predictions: number }> {
  const store = await readStore();
  const now = new Date().toISOString();
  const analystId = seedId("analyst:wave-theory-academy");
  let analyst = store.analysts.find((a) => a.slug === "wave-theory-academy");
  if (!analyst) {
    analyst = {
      id: analystId,
      slug: "wave-theory-academy",
      name: "波浪理论学习",
      source: "Imported analyst screenshots",
      active: true,
      baseWeight: WAVE_BASE_WEIGHT,
      maxWeight: WAVE_MAX_WEIGHT,
      createdAt: now,
      updatedAt: now,
    };
    store.analysts.push(analyst);
  } else {
    analyst.name = "波浪理论学习";
    analyst.source = "Imported analyst screenshots";
    analyst.active = true;
    analyst.baseWeight = WAVE_BASE_WEIGHT;
    analyst.maxWeight = WAVE_MAX_WEIGHT;
    analyst.updatedAt = now;
  }

  const rows: Array<Omit<WavePredictionRecord, "id" | "createdAt" | "updatedAt" | "analystId">> = [
    {
      marketCode: "XAUUSD",
      marketName: "黄金",
      timeframe: "1D",
      publishedAt: new Date("2026-07-28T00:00:00+08:00").toISOString(),
      validUntil: null,
      direction: "UP_AFTER_PULLBACK",
      summary:
        "三角形整理接近尾声，若再形成一个低点并完成第五段 abc，随后可能展开较大反弹。",
      waveLabel: "Triangle / b-wave",
      supportLevels: [3864, 3538],
      resistanceLevels: [4301],
      targetLevels: [],
      invalidationLevel: null,
      confirmationLevel: null,
      expectedPath: ["再形成一个低点", "完成第五段abc", "展开较大反弹"],
      sourceImageUrl: null,
      sourceMessageId: null,
      rawText: "从蓝点开始接近三角形，可能是b子浪。",
      status: "PENDING",
      entryReference: null,
      maxFavorableMove: null,
      maxAdverseMove: null,
      realizedReturn: null,
      rewardRisk: null,
      validatedAt: null,
      validationNote: null,
    },
    {
      marketCode: "000660.KS",
      marketName: "SK海力士",
      timeframe: "1D",
      publishedAt: new Date("2026-07-28T00:00:00+08:00").toISOString(),
      validUntil: null,
      direction: "REBOUND",
      summary:
        "红色五浪可能结束，目前处于回撤；1,649,000 已到达，1,494,000 附近为可能反弹区域。",
      waveLabel: "Five-wave completion",
      supportLevels: [1649000, 1494000],
      resistanceLevels: [],
      targetLevels: [],
      invalidationLevel: null,
      confirmationLevel: null,
      expectedPath: ["继续回撤", "观察1494000", "可能反弹"],
      sourceImageUrl: null,
      sourceMessageId: null,
      rawText: "1649000已经到达，观察1494000附近。",
      status: "PENDING",
      entryReference: null,
      maxFavorableMove: null,
      maxAdverseMove: null,
      realizedReturn: null,
      rewardRisk: null,
      validatedAt: null,
      validationNote: null,
    },
    {
      marketCode: "SNDK",
      marketName: "闪迪",
      timeframe: "1D",
      publishedAt: new Date("2026-07-28T00:00:00+08:00").toISOString(),
      validUntil: new Date("2026-08-06T23:59:59+08:00").toISOString(),
      direction: "REBOUND",
      summary: "预计在 8月6日前于 1,177 美元附近见底并开始反弹。",
      waveLabel: "Wave V bottom",
      supportLevels: [1177],
      resistanceLevels: [2456],
      targetLevels: [],
      invalidationLevel: null,
      confirmationLevel: null,
      expectedPath: ["下探1177附近", "形成底部", "开始反弹"],
      sourceImageUrl: null,
      sourceMessageId: null,
      rawText: "1177左右见底开始反弹。",
      status: "PENDING",
      entryReference: null,
      maxFavorableMove: null,
      maxAdverseMove: null,
      realizedReturn: null,
      rewardRisk: null,
      validatedAt: null,
      validationNote: null,
    },
    {
      marketCode: "CL",
      marketName: "WTI轻质原油",
      timeframe: "1H",
      publishedAt: new Date("2026-07-27T00:00:00+08:00").toISOString(),
      validUntil: null,
      direction: "UP_AFTER_PULLBACK",
      summary:
        "跌破 88.48 美元表示上涨段结束，观察 83.39、80.27、77.15 三个回撤区域；完成回撤后仍可能再次上涨。",
      waveLabel: "Impulse completion",
      supportLevels: [83.39, 80.27, 77.15],
      resistanceLevels: [88.48, 92.07, 98.3],
      targetLevels: [],
      invalidationLevel: null,
      confirmationLevel: 88.48,
      expectedPath: ["跌破88.48", "回撤三个支撑区", "回撤后再涨"],
      sourceImageUrl: null,
      sourceMessageId: null,
      rawText: "回撤三个位置83.39/80.27/77.15。",
      status: "PENDING",
      entryReference: null,
      maxFavorableMove: null,
      maxAdverseMove: null,
      realizedReturn: null,
      rewardRisk: null,
      validatedAt: null,
      validationNote: null,
    },
  ];

  for (const row of rows) {
    const id = seedId(`${analyst.id}:${row.marketCode}:${row.publishedAt}`);
    const existing = store.predictions.find(
      (p) =>
        p.analystId === analyst.id &&
        p.marketCode === row.marketCode &&
        p.publishedAt === row.publishedAt
    );
    if (existing) {
      Object.assign(existing, row, { updatedAt: now });
    } else {
      store.predictions.push({
        id,
        analystId: analyst.id,
        createdAt: now,
        updatedAt: now,
        ...row,
      });
    }
  }

  await writeStore(store);
  return { analysts: 1, predictions: 4 };
}
