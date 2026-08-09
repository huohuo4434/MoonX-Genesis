import "server-only";

import { prisma } from "@/lib/prisma";
import {
  getBitgetApiSecurity,
  getBitgetDemoAllPendingStrategyOrders,
  getBitgetDemoCurrentPositions,
  getBitgetDemoFinancialRecordsWindow,
  getBitgetDemoFillsWindow,
  getBitgetDemoHistoricalOrdersWindow,
  getBitgetDemoHistoricalStrategyOrdersWindow,
  getBitgetDemoOpenOrders,
  getBitgetDemoPositionHistoryWindow,
  getBitgetRuntimeAccountBalance,
  type BitgetAuditFillRow,
  type BitgetAuditOrderRow,
  type BitgetAuditStrategyRow,
} from "@/lib/bitget/demo-client";
import {
  LEGACY_RECONCILE_CONFIRMATION_PHRASE,
  evaluateLegacyAuditBatch,
  evaluateLegacyDecisionAudit,
  decideLegacyConfirmationAction,
  isMooxClientOid,
  legacyAuditWindow,
  type LegacyDecisionAuditEvaluation,
  type LegacyHistoricalEvidence,
  type LegacyHistoricalQueryStatus,
} from "@/lib/bitget/legacy-order-reconciliation-core";

export type LegacyOrderErrorRow = {
  id: string;
  symbol: string;
  status: string;
  rejection_code: string;
  rejection_reason: string;
  client_oid: string | null;
  bitget_order_id: string | null;
  raw_payload: unknown;
  created_at: Date | string;
  updated_at: Date | string;
};

type StoredLegacyReconciliation = {
  status?: string;
  deploymentVersion?: string;
  gitSha?: string | null;
  confirmedAt?: string;
  confirmedBy?: { id?: string; email?: string };
  originalErrorAt?: string;
  originalRejectionReason?: string;
  audit?: {
    checkedAt?: string;
    startAt?: string;
    endAt?: string;
    allQueriesSucceeded?: boolean;
    absent?: boolean;
    evidence?: LegacyHistoricalEvidence;
    queryStatus?: LegacyHistoricalQueryStatus;
    queryErrors?: string[];
  };
};

export type LegacyOrderErrorAuditItem = {
  decisionId: string;
  symbol: string;
  originalErrorAt: string;
  originalRejectionReason: string;
  clientOid: string | null;
  orderId: string | null;
  remoteSubmissionPossibility: "POSSIBLE" | "UNLIKELY" | "UNKNOWN";
  auditWindow: { startAt: string; endAt: string };
  queryStatus: LegacyHistoricalQueryStatus;
  evidence: LegacyHistoricalEvidence;
  queryErrors: string[];
  allQueriesSucceeded: boolean;
  foundTradingEvidence: boolean;
  safeAsAbsent: boolean;
  reconciled: boolean;
  reconciliation: StoredLegacyReconciliation | null;
};

export type LegacyOrderErrorAuditReport = {
  checkedAt: string;
  readOnly: true;
  deploymentVersion: string;
  items: LegacyOrderErrorAuditItem[];
  current: {
    accountQuerySucceeded: boolean;
    accountError: string;
    positionsCount: number | null;
    openOrdersCount: number | null;
    pendingStrategyOrdersCount: number | null;
    securityQuerySucceeded: boolean;
    withdrawPermission: boolean | null;
  };
  unresolvedCount: number;
  reconciledCount: number;
  allHistoricalQueriesSucceeded: boolean;
  foundTradingEvidence: boolean;
  canConfirmLegacyAbsent: boolean;
  summary: string;
};

function versionLabel(): string {
  return "v7.15.13";
}

function iso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function reconciliationFromRaw(raw: unknown): StoredLegacyReconciliation | null {
  if (!raw || typeof raw !== "object") return null;
  const value = (raw as Record<string, unknown>).legacyReconciliation;
  return value && typeof value === "object" ? value as StoredLegacyReconciliation : null;
}

