import "server-only";

import {
  getBitgetApiSecurity,
  getBitgetDemoAllPendingStrategyOrders,
  getBitgetDemoCurrentPositions,
  getBitgetDemoEnvironment,
  getBitgetDemoOpenOrders,
  getBitgetRuntimeAccountBalance,
  auditRecentBitgetLiveOrderFailures,
} from "@/lib/bitget/demo-client";
import { getBitgetRuntimeState } from "@/lib/bitget/demo-runtime";
import { readStoredLegacyReconciliationState } from "@/lib/bitget/legacy-order-reconciliation";
import { evaluateLiveResumeReadiness, resolveExecutionFailureAuditSafety } from "@/lib/bitget/legacy-order-reconciliation-core";

export type BitgetLiveResumeReadiness = {
  checkedAt: string;
  readOnly: true;
  safeToConsiderResume: boolean;
  summary: string;
  checks: ReturnType<typeof evaluateLiveResumeReadiness>["checks"];
  positionsCount: number | null;
  openOrdersCount: number | null;
  pendingStrategyOrdersCount: number | null;
  legacyUnresolvedCount: number;
  legacyReconciledCount: number;
  heartbeatAgeSeconds: number | null;
  quoteAgeSeconds: number | null;
  freshQuotesCount: number;
  totalSymbols: number;
  security: {
    querySucceeded: boolean;
    withdrawalPermission: boolean | null;
    tradingPermission: boolean | null;
    managementPermission: boolean | null;
  };
  executionFailureAudit: {
    querySucceeded: boolean;
    safe: boolean;
    summary: string;
  };
  errors: string[];
};

