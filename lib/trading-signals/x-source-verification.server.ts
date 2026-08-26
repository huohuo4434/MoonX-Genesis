import "server-only";

import { createHash } from "crypto";
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import { listDailyVerificationResultsStrict } from "@/lib/data/moonx-data-store";
import { prisma } from "@/lib/prisma";
import { resolveMultiViewTargetDates, type MultiViewHorizon } from "@/lib/research/member-multi-view-core";
import { xSourceFamilyForHandle } from "@/lib/trading-signals/x-source-registry.server";
import {
  buildXSourceVerificationStats,
  canonicalXSourceActualSymbol,
  isXSourceVerifiableSymbol,
  scoreXSourceDirection,
  selectXVerificationDate,
  verificationHorizon,
  X_SOURCE_SCORE_VERSION,
  xSourceVerificationKey,
  type XSourceVerificationHorizon,
  type XSourceVerificationSample,
  type XSourceVerificationStats,
} from "@/lib/trading-signals/x-source-verification-core";
import type { ExternalAnalystParsedPost } from "@/types/external-analyst";
import type { XOpinionDirection } from "@/types/x-opinion-matrix";

type VerificationRow = {
  id: string;
  username: string;
  post_id: string;
  symbol: string;
  horizon: string;
  forecast_date: Date | string;
  locked_direction: string;
  locked_confidence: number;
  locked_at: Date | string;
  posted_at: Date | string;
  status: string;
  actual_direction: string | null;
  actual_return_pct: number | null;
  score: number | null;
  score_version: string;
  verified_at: Date | string | null;
};

let statsCache: { expiresAt: number; value: Promise<XSourceVerificationStats[]> } | null = null;

function invalidateStatsCache(): void {
  statsCache = null;
}