function defaultEvidence(): LegacyHistoricalEvidence {
  return {
    ordinaryOrders: 0,
    fills: 0,
    currentOpenOrders: 0,
    currentStrategyOrders: 0,
    historicalStrategyOrders: 0,
    currentPositions: 0,
    historicalPositions: 0,
    financialRecords: 0,
    mooxOrdinaryOrders: 0,
    mooxFills: 0,
    mooxCurrentOpenOrders: 0,
    mooxCurrentStrategyOrders: 0,
    mooxHistoricalStrategyOrders: 0,
    ambiguousPositionChanges: 0,
    ambiguousFinancialRecords: 0,
  };
}

function emptyQueryStatus(): LegacyHistoricalQueryStatus {
  return {
    ordinaryOrders: "NOT_CHECKED",
    fills: "NOT_CHECKED",
    currentOpenOrders: "NOT_CHECKED",
    currentStrategyOrders: "NOT_CHECKED",
    historicalStrategyOrders: "NOT_CHECKED",
    currentPositions: "NOT_CHECKED",
    historicalPositions: "NOT_CHECKED",
    financialRecords: "NOT_CHECKED",
  };
}

function lookupStatus(count: number): "FOUND" | "ABSENT" {
  return count > 0 ? "FOUND" : "ABSENT";
}

function isSameSymbol(rowSymbol: unknown, symbol: string): boolean {
  return String(rowSymbol ?? "").toUpperCase() === symbol.toUpperCase();
}

function mooxOrders(rows: BitgetAuditOrderRow[], symbol: string) {
  return rows.filter((row) => isSameSymbol(row.symbol, symbol) && isMooxClientOid(row.clientOid));
}
function mooxFills(rows: BitgetAuditFillRow[], symbol: string) {
  return rows.filter((row) => isSameSymbol(row.symbol, symbol) && isMooxClientOid(row.clientOid));
}
function mooxStrategies(rows: BitgetAuditStrategyRow[], symbol: string) {
  return rows.filter((row) => isSameSymbol(row.symbol, symbol) && isMooxClientOid(row.clientOid));
}

async function readLegacyRows(limit = 100): Promise<LegacyOrderErrorRow[]> {
  if (!prisma) throw new Error("数据库不可用，无法读取旧版订单错误");
  return prisma.$queryRawUnsafe<LegacyOrderErrorRow[]>(
    `SELECT id,symbol,status,rejection_code,rejection_reason,client_oid,bitget_order_id,raw_payload,created_at,updated_at
       FROM trade_three_horizon_decisions
      WHERE mode='LIVE'
        AND (rejection_code='ORDER_ERROR' OR rejection_code='LEGACY_RECONCILED')
      ORDER BY updated_at DESC
      LIMIT $1`,
    Math.max(1, Math.min(500, Math.floor(limit)))
  );
}

