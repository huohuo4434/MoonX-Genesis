import "server-only";

import { prisma } from "@/lib/prisma";
import { assessAltcoinRadarPost } from "@/lib/trading-signals/altcoin-radar";
import { ensureExternalAnalystTables } from "@/lib/trading-signals/external-analyst-signals";
import { xSourceFamilyForHandle } from "@/lib/trading-signals/x-source-registry.server";
import {
  aggregateXIntelligence,
  type XIntelligenceAggregate,
  type XIntelligenceAggregateInput,
} from "@/lib/trading-signals/x-intelligence-core";
import type { ExternalAnalystParsedPost } from "@/types/external-analyst";

export type XCollectorHealthStatus = "HEALTHY" | "STALE" | "ERROR" | "NOT_CONFIGURED" | "NO_DATA";

export type XCollectorHealth = {
  status: XCollectorHealthStatus;
  configured: boolean;
  lastCheckedAt: string | null;
  ageMinutes: number | null;
  collectorId: string | null;
  clientVersion: string | null;
  accountsAttempted: number;
  accountsSucceeded: number;
  receivedPosts: number;
  storedPosts: number;
  parsedSignals: number;
  rejectedPosts: number;
  errorCount: number;
  durationMs: number | null;
  message: string;
};

export type XIntelligenceSnapshot = {
  collector: XCollectorHealth;
  aggregate: XIntelligenceAggregate;
  databaseAvailable: boolean;
};

interface StoredRow {
  username: string;
  posted_at: Date | string;
  parsed: unknown;
}

interface StateRow {
  payload: unknown;
  updated_at: Date | string;
}

