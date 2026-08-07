// MOOX_EXTERNAL_ANALYST_V1
import "server-only";

import { prisma } from "@/lib/prisma";
import {
  analystSourceFromUsername,
  parseExternalAnalystPost,
} from "@/lib/trading-signals/external-analyst-parser";
import type {
  ExternalAnalystOverlay,
  ExternalAnalystParsedPost,
  ExternalAnalystRefreshReport,
  ExternalAnalystSource,
} from "@/types/external-analyst";
import { configuredXWatchHandles } from "@/lib/trading-signals/x-source-registry.server";
import type {
  ThreeHorizonDirection,
  ThreeHorizonStrategyType,
} from "@/types/three-horizon-strategy";

const ANALYSTS: Array<{ username: string; source: ExternalAnalystSource; label: string }> = [
  { username: "haliluya8911", source: "HALILUYA", label: "短线恐慌反弹观察" },
  { username: "BTCTW0", source: "BTCTW0", label: "彼得兔江恩波段点位" },
  { username: "btckik", source: "BTCKIK", label: "山寨币轮动与早期叙事观察" },
];

const SOURCE_LABELS: Record<ExternalAnalystSource, string> = {
  HALILUYA: "haliluya8911·短线反弹",
  BTCTW0: "彼得兔BTCTW0·江恩波段",
  BTCKIK: "btckik·山寨币轮动",
};

interface StoredRow {
  source: ExternalAnalystSource;
  username: string;
  post_id: string;
  post_url: string;
  posted_at: Date | string;
  text: string;
  parsed: unknown;
  fetched_at: Date | string;
}

export interface ExternalAnalystFeedPostInput {
  username: string;
  id: string;
  text: string;
  createdAt: string;
  url?: string;
}

function envNumber(name: string, fallback: number, min: number, max: number): number {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function uniqueNumbers(values: number[]): number[] {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0)))
    .sort((a, b) => a - b);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 180)}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

let ensureExternalAnalystTablesPromise: Promise<boolean> | null = null;