async function auditUnresolvedRow(input: {
  row: LegacyOrderErrorRow;
  currentPositions: Awaited<ReturnType<typeof getBitgetDemoCurrentPositions>> | null;
  currentOpenOrders: Awaited<ReturnType<typeof getBitgetDemoOpenOrders>> | null;
  currentStrategies: Awaited<ReturnType<typeof getBitgetDemoAllPendingStrategyOrders>> | null;
  currentErrors: string[];
}): Promise<LegacyOrderErrorAuditItem> {
  const symbol = String(input.row.symbol).toUpperCase();
  const originalErrorAt = iso(input.row.updated_at);
  const window = legacyAuditWindow(originalErrorAt);
  const evidence = defaultEvidence();
  const status = emptyQueryStatus();
  const errors = [...input.currentErrors];

  if (input.currentPositions) {
    evidence.currentPositions = input.currentPositions.filter((row) => isSameSymbol(row.symbol, symbol) && row.total > 0).length;
    status.currentPositions = lookupStatus(evidence.currentPositions);
  } else status.currentPositions = "QUERY_ERROR";
  if (input.currentOpenOrders) {
    const same = input.currentOpenOrders.filter((row) => isSameSymbol(row.symbol, symbol));
    evidence.currentOpenOrders = same.length;
    evidence.mooxCurrentOpenOrders = mooxOrders(same, symbol).length;
    status.currentOpenOrders = lookupStatus(same.length);
  } else status.currentOpenOrders = "QUERY_ERROR";
  if (input.currentStrategies) {
    const same = input.currentStrategies.filter((row) => isSameSymbol(row.symbol, symbol));
    evidence.currentStrategyOrders = same.length;
    evidence.mooxCurrentStrategyOrders = mooxStrategies(same, symbol).length;
    status.currentStrategyOrders = lookupStatus(same.length);
  } else status.currentStrategyOrders = "QUERY_ERROR";

  const readers = [
    ["ordinaryOrders", async () => {
      const rows = await getBitgetDemoHistoricalOrdersWindow(symbol, window.startAt, window.endAt);
      evidence.ordinaryOrders = rows.length;
      evidence.mooxOrdinaryOrders = mooxOrders(rows, symbol).length;
      return evidence.mooxOrdinaryOrders;
    }],
    ["fills", async () => {
      const rows = await getBitgetDemoFillsWindow(symbol, window.startAt, window.endAt);
      evidence.fills = rows.length;
      evidence.mooxFills = mooxFills(rows, symbol).length;
      return evidence.mooxFills;
    }],
    ["historicalStrategyOrders", async () => {
      const rows = await getBitgetDemoHistoricalStrategyOrdersWindow(symbol, window.startAt, window.endAt);
      evidence.historicalStrategyOrders = rows.length;
      evidence.mooxHistoricalStrategyOrders = mooxStrategies(rows, symbol).length;
      return evidence.mooxHistoricalStrategyOrders;
    }],
    ["historicalPositions", async () => {
      const rows = await getBitgetDemoPositionHistoryWindow(symbol, window.startAt, window.endAt);
      evidence.historicalPositions = rows.length;
      evidence.ambiguousPositionChanges = rows.length;
      return rows.length;
    }],
    ["financialRecords", async () => {
      const rows = await getBitgetDemoFinancialRecordsWindow(symbol, window.startAt, window.endAt);
      evidence.financialRecords = rows.length;
      evidence.ambiguousFinancialRecords = rows.length;
      return rows.length;
    }],
  ] as const;

  for (const [key, read] of readers) {
    try {
      const matched = await read();
      status[key] = lookupStatus(matched);
    } catch (error) {
      status[key] = "QUERY_ERROR";
      errors.push(`${key}: ${error instanceof Error ? error.message : "Bitget只读查询失败"}`);
    }
  }

  const evaluation = evaluateLegacyDecisionAudit({
    decisionId: input.row.id,
    symbol,
    updatedAt: originalErrorAt,
    rejectionReason: input.row.rejection_reason,
    clientOid: input.row.client_oid,
    orderId: input.row.bitget_order_id,
    historicalQueryStatus: status,
    evidence,
    queryErrors: errors,
  });

  return {
    decisionId: input.row.id,
    symbol,
    originalErrorAt,
    originalRejectionReason: input.row.rejection_reason,
    clientOid: input.row.client_oid,
    orderId: input.row.bitget_order_id,
    remoteSubmissionPossibility: evaluation.remoteSubmissionPossibility,
    auditWindow: evaluation.auditWindow,
    queryStatus: status,
    evidence,
    queryErrors: evaluation.queryErrors,
    allQueriesSucceeded: evaluation.allQueriesSucceeded,
    foundTradingEvidence: evaluation.foundTradingEvidence,
    safeAsAbsent: evaluation.safeAsAbsent,
    reconciled: false,
    reconciliation: null,
  };
}

function auditReconciledRow(row: LegacyOrderErrorRow): LegacyOrderErrorAuditItem {
  const stored = reconciliationFromRaw(row.raw_payload);
  const audit = stored?.audit;
  const evidence = audit?.evidence ?? defaultEvidence();
  const queryStatus = audit?.queryStatus ?? emptyQueryStatus();
  const originalErrorAt = stored?.originalErrorAt || iso(row.updated_at);
  return {
    decisionId: row.id,
    symbol: String(row.symbol).toUpperCase(),
    originalErrorAt,
    originalRejectionReason: stored?.originalRejectionReason || row.rejection_reason,
    clientOid: row.client_oid,
    orderId: row.bitget_order_id,
    remoteSubmissionPossibility: "UNKNOWN",
    auditWindow: {
      startAt: audit?.startAt || legacyAuditWindow(originalErrorAt).startAt,
      endAt: audit?.endAt || legacyAuditWindow(originalErrorAt).endAt,
    },
    queryStatus,
    evidence,
    queryErrors: audit?.queryErrors ?? [],
    allQueriesSucceeded: audit?.allQueriesSucceeded === true,
    foundTradingEvidence: audit?.absent === true ? false : true,
    safeAsAbsent: audit?.allQueriesSucceeded === true && audit?.absent === true,
    reconciled: stored?.status === "RECONCILED_ABSENT",
    reconciliation: stored,
  };
}