let cache: { expiresAt: number; value: Promise<XIntelligenceSnapshot> } | null = null;

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asOptionalNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asString(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizedIso(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  const text = String(value ?? "").trim();
  if (!text) return null;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function collectorMessage(status: XCollectorHealthStatus, ageMinutes: number | null): string {
  if (status === "NOT_CONFIGURED") return "Vercel尚未配置MOOX_X_COLLECTOR_SECRET。";
  if (status === "NO_DATA") return "尚未收到本地采集器的首次心跳。";
  if (status === "STALE") return `采集器已超过${Math.max(1, Math.round(ageMinutes ?? 0))}分钟没有心跳。`;
  if (status === "ERROR") return "采集器最近一轮存在读取或提交错误，请查看本地日志。";
  return "采集器运行正常；即使本轮没有新帖子，也会持续发送健康心跳。";
}

function buildCollectorHealth(state: StateRow | undefined, now: Date): XCollectorHealth {
  const configured = (process.env.MOOX_X_COLLECTOR_SECRET?.trim().length ?? 0) >= 24;
  if (!configured) {
    return {
      status: "NOT_CONFIGURED",
      configured: false,
      lastCheckedAt: null,
      ageMinutes: null,
      collectorId: null,
      clientVersion: null,
      accountsAttempted: 0,
      accountsSucceeded: 0,
      receivedPosts: 0,
      storedPosts: 0,
      parsedSignals: 0,
      rejectedPosts: 0,
      errorCount: 0,
      durationMs: null,
      message: collectorMessage("NOT_CONFIGURED", null),
    };
  }

  if (!state) {
    return {
      status: "NO_DATA",
      configured: true,
      lastCheckedAt: null,
      ageMinutes: null,
      collectorId: null,
      clientVersion: null,
      accountsAttempted: 0,
      accountsSucceeded: 0,
      receivedPosts: 0,
      storedPosts: 0,
      parsedSignals: 0,
      rejectedPosts: 0,
      errorCount: 0,
      durationMs: null,
      message: collectorMessage("NO_DATA", null),
    };
  }

  const payload = asRecord(parseJson<unknown>(state.payload, {}));
  const checkedAt = normalizedIso(payload.checkedAt) ?? normalizedIso(state.updated_at);
  const ageMinutes = checkedAt ? Math.max(0, (now.getTime() - Date.parse(checkedAt)) / 60_000) : null;
  const errorCount = Math.max(
    0,
    Math.round(asNumber(payload.errorCount, Array.isArray(payload.errors) ? payload.errors.length : 0))
  );
  const staleMinutes = Math.max(20, Math.min(180, asNumber(process.env.MOOX_X_COLLECTOR_STALE_MINUTES, 45)));
  const status: XCollectorHealthStatus = ageMinutes === null
    ? "NO_DATA"
    : ageMinutes > staleMinutes
      ? "STALE"
      : errorCount > 0
        ? "ERROR"
        : "HEALTHY";

  return {
    status,
    configured: true,
    lastCheckedAt: checkedAt,
    ageMinutes,
    collectorId: asString(payload.collectorId),
    clientVersion: asString(payload.clientVersion),
    accountsAttempted: Math.max(0, Math.round(asNumber(payload.accountsAttempted))),
    accountsSucceeded: Math.max(0, Math.round(asNumber(payload.accountsSucceeded))),
    receivedPosts: Math.max(0, Math.round(asNumber(payload.receivedPosts))),
    storedPosts: Math.max(0, Math.round(asNumber(payload.storedPosts))),
    parsedSignals: Math.max(0, Math.round(asNumber(payload.parsedSignals))),
    rejectedPosts: Math.max(0, Math.round(asNumber(payload.rejectedPosts))),
    errorCount,
    durationMs: asOptionalNumber(payload.durationMs),
    message: collectorMessage(status, ageMinutes),
  };
}

function mapParsedPost(row: StoredRow): XIntelligenceAggregateInput | null {
  const parsed = parseJson<ExternalAnalystParsedPost | null>(row.parsed, null);
  if (!parsed) return null;
  const assessment = assessAltcoinRadarPost(parsed);
  return {
    postedAt: normalizedIso(parsed.postedAt) ?? normalizedIso(row.posted_at) ?? new Date(0).toISOString(),
    sourceKey: parsed.username || row.username,
    sourceFamily: xSourceFamilyForHandle(parsed.username || row.username),
    symbols: parsed.symbols,
    direction: parsed.direction,
    confidence: parsed.confidence,
    stage: assessment.stage,
    risk: assessment.risk,
    levels: [
      ...parsed.supportLevels,
      ...parsed.resistanceLevels,
      ...parsed.targetLevels,
      ...parsed.invalidationLevels,
      ...parsed.keyLevels,
    ],
    timeWindows: parsed.timeWindows,
  };
}

async function loadSnapshot(now: Date): Promise<XIntelligenceSnapshot> {
  if (!prisma || !(await ensureExternalAnalystTables())) {
    return {
      databaseAvailable: false,
      collector: buildCollectorHealth(undefined, now),
      aggregate: aggregateXIntelligence([], now),
    };
  }

  const [rows, states] = await Promise.all([
    prisma.$queryRawUnsafe<StoredRow[]>(`
      SELECT username, posted_at, parsed
      FROM trade_external_analyst_posts
      WHERE source = 'BTCKIK'
        AND posted_at >= NOW() - INTERVAL '7 days'
      ORDER BY posted_at DESC
      LIMIT 600
    `),
    prisma.$queryRawUnsafe<StateRow[]>(`
      SELECT payload, updated_at
      FROM trade_external_analyst_state
      WHERE state_key = 'local_x_collector'
      LIMIT 1
    `),
  ]);

  return {
    databaseAvailable: true,
    collector: buildCollectorHealth(states[0], now),
    aggregate: aggregateXIntelligence(rows.flatMap((row) => {
      const mapped = mapParsedPost(row);
      return mapped ? [mapped] : [];
    }), now),
  };
}

export async function getXIntelligenceSnapshot(options: { force?: boolean; now?: Date } = {}): Promise<XIntelligenceSnapshot> {
  const now = options.now ?? new Date();
  if (!options.force && cache && cache.expiresAt > now.getTime()) return cache.value;
  const value = loadSnapshot(now).catch((): XIntelligenceSnapshot => ({
    databaseAvailable: false,
    collector: buildCollectorHealth(undefined, now),
    aggregate: aggregateXIntelligence([], now),
  }));
  cache = { expiresAt: now.getTime() + 30_000, value };
  return value;
}