export async function ensureExternalAnalystTables(): Promise<boolean> {
  if (!prisma) return false;
  if (ensureExternalAnalystTablesPromise) return ensureExternalAnalystTablesPromise;
  ensureExternalAnalystTablesPromise = (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_external_analyst_posts (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        username TEXT NOT NULL,
        post_id TEXT NOT NULL,
        post_url TEXT NOT NULL,
        posted_at TIMESTAMPTZ NOT NULL,
        text TEXT NOT NULL,
        parsed JSONB NOT NULL DEFAULT '{}'::jsonb,
        fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS trade_external_analyst_posts_source_post_uq
      ON trade_external_analyst_posts(source, post_id)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS trade_external_analyst_posts_posted_idx
      ON trade_external_analyst_posts(posted_at DESC)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_external_analyst_state (
        state_key TEXT PRIMARY KEY,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    return true;
  })().catch((error) => {
    ensureExternalAnalystTablesPromise = null;
    throw error;
  });
  return ensureExternalAnalystTablesPromise;
}

async function lastRefreshAt(): Promise<Date | null> {
  if (!prisma) return null;
  const rows = await prisma.$queryRawUnsafe<Array<{ updated_at: Date | string }>>(`
    SELECT updated_at FROM trade_external_analyst_state
    WHERE state_key = 'refresh'
    LIMIT 1
  `);
  const value = rows[0]?.updated_at;
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function markRefresh(report: ExternalAnalystRefreshReport): Promise<void> {
  if (!prisma) return;
  await prisma.$executeRawUnsafe(
    `INSERT INTO trade_external_analyst_state(state_key, payload, updated_at)
     VALUES ('refresh', $1::jsonb, NOW())
     ON CONFLICT (state_key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    JSON.stringify(report)
  );
}

async function xUserId(username: string, bearerToken: string): Promise<string> {
  const payload = await fetchJson(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}`,
    { headers: { authorization: `Bearer ${bearerToken}` } }
  ) as { data?: { id?: string }; errors?: Array<{ detail?: string }> };
  const id = payload.data?.id;
  if (!id) throw new Error(payload.errors?.[0]?.detail || `无法解析X用户 ${username}`);
  return id;
}

async function fetchXPosts(username: string, bearerToken: string): Promise<ExternalAnalystFeedPostInput[]> {
  const userId = await xUserId(username, bearerToken);
  const url = new URL(`https://api.x.com/2/users/${encodeURIComponent(userId)}/tweets`);
  url.searchParams.set("max_results", "10");
  url.searchParams.set("exclude", "retweets,replies");
  url.searchParams.set("tweet.fields", "created_at");
  const payload = await fetchJson(url.toString(), {
    headers: { authorization: `Bearer ${bearerToken}` },
  }) as {
    data?: Array<{ id?: string; text?: string; created_at?: string }>;
    errors?: Array<{ detail?: string }>;
  };
  if (!payload.data && payload.errors?.length) {
    throw new Error(payload.errors[0]?.detail || `读取 ${username} 帖子失败`);
  }
  return (payload.data ?? [])
    .filter((row): row is { id: string; text: string; created_at?: string } => Boolean(row.id && row.text))
    .map((row) => ({
      username,
      id: row.id,
      text: row.text,
      createdAt: row.created_at ?? new Date().toISOString(),
      url: `https://x.com/${username}/status/${row.id}`,
    }));
}

async function fetchConfiguredJsonFeed(feedUrl: string): Promise<ExternalAnalystFeedPostInput[]> {
  const payload = await fetchJson(feedUrl);
  const source = Array.isArray(payload)
    ? payload
    : (payload as { posts?: unknown[] })?.posts ?? [];
  return source.flatMap((row): ExternalAnalystFeedPostInput[] => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    const username = String(item.username ?? item.author ?? "").replace(/^@/, "");
    const id = String(item.id ?? item.postId ?? item.tweetId ?? "");
    const text = String(item.text ?? item.content ?? "");
    const createdAt = String(item.createdAt ?? item.created_at ?? item.postedAt ?? "");
    if (!username || !id || !text || !createdAt) return [];
    return [{
      username,
      id,
      text,
      createdAt,
      url: String(item.url ?? `https://x.com/${username}/status/${id}`),
    }];
  });
}

async function storePost(
  post: ExternalAnalystFeedPostInput,
  forcedSource?: ExternalAnalystSource
): Promise<boolean> {
  if (!prisma) return false;
  const source = forcedSource ?? analystSourceFromUsername(post.username);
  if (!source) return false;
  const postedAt = new Date(post.createdAt);
  if (Number.isNaN(postedAt.getTime())) return false;
  const parsed = parseExternalAnalystPost({
    source,
    username: post.username,
    postId: post.id,
    postUrl: post.url ?? `https://x.com/${post.username}/status/${post.id}`,
    postedAt: postedAt.toISOString(),
    text: post.text,
  });
  const id = `${source}:${post.id}`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO trade_external_analyst_posts(
       id, source, username, post_id, post_url, posted_at, text, parsed, fetched_at, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6::timestamptz,$7,$8::jsonb,NOW(),NOW(),NOW())
     ON CONFLICT (source, post_id) DO UPDATE SET
       post_url = EXCLUDED.post_url,
       posted_at = EXCLUDED.posted_at,
       text = EXCLUDED.text,
       parsed = EXCLUDED.parsed,
       fetched_at = NOW(),
       updated_at = NOW()`,
    id,
    source,
    post.username,
    post.id,
    parsed.postUrl,
    parsed.postedAt,
    parsed.text,
    JSON.stringify(parsed)
  );
  return parsed.symbols.length > 0;
}


async function storeCollectorPostsBatch(
  posts: ExternalAnalystFeedPostInput[],
  source: ExternalAnalystSource
): Promise<{ storedPosts: number; parsedSignals: number }> {
  if (!prisma || posts.length === 0) return { storedPosts: 0, parsedSignals: 0 };

  const prepared = posts.flatMap((post) => {
    const postedAt = new Date(post.createdAt);
    if (Number.isNaN(postedAt.getTime())) return [];
    const parsed = parseExternalAnalystPost({
      source,
      username: post.username,
      postId: post.id,
      postUrl: post.url ?? `https://x.com/${post.username}/status/${post.id}`,
      postedAt: postedAt.toISOString(),
      text: post.text,
    });
    return [{
      id: `${source}:${post.id}`,
      source,
      username: post.username,
      post_id: post.id,
      post_url: parsed.postUrl,
      posted_at: parsed.postedAt,
      text: parsed.text,
      parsed,
      hasSignal: parsed.symbols.length > 0,
    }];
  });

  if (prepared.length === 0) return { storedPosts: 0, parsedSignals: 0 };

  const dbRows = prepared.map((row) => ({
    id: row.id,
    source: row.source,
    username: row.username,
    post_id: row.post_id,
    post_url: row.post_url,
    posted_at: row.posted_at,
    text: row.text,
    parsed: row.parsed,
  }));
  await prisma.$executeRawUnsafe(
    `WITH incoming AS (
       SELECT *
       FROM jsonb_to_recordset($1::jsonb) AS row(
         id TEXT,
         source TEXT,
         username TEXT,
         post_id TEXT,
         post_url TEXT,
         posted_at TEXT,
         text TEXT,
         parsed JSONB
       )
     )
     INSERT INTO trade_external_analyst_posts(
       id, source, username, post_id, post_url, posted_at, text, parsed, fetched_at, created_at, updated_at
     )
     SELECT
       id, source, username, post_id, post_url, posted_at::timestamptz, text, parsed, NOW(), NOW(), NOW()
     FROM incoming
     ON CONFLICT (source, post_id) DO UPDATE SET
       post_url = EXCLUDED.post_url,
       posted_at = EXCLUDED.posted_at,
       text = EXCLUDED.text,
       parsed = EXCLUDED.parsed,
       fetched_at = NOW(),
       updated_at = NOW()`,
    JSON.stringify(dbRows)
  );

  return {
    storedPosts: prepared.length,
    parsedSignals: prepared.filter((row) => row.hasSignal).length,
  };
}