export async function auditLegacyBitgetOrderErrors(limit = 100): Promise<LegacyOrderErrorAuditReport> {
  const rows = await readLegacyRows(limit);
  let currentPositions: Awaited<ReturnType<typeof getBitgetDemoCurrentPositions>> | null = null;
  let currentOpenOrders: Awaited<ReturnType<typeof getBitgetDemoOpenOrders>> | null = null;
  let currentStrategies: Awaited<ReturnType<typeof getBitgetDemoAllPendingStrategyOrders>> | null = null;
  let accountQuerySucceeded = true;
  let accountError = "";
  const currentErrors: string[] = [];
  try {
    await getBitgetRuntimeAccountBalance();
    [currentPositions, currentOpenOrders, currentStrategies] = await Promise.all([
      getBitgetDemoCurrentPositions(),
      getBitgetDemoOpenOrders(),
      getBitgetDemoAllPendingStrategyOrders(),
    ]);
  } catch (error) {
    accountQuerySucceeded = false;
    accountError = error instanceof Error ? error.message : "Bitget账户只读查询失败";
    currentErrors.push(accountError);
  }

  let securityQuerySucceeded = true;
  let withdrawPermission: boolean | null = null;
  try {
    withdrawPermission = (await getBitgetApiSecurity()).withdrawalPermission;
  } catch (error) {
    securityQuerySucceeded = false;
    currentErrors.push(error instanceof Error ? error.message : "API权限只读查询失败");
  }

  const items: LegacyOrderErrorAuditItem[] = [];
  for (const row of rows) {
    const stored = reconciliationFromRaw(row.raw_payload);
    if (row.rejection_code === "LEGACY_RECONCILED" || stored?.status === "RECONCILED_ABSENT") {
      items.push(auditReconciledRow(row));
      continue;
    }
    items.push(await auditUnresolvedRow({ row, currentPositions, currentOpenOrders, currentStrategies, currentErrors }));
  }
  const evaluations: LegacyDecisionAuditEvaluation[] = items.map((item) => ({
    decisionId: item.decisionId,
    symbol: item.symbol,
    originalErrorAt: item.originalErrorAt,
    rejectionReason: item.originalRejectionReason,
    remoteSubmissionPossibility: item.remoteSubmissionPossibility,
    auditWindow: item.auditWindow,
    allQueriesSucceeded: item.allQueriesSucceeded,
    foundTradingEvidence: item.foundTradingEvidence,
    safeAsAbsent: item.safeAsAbsent,
    alreadyReconciled: item.reconciled,
    queryErrors: item.queryErrors,
  }));
  const batch = evaluateLegacyAuditBatch(evaluations);
  const currentUnsafe = !accountQuerySucceeded || (currentPositions?.length ?? 1) > 0 || (currentOpenOrders?.length ?? 1) > 0 || (currentStrategies?.length ?? 1) > 0;
  return {
    checkedAt: new Date().toISOString(),
    readOnly: true,
    deploymentVersion: versionLabel(),
    items,
    current: {
      accountQuerySucceeded,
      accountError,
      positionsCount: currentPositions?.length ?? null,
      openOrdersCount: currentOpenOrders?.length ?? null,
      pendingStrategyOrdersCount: currentStrategies?.length ?? null,
      securityQuerySucceeded,
      withdrawPermission,
    },
    unresolvedCount: batch.unresolvedCount,
    reconciledCount: batch.reconciledCount,
    allHistoricalQueriesSucceeded: batch.allHistoricalQueriesSucceeded,
    foundTradingEvidence: batch.foundTradingEvidence,
    canConfirmLegacyAbsent: batch.canConfirmLegacyAbsent && !currentUnsafe,
    summary: currentUnsafe ? `当前账户/挂单/策略单核对未通过；${batch.summary}` : batch.summary,
  };
}

