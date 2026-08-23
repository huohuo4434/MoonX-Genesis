// MOOX_V720107_X_10D_BACKFILL: full registry + incremental 10-day server history backfill.
// MOOX_EXTERNAL_ANALYST_V1
import "server-only";

import { prisma } from "@/lib/prisma";
import { prepareExternalAnalystCollectorPosts, type PreparedCollectorPost } from "@/lib/trading-signals/external-analyst-collector-core";
import { buildExternalAnalystOverlayFromRows } from "@/lib/trading-signals/external-analyst-aggregation-core";
import type {
  ExternalAnalystOverlay,
  ExternalAnalystParsedPost,
  ExternalAnalystRefreshReport,
  ExternalAnalystSource,
} from "@/types/external-analyst";
import { configuredXWatchHandles, normalizeXSourceHandle, X_SOURCE_REGISTRY } from "@/lib/trading-signals/x-source-registry.server";
import type { ThreeHorizonStrategyType } from "@/types/three-horizon-strategy";

const ANALYSTS: Array<{ username: string; source: ExternalAnalystSource; label: string }> = [
  { username: "haliluya8911", source: "HALILUYA", label: "短线恐慌反弹观察" },
  { username: "BTCTW0", source: "BTCTW0", label: "彼得兔江恩波段点位" },
  { username: "btckik", source: "BTCKIK", label: "山寨币轮动与早期叙事观察" },
  { username: "mat78704", source: "MAT78704", label: "方向与周期共振观察" },
];

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

async function xUserIds(usernames: string[], bearerToken: string): Promise<Map<string, string>> {
  const rows = new Map<string, string>();
  for (let index = 0; index < usernames.length; index += 100) {
    const batch = usernames.slice(index, index + 100);
    if (!batch.length) continue;
    const url = new URL("https://api.x.com/2/users/by");
    url.searchParams.set("usernames", batch.join(","));
    const payload = await fetchJson(url.toString(), {
      headers: { authorization: `Bearer ${bearerToken}` },
    }) as { data?: Array<{ id?: string; username?: string }>; errors?: Array<{ detail?: string }> };
    for (const row of payload.data ?? []) {
      if (row.id && row.username) rows.set(row.username.toLowerCase(), row.id);
    }
    if (!payload.data?.length && payload.errors?.length) {
      throw new Error(payload.errors[0]?.detail || "无法批量解析X用户");
    }
  }
  return rows;
}

async function latestStoredPostTimes(): Promise<Map<string, string>> {
  const values = new Map<string, string>();
  if (!prisma) return values;
  const rows = await prisma.$queryRawUnsafe<Array<{ username: string; latest_at: Date | string }>>(`
    SELECT LOWER(username) AS username, MAX(posted_at) AS latest_at
    FROM trade_external_analyst_posts
    WHERE posted_at >= NOW() - INTERVAL '10 days'
    GROUP BY LOWER(username)
  `);
  for (const row of rows) {
    const date = row.latest_at instanceof Date ? row.latest_at : new Date(row.latest_at);
    if (!Number.isNaN(date.getTime())) values.set(row.username, date.toISOString());
  }
  return values;
}

function xFetchStartAt(now: Date, latestAt: string | undefined): { startAt: string; backfill: boolean } {
  const cutoff = now.getTime() - 10 * 24 * 60 * 60 * 1000;
  if (!latestAt || !Number.isFinite(Date.parse(latestAt))) return { startAt: new Date(cutoff).toISOString(), backfill: true };
  const latest = Date.parse(latestAt);
  if (latest < cutoff) return { startAt: new Date(cutoff).toISOString(), backfill: true };
  // Re-read a small overlap so delayed posts / API boundary timestamps remain idempotently covered.
  return { startAt: new Date(Math.max(cutoff, latest - 30 * 60 * 1000)).toISOString(), backfill: false };
}

