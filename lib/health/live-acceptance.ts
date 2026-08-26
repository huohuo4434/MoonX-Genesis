import "server-only";

import { prisma } from "@/lib/prisma";
import { getVerificationPipelineStatus } from "@/lib/accuracy/verification-pipeline-status";
import { getReadOnlyLiveStatusSnapshot } from "@/lib/live-status-readonly";
import { deriveLiveAcceptanceLights } from "@/lib/health/live-acceptance-core";

type StateRow = { state_key: string; payload: unknown; updated_at: Date };
let cache: { expiresAt: number; value: Promise<Awaited<ReturnType<typeof buildUncached>>> } | null = null;

function record(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try { return record(JSON.parse(value)); } catch { return {}; }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function number(value: unknown): number { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }

async function readHealthStates(): Promise<StateRow[]> {
  if (!prisma) return [];
  // Pure read: a health endpoint must never call ensure* helpers or create/repair schema.
  return prisma.$queryRaw<StateRow[]>`
    SELECT state_key, payload, updated_at
    FROM trade_external_analyst_state
    WHERE state_key IN ('content_freshness_report_v1', 'local_x_collector')
  `;
}

async function buildUncached(now: Date) {
  const databaseProbe = prisma
    ? prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`.then(() => true).catch(() => false)
    : Promise.resolve(false);
  const [databaseOk, states, verification, trading] = await Promise.all([
    databaseProbe,
    readHealthStates().catch(() => []),
    getVerificationPipelineStatus(now, { repairSchema: false }).catch(() => null),
    getReadOnlyLiveStatusSnapshot(now).catch(() => ({ databaseReady: false, runtime: null, strategy: null })),
  ]);
  const content = record(states.find((row) => row.state_key === "content_freshness_report_v1")?.payload);
  const contentItems = Array.isArray(content.items) ? content.items.map(record) : [];
  const problemKeys = contentItems.filter((item) => item.status !== "OK").map((item) => String(item.key ?? "unknown"));
  const collectorRow = states.find((row) => row.state_key === "local_x_collector");
  const collector = record(collectorRow?.payload);
  const collectorCheckedAt = String(collector.checkedAt ?? collectorRow?.updated_at?.toISOString() ?? "");
  const collectorRawAgeMinutes = Number.isFinite(Date.parse(collectorCheckedAt)) ? (now.getTime() - Date.parse(collectorCheckedAt)) / 60_000 : null;
  const collectorAgeMinutes = collectorRawAgeMinutes == null || collectorRawAgeMinutes < -5 ? null : Math.max(0, collectorRawAgeMinutes);
  const collectorErrors = number(collector.errorCount) || (Array.isArray(collector.errors) ? collector.errors.length : 0);
  const collectorStatus = !collectorRow ? null : collectorAgeMinutes == null || collectorAgeMinutes > 45 ? "STALE" : collectorErrors > 0 ? "ERROR" : "HEALTHY";
  const lights = deriveLiveAcceptanceLights({
    now,
    databaseOk,
    content: {
      generatedAt: typeof content.generatedAt === "string" ? content.generatedAt : null,
      status: content.status === "OK" || content.status === "ATTENTION" ? content.status : null,
      problemKeys,
    },
    verification: {
      state: verification?.state ?? null,
      generatedSourceHealthy: verification?.generatedSourceHealthy ?? false,
      syncMissing: verification?.syncMissing ?? 0,
      latestVerifiedAt: verification?.latestVerifiedAt ?? null,
    },
    collector: {
      status: collectorStatus,
      ageMinutes: collectorAgeMinutes,
      accountsSucceeded: number(collector.accountsSucceeded),
      accountsAttempted: number(collector.accountsAttempted),
    },
    trading: {
      databaseReady: trading.databaseReady,
      runtimePresent: Boolean(trading.runtime),
      serverHealthy: trading.runtime?.serverHealthy ?? false,
      paused: trading.runtime?.paused ?? false,
      pauseReason: "",
      heartbeatAgeSeconds: trading.runtime?.heartbeatAgeSeconds ?? null,
    },
  });
  return {
    version: 1,
    generatedAt: now.toISOString(),
    current: true,
    overall: lights.some((light) => light.status === "RED") ? "RED" : lights.some((light) => light.status === "YELLOW") ? "YELLOW" : "GREEN",
    lights,
    noteZh: "五盏灯均为当前只读探针；黄灯表示安全暂停或需关注，不会自动开启实盘、改写预测或触发付款。",
  };
}

export function buildLiveAcceptanceReport(now = new Date()) {
  if (cache && cache.expiresAt > now.getTime()) return cache.value;
  const value = buildUncached(now);
  cache = { expiresAt: now.getTime() + 30_000, value };
  return value;
}