export async function confirmLegacyBitgetOrderErrorsReconciled(input: {
  confirmation: string;
  admin: { id: string; email: string };
}): Promise<{ ok: true; changed: number; alreadyReconciled: number; report: LegacyOrderErrorAuditReport }> {
  if (!prisma) throw new Error("数据库不可用，不能保存旧版订单错误核对记录");
  const report = await auditLegacyBitgetOrderErrors(100);
  const stored = report.unresolvedCount === 0 && report.reconciledCount > 0
    ? await readStoredLegacyReconciliationState()
    : null;
  const action = decideLegacyConfirmationAction({
    confirmation: input.confirmation,
    unresolvedCount: report.unresolvedCount,
    reconciledCount: report.reconciledCount,
    canConfirmLegacyAbsent: report.canConfirmLegacyAbsent,
    storedReconciliationsValid: Boolean(stored?.allLegacyReconciliationsValid && stored?.allHistoricalQueriesSucceeded),
  });
  if (action === "NOOP_ALREADY_RECONCILED") {
    // Idempotent repeat confirmation: preserve the original immutable evidence and
    // return success without rewriting timestamps, admin identity or audit payload.
    return { ok: true, changed: 0, alreadyReconciled: report.reconciledCount, report };
  }
  if (action !== "WRITE") {
    const phraseIssue = input.confirmation !== LEGACY_RECONCILE_CONFIRMATION_PHRASE
      ? `确认短语不正确。请输入 ${LEGACY_RECONCILE_CONFIRMATION_PHRASE}`
      : `旧版订单错误仍不满足人工确认条件：${report.summary}`;
    throw new Error(phraseIssue);
  }
  const unresolved = report.items.filter((item) => !item.reconciled);
  let changed = 0;
  const confirmedAt = new Date().toISOString();
  for (const item of unresolved) {
    const evidence = {
      status: "RECONCILED_ABSENT",
      deploymentVersion: versionLabel(),
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null,
      confirmedAt,
      confirmedBy: { id: input.admin.id, email: input.admin.email },
      originalErrorAt: item.originalErrorAt,
      originalRejectionReason: item.originalRejectionReason,
      remoteSubmissionPossibility: item.remoteSubmissionPossibility,
      audit: {
        checkedAt: report.checkedAt,
        startAt: item.auditWindow.startAt,
        endAt: item.auditWindow.endAt,
        allQueriesSucceeded: item.allQueriesSucceeded,
        absent: item.safeAsAbsent && !item.foundTradingEvidence,
        evidence: item.evidence,
        queryStatus: item.queryStatus,
        queryErrors: item.queryErrors,
      },
    };
    const result = await prisma.$executeRawUnsafe(
      `UPDATE trade_three_horizon_decisions
          SET rejection_code='LEGACY_RECONCILED',
              raw_payload=jsonb_set(COALESCE(raw_payload,'{}'::jsonb), '{legacyReconciliation}', $2::jsonb, true)
        WHERE id=$1
          AND rejection_code='ORDER_ERROR'
          AND COALESCE(raw_payload->'legacyReconciliation'->>'status','')=''`,
      item.decisionId,
      JSON.stringify(evidence)
    );
    changed += Number(result ?? 0);
  }
  const refreshed = await auditLegacyBitgetOrderErrors(100);
  return { ok: true, changed, alreadyReconciled: refreshed.reconciledCount - changed, report: refreshed };
}

export async function readStoredLegacyReconciliationState(): Promise<{
  unresolvedCount: number;
  reconciledCount: number;
  allLegacyReconciliationsValid: boolean;
  allHistoricalQueriesSucceeded: boolean;
}> {
  const rows = await readLegacyRows(500);
  const unresolved = rows.filter((row) => row.rejection_code === "ORDER_ERROR");
  const reconciled = rows.filter((row) => row.rejection_code === "LEGACY_RECONCILED");
  const valid = reconciled.every((row) => {
    const stored = reconciliationFromRaw(row.raw_payload);
    return stored?.status === "RECONCILED_ABSENT" && stored.audit?.allQueriesSucceeded === true && stored.audit?.absent === true && Boolean(stored.confirmedAt && stored.confirmedBy?.id);
  });
  return {
    unresolvedCount: unresolved.length,
    reconciledCount: reconciled.length,
    allLegacyReconciliationsValid: valid && unresolved.length === 0,
    allHistoricalQueriesSucceeded: valid && unresolved.length === 0,
  };
}