function iso(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function rowDate(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function rowToSample(row: VerificationRow): XSourceVerificationSample | null {
  const horizon = verificationHorizon(row.horizon);
  const lockedDirection = row.locked_direction === "LONG" || row.locked_direction === "SHORT" ? row.locked_direction : null;
  const status = ["PENDING", "HIT", "PARTIAL", "MISS", "VOID"].includes(row.status)
    ? row.status as XSourceVerificationSample["status"]
    : null;
  const lockedAt = iso(row.locked_at);
  const postedAt = iso(row.posted_at);
  if (!lockedDirection || !status || !lockedAt || !postedAt) return null;
  const actualDirection = row.actual_direction === "UP" || row.actual_direction === "DOWN" || row.actual_direction === "FLAT"
    ? row.actual_direction
    : null;
  return {
    id: row.id,
    username: row.username,
    postId: row.post_id,
    symbol: row.symbol,
    horizon,
    forecastDate: rowDate(row.forecast_date),
    lockedDirection,
    lockedConfidence: Number(row.locked_confidence) || 0,
    lockedAt,
    postedAt,
    status,
    actualDirection,
    actualReturnPct: row.actual_return_pct == null ? null : Number(row.actual_return_pct),
    score: row.score == null ? null : Number(row.score),
    scoreVersion: row.score_version || X_SOURCE_SCORE_VERSION,
    verifiedAt: iso(row.verified_at),
  };
}

function evidenceHash(input: {
  username: string;
  postId: string;
  symbol: string;
  postedAt: string;
  direction: string;
  horizon: string;
  forecastDate: string;
  summary: string;
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function multiViewHorizon(horizon: XSourceVerificationHorizon): MultiViewHorizon {
  return horizon;
}

export type XSourceVerificationLockInput = {
  username: string;
  postId: string;
  symbol: string;
  parsed: ExternalAnalystParsedPost;
  postedAt: string;
};

export type XSourceVerificationLockResult = {
  created: boolean;
  reason: string;
  forecastDate: string | null;
};

/**
 * Locks multiple samples in one database round-trip. The lock timestamp is
 * always captured inside this operation; historical approval timestamps are
 * deliberately not accepted as input.
 */
export async function lockXSourceVerificationSamples(inputs: readonly XSourceVerificationLockInput[]): Promise<{
  results: XSourceVerificationLockResult[];
  created: number;
  errors: string[];
}> {
  const db = prisma;
  if (!db) {
    const results = inputs.map(() => ({ created: false, reason: "DATABASE_UNAVAILABLE", forecastDate: null }));
    return { results, created: 0, errors: inputs.length ? ["DATABASE_UNAVAILABLE"] : [] };
  }
  const lockedAt = new Date().toISOString();
  const lockedDate = getBeijingTodayKey(new Date(lockedAt));
  const prepared: Array<{
    index: number;
    id: string;
    username: string;
    postId: string;
    symbol: string;
    sourceFamily: string;
    horizon: XSourceVerificationHorizon;
    forecastDate: string;
    direction: Exclude<XOpinionDirection, "NEUTRAL">;
    confidence: number;
    postedAt: string;
    hash: string;
  }> = [];
  const results: XSourceVerificationLockResult[] = inputs.map(() => ({ created: false, reason: "SKIPPED", forecastDate: null }));
  const seen = new Set<string>();
  for (const [index, input] of inputs.entries()) {
    const direction: XOpinionDirection = input.parsed.direction;
    if (direction !== "LONG" && direction !== "SHORT") {
      results[index] = { created: false, reason: "NON_DIRECTIONAL", forecastDate: null };
      continue;
    }
    const username = input.username.replace(/^@/, "").trim().toLowerCase();
    const symbol = input.symbol.trim().toUpperCase();
    if (!isXSourceVerifiableSymbol(symbol)) {
      results[index] = { created: false, reason: "NO_CANONICAL_ACTUAL_SOURCE", forecastDate: null };
      continue;
    }
    const horizon = verificationHorizon(input.parsed.horizon);
    const targetDates = resolveMultiViewTargetDates({
      postedAt: input.parsed.postedAt || input.postedAt,
      horizon: multiViewHorizon(horizon),
      timeWindows: input.parsed.timeWindows,
      summary: input.parsed.summary || input.parsed.text,
    });
    const forecastDate = selectXVerificationDate({ targetDates, horizon, lockedDate });
    if (!forecastDate || forecastDate <= lockedDate) {
      results[index] = { created: false, reason: "NO_FUTURE_EXACT_WINDOW", forecastDate: null };
      continue;
    }
    const sampleKey = `${username}|${input.postId}|${symbol}`;
    if (seen.has(sampleKey)) {
      results[index] = { created: false, reason: "DUPLICATE_INPUT", forecastDate };
      continue;
    }
    seen.add(sampleKey);
    const hash = evidenceHash({
      username,
      postId: input.postId,
      symbol,
      postedAt: input.postedAt,
      direction,
      horizon,
      forecastDate,
      summary: input.parsed.summary || input.parsed.text || "",
    });
    prepared.push({
      index,
      id: `XSV-${hash.slice(0, 32)}`,
      username,
      postId: input.postId,
      symbol,
      sourceFamily: xSourceFamilyForHandle(username),
      horizon,
      forecastDate,
      direction,
      confidence: Math.max(0, Math.min(100, Math.round(Number(input.parsed.confidence) || 0))),
      postedAt: input.postedAt,
      hash,
    });
    results[index] = { created: false, reason: "EXISTING", forecastDate };
  }
  if (!prepared.length) return { results, created: 0, errors: [] };
  try {
    const inserted = await db.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO trade_external_analyst_verifications(
         id, username, post_id, symbol, source_family, horizon, forecast_date,
         locked_direction, locked_confidence, locked_at, posted_at, evidence_hash,
         status, score_version, created_at, updated_at
       )
       SELECT x.id, x.username, x.post_id, x.symbol, x.source_family, x.horizon,
              x.forecast_date::date, x.locked_direction, x.locked_confidence,
              $2::timestamptz, x.posted_at::timestamptz, x.evidence_hash,
              'PENDING', $3, NOW(), NOW()
       FROM jsonb_to_recordset($1::jsonb) AS x(
         id text, username text, post_id text, symbol text, source_family text,
         horizon text, forecast_date text, locked_direction text,
         locked_confidence integer, posted_at text, evidence_hash text
       )
       ON CONFLICT (username, post_id, symbol) DO NOTHING
       RETURNING id`,
      JSON.stringify(prepared.map((row) => ({
        id: row.id,
        username: row.username,
        post_id: row.postId,
        symbol: row.symbol,
        source_family: row.sourceFamily,
        horizon: row.horizon,
        forecast_date: row.forecastDate,
        locked_direction: row.direction,
        locked_confidence: row.confidence,
        posted_at: row.postedAt,
        evidence_hash: row.hash,
      }))),
      lockedAt,
      X_SOURCE_SCORE_VERSION,
    );
    const createdIds = new Set(inserted.map((row) => row.id));
    for (const row of prepared) {
      if (createdIds.has(row.id)) results[row.index] = { created: true, reason: "LOCKED", forecastDate: row.forecastDate };
    }
    if (inserted.length > 0) invalidateStatsCache();
    return { results, created: inserted.length, errors: [] };
  } catch (error) {
    const message = `DB_ERROR:${error instanceof Error ? error.message : String(error)}`;
    for (const row of prepared) results[row.index] = { created: false, reason: message, forecastDate: row.forecastDate };
    return { results, created: 0, errors: [message] };
  }
}

export async function lockXSourceVerificationSample(input: XSourceVerificationLockInput): Promise<XSourceVerificationLockResult> {
  const batch = await lockXSourceVerificationSamples([input]);
  return batch.results[0] ?? { created: false, reason: batch.errors[0] ?? "SKIPPED", forecastDate: null };
}

export async function listXSourceVerificationSamples(): Promise<XSourceVerificationSample[]> {
  const db = prisma;
  if (!db) return [];
  try {
    const rows = await db.$queryRawUnsafe<VerificationRow[]>(`
      SELECT id, username, post_id, symbol, horizon, forecast_date, locked_direction,
             locked_confidence, locked_at, posted_at, status, actual_direction,
             actual_return_pct, score, score_version, verified_at
      FROM trade_external_analyst_verifications
      WHERE score_version = $1
      ORDER BY forecast_date DESC, locked_at DESC
    `, X_SOURCE_SCORE_VERSION);
    return rows.map(rowToSample).filter((row): row is XSourceVerificationSample => Boolean(row));
  } catch {
    return [];
  }
}

export async function getXSourceVerificationStats(): Promise<XSourceVerificationStats[]> {
  if (statsCache && statsCache.expiresAt > Date.now()) return statsCache.value;
  const value = listXSourceVerificationSamples().then(buildXSourceVerificationStats);
  statsCache = { expiresAt: Date.now() + 60_000, value };
  return value;
}

export async function getXSourceVerificationStatsMap(): Promise<Map<string, XSourceVerificationStats>> {
  const stats = await getXSourceVerificationStats();
  return new Map(stats.map((row) => [xSourceVerificationKey(row.username, row.symbol, row.horizon), row]));
}

export async function verifyPendingXSourceSamples(now = new Date()): Promise<{
  pending: number;
  verified: number;
  waitingActual: number;
  errors: string[];
}> {
  const db = prisma;
  if (!db) return { pending: 0, verified: 0, waitingActual: 0, errors: ["DATABASE_UNAVAILABLE"] };
  let actuals: Awaited<ReturnType<typeof listDailyVerificationResultsStrict>>["records"];
  try {
    actuals = (await listDailyVerificationResultsStrict()).records;
  } catch (error) {
    return { pending: 0, verified: 0, waitingActual: 0, errors: [`ACTUAL_READ_ERROR:${error instanceof Error ? error.message : String(error)}`] };
  }
  const actualByKey = new Map<string, (typeof actuals)[number]>();
  for (const row of actuals) {
    if (!(["UP", "DOWN", "FLAT"] as const).includes(row.actualDirection)) continue;
    if (["VOID", "UNVERIFIABLE", "MANUAL_REVIEW"].includes(row.verdict)) continue;
    const key = `${canonicalXSourceActualSymbol(row.symbol)}|${row.forecastDate}`;
    const current = actualByKey.get(key);
    if (!current || Date.parse(row.verifiedAt) > Date.parse(current.verifiedAt)) actualByKey.set(key, row);
  }
  const actualKeys = [...actualByKey.keys()].map((key) => {
    const [symbol, forecastDate] = key.split("|");
    return { symbol, forecast_date: forecastDate };
  });
  let pendingRows: VerificationRow[] = [];
  let waitingActual = 0;
  try {
    const [readyRows, waitingRows] = await Promise.all([
      db.$queryRawUnsafe<VerificationRow[]>(
      `SELECT verification.id, verification.username, verification.post_id, verification.symbol,
              verification.horizon, verification.forecast_date, verification.locked_direction,
              verification.locked_confidence, verification.locked_at, verification.posted_at,
              verification.status, verification.actual_direction, verification.actual_return_pct,
              verification.score, verification.score_version, verification.verified_at
       FROM trade_external_analyst_verifications AS verification
       JOIN jsonb_to_recordset($3::jsonb) AS actual_keys(symbol text, forecast_date text)
         ON verification.symbol = actual_keys.symbol
        AND verification.forecast_date = actual_keys.forecast_date::date
       WHERE verification.status = 'PENDING'
         AND verification.forecast_date <= $1::date
         AND verification.score_version = $2
       ORDER BY verification.forecast_date, verification.locked_at
       LIMIT 200`,
      getBeijingTodayKey(now),
      X_SOURCE_SCORE_VERSION,
      JSON.stringify(actualKeys),
      ),
      db.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(
        `SELECT COUNT(*) AS count
         FROM trade_external_analyst_verifications AS verification
         WHERE verification.status = 'PENDING'
           AND verification.forecast_date <= $1::date
           AND verification.score_version = $2
           AND NOT EXISTS (
             SELECT 1
             FROM jsonb_to_recordset($3::jsonb) AS actual_keys(symbol text, forecast_date text)
             WHERE verification.symbol = actual_keys.symbol
               AND verification.forecast_date = actual_keys.forecast_date::date
           )`,
        getBeijingTodayKey(now),
        X_SOURCE_SCORE_VERSION,
        JSON.stringify(actualKeys),
      ),
    ]);
    pendingRows = readyRows;
    waitingActual = Number(waitingRows[0]?.count ?? 0);
  } catch (error) {
    return { pending: 0, verified: 0, waitingActual: 0, errors: [error instanceof Error ? error.message : String(error)] };
  }
  let verified = 0;
  const errors: string[] = [];
  const updates: Array<{
    id: string;
    status: string;
    actualDirection: string;
    actualReturnPct: number;
    score: number;
    verifiedAt: string;
  }> = [];
  for (const raw of pendingRows) {
    const sample = rowToSample(raw);
    if (!sample) continue;
    const actual = actualByKey.get(`${canonicalXSourceActualSymbol(sample.symbol)}|${sample.forecastDate}`);
    if (!actual) {
      waitingActual += 1;
      continue;
    }
    const result = scoreXSourceDirection(sample.lockedDirection, actual.actualDirection);
    updates.push({
      id: sample.id,
      status: result.status,
      actualDirection: actual.actualDirection,
      actualReturnPct: actual.actualReturnPct,
      score: result.score,
      verifiedAt: actual.verifiedAt,
    });
  }
  if (updates.length) {
    try {
      const changed = await db.$queryRawUnsafe<Array<{ id: string }>>(
        `UPDATE trade_external_analyst_verifications AS target
         SET status = incoming.status,
             actual_direction = incoming.actual_direction,
             actual_return_pct = incoming.actual_return_pct,
             score = incoming.score,
             score_version = $2,
             verified_at = incoming.verified_at::timestamptz,
             updated_at = NOW()
         FROM jsonb_to_recordset($1::jsonb) AS incoming(
           id text, status text, actual_direction text,
           actual_return_pct double precision, score double precision, verified_at text
         )
         WHERE target.id = incoming.id AND target.status = 'PENDING'
         RETURNING target.id`,
        JSON.stringify(updates.map((row) => ({
          id: row.id,
          status: row.status,
          actual_direction: row.actualDirection,
          actual_return_pct: row.actualReturnPct,
          score: row.score,
          verified_at: row.verifiedAt,
        }))),
        X_SOURCE_SCORE_VERSION,
      );
      verified = changed.length;
    } catch (error) {
      errors.push(`BATCH_VERIFY_ERROR:${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (verified > 0) invalidateStatsCache();
  return { pending: pendingRows.length, verified, waitingActual, errors };
}