export type ExternalAnalystCollectorMeta = {
  clientVersion?: string;
  accountsAttempted?: number;
  accountsSucceeded?: number;
  errorCount?: number;
  durationMs?: number;
};

export type ExternalAnalystCollectorIngestReport = {
  acceptedPosts: number;
  storedPosts: number;
  parsedSignals: number;
  rejectedPosts: number;
  checkedAt: string;
  collectorId: string;
  clientVersion: string;
  accountsAttempted: number;
  accountsSucceeded: number;
  errorCount: number;
  durationMs: number | null;
  errors: string[];
};

function configuredCollectorAccounts(): Set<string> {
  const rows = [
    ...configuredXWatchHandles(),
    ...ANALYSTS.map((row) => row.username),
    ...(process.env.MOOX_X_WATCH_ACCOUNTS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ];
  return new Set(rows.map((value) => value.replace(/^@/, "").toLowerCase()));
}

async function markCollectorState(payload: Record<string, unknown>): Promise<void> {
  if (!prisma) return;
  await prisma.$executeRawUnsafe(
    `INSERT INTO trade_external_analyst_state(state_key, payload, updated_at)
     VALUES ('local_x_collector', $1::jsonb, NOW())
     ON CONFLICT (state_key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    JSON.stringify(payload)
  );
}

export async function ingestExternalAnalystCollectorPosts(input: {
  posts: ExternalAnalystFeedPostInput[];
  collectorId?: string;
  checkedAt?: string;
  collectorMeta?: ExternalAnalystCollectorMeta;
}): Promise<ExternalAnalystCollectorIngestReport> {
  const checkedAt = input.checkedAt && Number.isFinite(Date.parse(input.checkedAt))
    ? new Date(input.checkedAt).toISOString()
    : new Date().toISOString();
  const collectorId = (input.collectorId ?? "moox-windows-x-collector").trim().slice(0, 120) || "moox-windows-x-collector";
  const meta = input.collectorMeta ?? {};
  const boundedCount = (value: number | undefined, maximum = 10_000): number => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(maximum, Math.round(value ?? 0)));
  };
  const durationMs = Number.isFinite(meta.durationMs)
    ? Math.max(0, Math.min(30 * 60_000, Math.round(meta.durationMs ?? 0)))
    : null;
  const report: ExternalAnalystCollectorIngestReport = {
    acceptedPosts: 0,
    storedPosts: 0,
    parsedSignals: 0,
    rejectedPosts: 0,
    checkedAt,
    collectorId,
    clientVersion: String(meta.clientVersion ?? "").trim().slice(0, 80),
    accountsAttempted: boundedCount(meta.accountsAttempted, 500),
    accountsSucceeded: boundedCount(meta.accountsSucceeded, 500),
    errorCount: boundedCount(meta.errorCount, 500),
    durationMs,
    errors: [],
  };

  if (!(await ensureExternalAnalystTables())) {
    report.errors.push("DATABASE_UNAVAILABLE");
    return report;
  }

  const allowedAccounts = configuredCollectorAccounts();
  const unique = Array.from(new Map(
    input.posts
      .slice(0, 120)
      .map((post) => ({
        username: String(post.username ?? "").replace(/^@/, "").trim(),
        id: String(post.id ?? "").trim(),
        text: String(post.text ?? "").replace(/\u0000/g, "").trim().slice(0, 20_000),
        createdAt: String(post.createdAt ?? "").trim(),
        url: post.url ? String(post.url).trim() : undefined,
      }))
      .filter((post) => post.username && post.id && post.text && post.createdAt)
      .map((post) => [`${post.username.toLowerCase()}:${post.id}`, post] as const)
  ).values());

  const accepted: ExternalAnalystFeedPostInput[] = [];
  for (const post of unique) {
    const normalizedUsername = post.username.toLowerCase();
    if (!allowedAccounts.has(normalizedUsername)) {
      report.rejectedPosts += 1;
      report.errors.push(`${post.username}/${post.id}: ACCOUNT_NOT_ALLOWED`);
      continue;
    }
    accepted.push(post);
  }

  // Local collector data is always observation-only. It may enrich the member
  // radar, but it must never enter the automated trading overlay. Batch the DB
  // upsert into one round-trip so a normal 30-120 post payload does not spend
  // the whole serverless invocation doing one INSERT per post.
  const forcedSource: ExternalAnalystSource = "BTCKIK";
  try {
    const stored = await storeCollectorPostsBatch(accepted, forcedSource);
    report.acceptedPosts = accepted.length;
    report.storedPosts = stored.storedPosts;
    report.parsedSignals = stored.parsedSignals;
  } catch (error) {
    report.errors.push(`BATCH_STORE_FAILED: ${error instanceof Error ? error.message : "STORE_FAILED"}`);
  }

  await markCollectorState({
    ...report,
    receivedPosts: input.posts.length,
    allowedAccountCount: allowedAccounts.size,
    heartbeatOnly: input.posts.length === 0,
  }).catch(() => undefined);
  return report;
}

export async function refreshExternalAnalystSignals(
  now = new Date(),
  options: { force?: boolean } = {}
): Promise<ExternalAnalystRefreshReport> {
  const enabled = process.env.MOOX_EXTERNAL_ANALYST_ENABLED?.toLowerCase() !== "false";
  const checkedAt = now.toISOString();
  if (!enabled) {
    return {
      enabled: false,
      configured: false,
      skipped: true,
      source: "NONE",
      fetchedPosts: 0,
      storedPosts: 0,
      parsedSignals: 0,
      checkedAt,
      message: "外部分析师监测已关闭。",
      errors: [],
    };
  }
  if (!(await ensureExternalAnalystTables())) {
    return {
      enabled: true,
      configured: false,
      skipped: true,
      source: "NONE",
      fetchedPosts: 0,
      storedPosts: 0,
      parsedSignals: 0,
      checkedAt,
      message: "数据库不可用，外部分析师监测未运行。",
      errors: ["DATABASE_UNAVAILABLE"],
    };
  }

  const refreshMinutes = envNumber("MOOX_EXTERNAL_ANALYST_REFRESH_MINUTES", 15, 5, 240);
  const previous = await lastRefreshAt();
  if (!options.force && previous && now.getTime() - previous.getTime() < refreshMinutes * 60_000) {
    return {
      enabled: true,
      configured: Boolean(process.env.X_BEARER_TOKEN || process.env.MOOX_EXTERNAL_ANALYST_FEED_URL),
      skipped: true,
      source: "NONE",
      fetchedPosts: 0,
      storedPosts: 0,
      parsedSignals: 0,
      checkedAt,
      message: `距离上次监测不足${refreshMinutes}分钟，本轮跳过。`,
      errors: [],
    };
  }

  const bearerToken = process.env.X_BEARER_TOKEN?.trim() ?? "";
  const feedUrl = process.env.MOOX_EXTERNAL_ANALYST_FEED_URL?.trim() ?? "";
  const configured = Boolean(bearerToken || feedUrl);
  const errors: string[] = [];
  let posts: ExternalAnalystFeedPostInput[] = [];
  let source: ExternalAnalystRefreshReport["source"] = "NONE";

  if (bearerToken) {
    source = "X_API";
    for (const analyst of ANALYSTS) {
      try {
        posts.push(...await fetchXPosts(analyst.username, bearerToken));
      } catch (error) {
        errors.push(`${analyst.username}: ${error instanceof Error ? error.message : "X API读取失败"}`);
      }
    }
  } else if (feedUrl) {
    source = "JSON_FEED";
    try {
      posts = await fetchConfiguredJsonFeed(feedUrl);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "JSON feed读取失败");
    }
  }

  const unique = Array.from(new Map(posts.map((post) => [`${post.username.toLowerCase()}:${post.id}`, post] as const)).values());
  let storedPosts = 0;
  let parsedSignals = 0;
  for (const post of unique) {
    try {
      const parsed = await storePost(post);
      storedPosts += 1;
      if (parsed) parsedSignals += 1;
    } catch (error) {
      errors.push(`${post.username}/${post.id}: ${error instanceof Error ? error.message : "写入失败"}`);
    }
  }

  const report: ExternalAnalystRefreshReport = {
    enabled: true,
    configured,
    skipped: false,
    source,
    fetchedPosts: unique.length,
    storedPosts,
    parsedSignals,
    checkedAt,
    message: configured
      ? `已读取${unique.length}条帖子，写入${storedPosts}条，其中${parsedSignals}条含可映射交易品种。`
      : "尚未配置X_BEARER_TOKEN或MOOX_EXTERNAL_ANALYST_FEED_URL；策略继续运行，但不会自动读取新帖子。",
    errors,
  };
  await markRefresh(report).catch(() => undefined);
  return report;
}

function sourceRelevant(source: ExternalAnalystSource, strategyType: ThreeHorizonStrategyType): boolean {
  // BTCKIK is an observation-only KOL feed. It must never alter the automated
  // trading overlay or place orders. The member radar presents it separately.
  if (source === "BTCKIK") return false;
  if (strategyType === "INTRADAY") return source === "HALILUYA";
  return source === "BTCTW0";
}

function freshnessHours(source: ExternalAnalystSource, strategyType: ThreeHorizonStrategyType): number {
  if (source === "HALILUYA") return strategyType === "INTRADAY" ? 72 : 120;
  if (source === "BTCKIK") return strategyType === "POSITION" ? 21 * 24 : 7 * 24;
  return strategyType === "POSITION" ? 45 * 24 : 14 * 24;
}

export async function getExternalAnalystOverlay(
  symbol: string,
  strategyType: ThreeHorizonStrategyType,
  now = new Date()
): Promise<ExternalAnalystOverlay | null> {
  const enabled = process.env.MOOX_EXTERNAL_ANALYST_ENABLED?.toLowerCase() !== "false";
  if (!enabled || !prisma || !(await ensureExternalAnalystTables())) return null;
  const rows = await prisma.$queryRawUnsafe<StoredRow[]>(`
    SELECT source, username, post_id, post_url, posted_at, text, parsed, fetched_at
    FROM trade_external_analyst_posts
    WHERE posted_at >= NOW() - INTERVAL '45 days'
    ORDER BY posted_at DESC
    LIMIT 160
  `);
  const relevant = rows.flatMap((row): ExternalAnalystParsedPost[] => {
    const parsed = parseJson<ExternalAnalystParsedPost | null>(row.parsed, null);
    if (!parsed) return [];
    if (!sourceRelevant(parsed.source, strategyType)) return [];
    if (parsed.symbols.length !== 1 || parsed.symbols[0] !== symbol) return [];
    const postedAt = Date.parse(parsed.postedAt);
    if (!Number.isFinite(postedAt)) return [];
    const ageHours = (now.getTime() - postedAt) / 3_600_000;
    if (ageHours < -1 || ageHours > freshnessHours(parsed.source, strategyType)) return [];
    return [parsed];
  }).slice(0, 6);
  if (!relevant.length) return null;

  let directionScore = 0;
  for (const post of relevant) {
    if (post.direction === "LONG") directionScore += post.confidence;
    else if (post.direction === "SHORT") directionScore -= post.confidence;
  }
  const direction: ThreeHorizonDirection = directionScore > 35 ? "LONG" : directionScore < -35 ? "SHORT" : "NEUTRAL";
  const newestPostedAt = relevant
    .map((post) => post.postedAt)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? now.toISOString();
  return {
    symbol,
    strategyType,
    direction,
    confidence: Math.min(80, Math.max(35, Math.round(relevant.reduce((sum, post) => sum + post.confidence, 0) / relevant.length))),
    supportLevels: uniqueNumbers(relevant.flatMap((post) => post.supportLevels)),
    resistanceLevels: uniqueNumbers(relevant.flatMap((post) => post.resistanceLevels)),
    targetLevels: uniqueNumbers(relevant.flatMap((post) => post.targetLevels)),
    invalidationLevels: uniqueNumbers(relevant.flatMap((post) => post.invalidationLevels)),
    timeWindows: uniqueStrings(relevant.flatMap((post) => post.timeWindows)).slice(0, 8),
    sourceLabels: uniqueStrings(relevant.map((post) => SOURCE_LABELS[post.source])),
    sourceUrls: uniqueStrings(relevant.map((post) => post.postUrl)).slice(0, 6),
    summaries: uniqueStrings(relevant.map((post) => post.summary)).slice(0, 4),
    newestPostedAt,
  };
}

export async function getLatestExternalAnalystPosts(input: {
  source?: ExternalAnalystSource;
  limit?: number;
} = {}): Promise<ExternalAnalystParsedPost[]> {
  if (!prisma || !(await ensureExternalAnalystTables())) return [];
  const limit = Math.max(1, Math.min(100, input.limit ?? 30));
  const rows = input.source
    ? await prisma.$queryRawUnsafe<StoredRow[]>(
        `SELECT source, username, post_id, post_url, posted_at, text, parsed, fetched_at
         FROM trade_external_analyst_posts
         WHERE source = $1
         ORDER BY posted_at DESC
         LIMIT $2`,
        input.source,
        limit
      )
    : await prisma.$queryRawUnsafe<StoredRow[]>(
        `SELECT source, username, post_id, post_url, posted_at, text, parsed, fetched_at
         FROM trade_external_analyst_posts
         ORDER BY posted_at DESC
         LIMIT $1`,
        limit
      );
  return rows.flatMap((row): ExternalAnalystParsedPost[] => {
    const parsed = parseJson<ExternalAnalystParsedPost | null>(row.parsed, null);
    return parsed ? [parsed] : [];
  });
}

export function externalAnalystConfigurationSummary(): Array<{ username: string; source: ExternalAnalystSource; label: string }> {
  return ANALYSTS.map((row) => ({ ...row }));
}