export async function auditBitgetLiveResumeReadiness(): Promise<BitgetLiveResumeReadiness> {
  const errors: string[] = [];
  const environment = getBitgetDemoEnvironment();
  let positionsCount: number | null = null;
  let openOrdersCount: number | null = null;
  let pendingStrategyOrdersCount: number | null = null;
  let accountQuerySucceeded = true;
  try {
    await getBitgetRuntimeAccountBalance();
    const [positions, openOrders, strategies] = await Promise.all([
      getBitgetDemoCurrentPositions(),
      getBitgetDemoOpenOrders(),
      getBitgetDemoAllPendingStrategyOrders(),
    ]);
    positionsCount = positions.length;
    openOrdersCount = openOrders.length;
    pendingStrategyOrdersCount = strategies.length;
  } catch (error) {
    accountQuerySucceeded = false;
    errors.push(error instanceof Error ? error.message : "Bitget账户/订单只读核对失败");
  }

  let securityQuerySucceeded = true;
  let withdrawalPermission: boolean | null = null;
  let tradingPermission: boolean | null = null;
  let managementPermission: boolean | null = null;
  try {
    const security = await getBitgetApiSecurity();
    withdrawalPermission = security.withdrawalPermission;
    tradingPermission = security.tradingPermission;
    managementPermission = security.managementPermission;
  } catch (error) {
    securityQuerySucceeded = false;
    errors.push(error instanceof Error ? error.message : "Bitget API权限核对失败");
  }

  let legacy = {
    unresolvedCount: 1,
    reconciledCount: 0,
    allLegacyReconciliationsValid: false,
    allHistoricalQueriesSucceeded: false,
  };
  try {
    legacy = await readStoredLegacyReconciliationState();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "旧版订单错误核对记录读取失败");
  }


  let executionFailureAuditSucceeded = true;
  let executionFailureAuditSafe = false;
  let executionFailureAuditSummary = "";
  try {
    const failureAudit = await auditRecentBitgetLiveOrderFailures(100);
    const hasOutstandingExecutionEvidence = failureAudit.items.length > 0 || failureAudit.recentOrderErrorDecisions.length > 0;
    // V7.15.10 deliberately treated an empty legacy audit as fail-closed. After
    // V7.15.13, the ten identifier-less legacy decisions can be converted to
    // immutable RECONCILED_ABSENT evidence, so an otherwise empty old audit is
    // acceptable only when that new reconciliation ledger is fully valid.
    executionFailureAuditSafe = resolveExecutionFailureAuditSafety({
      hasOutstandingExecutionEvidence,
      legacyAuditSafe: failureAudit.safeToConsiderResume,
      legacyUnresolvedCount: legacy.unresolvedCount,
      legacyReconciliationsValid: legacy.allLegacyReconciliationsValid,
      legacyHistoricalQueriesSucceeded: legacy.allHistoricalQueriesSucceeded,
    });
    executionFailureAuditSummary = hasOutstandingExecutionEvidence
      ? failureAudit.summary
      : executionFailureAuditSafe
        ? "旧版失败引用已由V7.15.13不可删除核对记录接管；没有其他待核对执行失败。"
        : "没有可核对的近期失败引用，且旧版人工核对记录尚未完整。";
  } catch (error) {
    executionFailureAuditSucceeded = false;
    executionFailureAuditSafe = false;
    executionFailureAuditSummary = error instanceof Error ? error.message : "最近失败订单/发件箱只读核对失败";
    errors.push(executionFailureAuditSummary);
  }

  let heartbeatAgeSeconds: number | null = null;
  let quoteAgeSeconds: number | null = null;
  let freshQuotesCount = 0;
  let totalSymbols = environment.liveAllowedSymbols.length;
  try {
    const runtime = await getBitgetRuntimeState();
    heartbeatAgeSeconds = runtime.heartbeatAgeSeconds;
    quoteAgeSeconds = runtime.quoteAgeSeconds;
    freshQuotesCount = runtime.freshQuotesCount ?? 0;
    totalSymbols = runtime.totalSymbols ?? totalSymbols;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "服务器运行状态读取失败");
  }

  const heartbeatFresh = heartbeatAgeSeconds != null && heartbeatAgeSeconds <= 180;
  const quotesFresh = quoteAgeSeconds != null && quoteAgeSeconds <= 180 && totalSymbols > 0 && freshQuotesCount >= totalSymbols;
  const evaluation = evaluateLiveResumeReadiness({
    accountQuerySucceeded,
    positionsCount: positionsCount ?? 1,
    openOrdersCount: openOrdersCount ?? 1,
    pendingStrategyOrdersCount: pendingStrategyOrdersCount ?? 1,
    legacyUnresolvedCount: legacy.unresolvedCount,
    allLegacyReconciliationsValid: legacy.allLegacyReconciliationsValid,
    allHistoricalQueriesSucceeded: legacy.allHistoricalQueriesSucceeded,
    heartbeatFresh,
    quotesFresh,
    apiSecurityQuerySucceeded: securityQuerySucceeded,
    withdrawPermission: withdrawalPermission ?? true,
    tradingPermission: tradingPermission ?? false,
    managementPermission: managementPermission ?? false,
    executionFailureAuditSucceeded,
    executionFailureAuditSafe,
  });

  return {
    checkedAt: new Date().toISOString(),
    readOnly: true,
    safeToConsiderResume: evaluation.safeToConsiderResume,
    summary: evaluation.safeToConsiderResume ? evaluation.summary : `${evaluation.summary}${errors.length ? `；${errors.join("；")}` : ""}`,
    checks: evaluation.checks,
    positionsCount,
    openOrdersCount,
    pendingStrategyOrdersCount,
    legacyUnresolvedCount: legacy.unresolvedCount,
    legacyReconciledCount: legacy.reconciledCount,
    heartbeatAgeSeconds,
    quoteAgeSeconds,
    freshQuotesCount,
    totalSymbols,
    security: {
      querySucceeded: securityQuerySucceeded,
      withdrawalPermission,
      tradingPermission,
      managementPermission,
    },
    executionFailureAudit: {
      querySucceeded: executionFailureAuditSucceeded,
      safe: executionFailureAuditSafe,
      summary: executionFailureAuditSummary,
    },
    errors,
  };
}