async function fetchXPostsByUserId(input: {
  username: string;
  userId: string;
  bearerToken: string;
  startAt: string;
  backfill: boolean;
}): Promise<ExternalAnalystFeedPostInput[]> {
  const posts: ExternalAnalystFeedPostInput[] = [];
  let paginationToken = "";
  const maxPages = input.backfill
    ? Math.max(1, Math.min(3, envNumber("MOOX_X_BACKFILL_MAX_PAGES", 2, 1, 3)))
    : 1;
  for (let page = 0; page < maxPages; page += 1) {
    const url = new URL(`https://api.x.com/2/users/${encodeURIComponent(input.userId)}/tweets`);
    url.searchParams.set("max_results", "100");
    url.searchParams.set("exclude", "retweets,replies");
    url.searchParams.set("tweet.fields", "created_at");
    url.searchParams.set("start_time", input.startAt);
    if (paginationToken) url.searchParams.set("pagination_token", paginationToken);
    const payload = await fetchJson(url.toString(), {
      headers: { authorization: `Bearer ${input.bearerToken}` },
    }) as {
      data?: Array<{ id?: string; text?: string; created_at?: string }>;
      meta?: { next_token?: string };
      errors?: Array<{ detail?: string }>;
    };
    if (!payload.data && payload.errors?.length) {
      throw new Error(payload.errors[0]?.detail || `读取 ${input.username} 帖子失败`);
    }
    for (const row of payload.data ?? []) {
      if (!row.id || !row.text) continue;
      posts.push({
        username: input.username,
        id: row.id,
        text: row.text,
        createdAt: row.created_at ?? new Date().toISOString(),
        url: `https://x.com/${input.username}/status/${row.id}`,
      });
    }
    paginationToken = payload.meta?.next_token ?? "";
    if (!paginationToken) break;
  }
  return posts;
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

async function storeCollectorPostsBatch(
  posts: PreparedCollectorPost[]
): Promise<{ storedPosts: number; parsedSignals: number }> {
  if (!prisma || posts.length === 0) return { storedPosts: 0, parsedSignals: 0 };

  const prepared = posts.flatMap((post) => {
    const parsed = post.parsed;
    const source = post.source;
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
  duplicatePosts: number;
  truncatedPosts: number;
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
    duplicatePosts: 0,
    truncatedPosts: 0,
  };

  if (!(await ensureExternalAnalystTables())) {
    report.errors.push("DATABASE_UNAVAILABLE");
    return report;
  }

  const allowedAccounts = configuredCollectorAccounts();
  const generalRegistryAccounts = new Map(
    X_SOURCE_REGISTRY.map((entry) => [normalizeXSourceHandle(entry.handle), entry.family] as const)
  );
  const prepared = prepareExternalAnalystCollectorPosts({ posts: input.posts, allowedAccounts, generalRegistryAccounts });
  for (const rejected of prepared.rejected) report.errors.push(`${rejected.username}/${rejected.id}: ${rejected.reason}`);
  report.rejectedPosts = prepared.rejected.length;
  report.duplicatePosts = prepared.duplicateCount;
  report.truncatedPosts = prepared.truncatedCount;

  // Every post keeps the source authorized by its username. Roles remain
  // RESEARCH_ONLY; downstream policy decides whether a structured observation
  // is eligible for a bounded overlay. Batch into one idempotent DB round-trip.
  try {
    const stored = await storeCollectorPostsBatch(prepared.accepted);
    report.acceptedPosts = prepared.accepted.length;
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

async function fetchRegistryPostsWithConcurrency(
  handles: string[],
  bearerToken: string,
  errors: string[],
  now: Date,
): Promise<ExternalAnalystFeedPostInput[]> {
  const concurrency = Math.max(1, Math.min(6, envNumber("MOOX_X_SERVER_FETCH_CONCURRENCY", 3, 1, 6)));
  const posts: ExternalAnalystFeedPostInput[] = [];
  const [userIds, latestByHandle] = await Promise.all([
    xUserIds(handles, bearerToken),
    latestStoredPostTimes(),
  ]);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, handles.length) }, async () => {
    while (cursor < handles.length) {
      const index = cursor;
      cursor += 1;
      const username = handles[index];
      if (!username) continue;
      const userId = userIds.get(username.toLowerCase());
      if (!userId) {
        errors.push(`${username}: X用户ID未解析`);
        continue;
      }
      try {
        const range = xFetchStartAt(now, latestByHandle.get(username.toLowerCase()));
        posts.push(...await fetchXPostsByUserId({ username, userId, bearerToken, ...range }));
      } catch (error) {
        errors.push(`${username}: ${error instanceof Error ? error.message : "X API读取失败"}`);
      }
    }
  });
  await Promise.all(workers);
  return posts;
}

function serverWatchHandles(): string[] {
  const extras = (process.env.MOOX_X_WATCH_ACCOUNTS ?? "")
    .split(",")
    .map((value) => value.replace(/^@/, "").trim())
    .filter(Boolean);
  return Array.from(new Map(
    [...configuredXWatchHandles(), ...extras].map((value) => [value.toLowerCase(), value] as const),
  ).values());
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
    posts = await fetchRegistryPostsWithConcurrency(serverWatchHandles(), bearerToken, errors, now);
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
  const allowedAccounts = configuredCollectorAccounts();
  const generalRegistryAccounts = new Map(
    X_SOURCE_REGISTRY.map((entry) => [normalizeXSourceHandle(entry.handle), entry.family] as const),
  );
  // prepareExternalAnalystCollectorPosts intentionally caps one untrusted batch.
  // Process server feeds in bounded chunks so a 27-account scan does not silently
  // discard the latter half of the registry.
  for (let index = 0; index < unique.length; index += 100) {
    const chunk = unique.slice(index, index + 100);
    const prepared = prepareExternalAnalystCollectorPosts({ posts: chunk, allowedAccounts, generalRegistryAccounts });
    for (const rejected of prepared.rejected) errors.push(`${rejected.username}/${rejected.id}: ${rejected.reason}`);
    try {
      const stored = await storeCollectorPostsBatch(prepared.accepted);
      storedPosts += stored.storedPosts;
      parsedSignals += stored.parsedSignals;
    } catch (error) {
      errors.push(`SERVER_BATCH_STORE_FAILED: ${error instanceof Error ? error.message : "STORE_FAILED"}`);
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
      ? `已扫描${source === "X_API" ? serverWatchHandles().length : "Feed"}个来源，读取${unique.length}条帖子，写入${storedPosts}条，其中${parsedSignals}条含可映射交易品种；X API会按数据库最新时间增量拉取，缺历史的账号自动回补最近10天。`
      : "尚未配置X_BEARER_TOKEN或MOOX_EXTERNAL_ANALYST_FEED_URL；策略继续运行，但不会自动读取新帖子。",
    errors,
  };
  await markRefresh(report).catch(() => undefined);
  return report;
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
    WHERE posted_at >= $1::timestamptz - INTERVAL '45 days'
      AND posted_at <= $1::timestamptz
      AND source <> 'SUBSTACK_CYCLE'
    ORDER BY posted_at DESC
    LIMIT 160
  `, now.toISOString());
  return buildExternalAnalystOverlayFromRows({ rows, symbol, strategyType, nowMs: now.getTime() });
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
           AND source <> 'SUBSTACK_CYCLE'
         ORDER BY posted_at DESC
         LIMIT $2`,
        input.source,
        limit
      )
    : await prisma.$queryRawUnsafe<StoredRow[]>(
        `SELECT source, username, post_id, post_url, posted_at, text, parsed, fetched_at
         FROM trade_external_analyst_posts
         WHERE source <> 'SUBSTACK_CYCLE'
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
