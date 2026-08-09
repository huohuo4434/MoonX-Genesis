export type AuditOrderLookup = "FOUND" | "ABSENT" | "NOT_CHECKED" | "QUERY_ERROR";

export type FailureAuditOutboxRow = {
  id: string;
  decisionId: string | null;
  symbol: string;
  action: string;
  status: string;
  clientOid: string | null;
  bitgetOrderId: string | null;
  attemptCount: number;
  failureStage: string;
  bitgetCode: string | null;
  httpStatus: number | null;
  remoteSubmissionAttempted: boolean | null;
  lastError: string;
  updatedAt: string;
};

export type FailureAuditDecisionRow = {
  id: string;
  symbol: string;
  status: string;
  rejectionCode: string;
  rejectionReason: string;
  clientOid: string | null;
  bitgetOrderId: string | null;
  updatedAt: string;
};

export type FailureAuditPosition = { symbol: string; total: number };
export type FailureAuditStrategy = { symbol: string; clientOid?: string | null; orderId?: string | null };
export type FailureAuditOrder = { orderId?: string | null; clientOid?: string | null; orderStatus?: string | null };

export type FailureAuditMergedItem = {
  auditKey: string;
  source: "OUTBOX" | "DECISION" | "MERGED";
  outboxId: string;
  decisionId: string | null;
  symbol: string;
  action: string;
  status: string;
  clientOid: string | null;
  bitgetOrderId: string | null;
  attemptCount: number;
  failureStage: string;
  bitgetCode: string | null;
  httpStatus: number | null;
  remoteSubmissionAttempted: boolean | null;
  lastError: string;
  updatedAt: string;
  orderLookup: AuditOrderLookup;
  orderStatus: string | null;
  positionPresent: boolean;
  strategyOrderPresent: boolean;
  queryError: string | null;
  legacyUnverifiedRemotePossible: boolean;
};

function referenceKey(input: { clientOid?: string | null; bitgetOrderId?: string | null }, fallback: string): string {
  if (input.clientOid) return `client:${input.clientOid}`;
  if (input.bitgetOrderId) return `order:${input.bitgetOrderId}`;
  return fallback;
}

function laterIso(a: string, b: string): string {
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

export async function auditFailureReferencesCore(input: {
  outboxRows: FailureAuditOutboxRow[];
  decisionRows: FailureAuditDecisionRow[];
  positions: FailureAuditPosition[] | null;
  strategies: FailureAuditStrategy[] | null;
  accountQueryError?: string;
  lookupOrder: (ref: { clientOid?: string; orderId?: string }) => Promise<FailureAuditOrder | null>;
}): Promise<{
  items: FailureAuditMergedItem[];
  safeToConsiderResume: boolean;
  summary: string;
}> {
  const merged = new Map<string, FailureAuditMergedItem>();
  const findExistingByReference = (ref: { clientOid?: string | null; bitgetOrderId?: string | null }) =>
    [...merged.values()].find((item) =>
      Boolean(
        (ref.clientOid && item.clientOid === ref.clientOid) ||
        (ref.bitgetOrderId && item.bitgetOrderId === ref.bitgetOrderId)
      )
    );

  for (const row of input.outboxRows) {
    const key = referenceKey(row, `outbox:${row.id}`);
    merged.set(key, {
      auditKey: key,
      source: "OUTBOX",
      outboxId: row.id,
      decisionId: row.decisionId,
      symbol: row.symbol,
      action: row.action,
      status: row.status,
      clientOid: row.clientOid,
      bitgetOrderId: row.bitgetOrderId,
      attemptCount: row.attemptCount,
      failureStage: row.failureStage,
      bitgetCode: row.bitgetCode,
      httpStatus: row.httpStatus,
      remoteSubmissionAttempted: row.remoteSubmissionAttempted,
      lastError: row.lastError,
      updatedAt: row.updatedAt,
      orderLookup: "NOT_CHECKED",
      orderStatus: null,
      positionPresent: false,
      strategyOrderPresent: false,
      queryError: null,
      legacyUnverifiedRemotePossible: false,
    });
  }

  for (const row of input.decisionRows) {
    const key = referenceKey(row, `decision:${row.id}`);
    // The execution outbox is created with decisionId=current.id. Legacy ORDER_ERROR
    // decisions may not carry clientOid/orderId even though their matching outbox does.
    // Merge by decisionId first so the auditable outbox reference is inherited; only
    // then fall back to clientOid/orderId matching.
    const existingByDecisionId = [...merged.values()].find((item) => item.decisionId === row.id);
    const existing = existingByDecisionId ?? findExistingByReference(row) ?? merged.get(key);
    if (existing) {
      existing.source = "MERGED";
      existing.decisionId = existing.decisionId || row.id;
      existing.symbol = existing.symbol || row.symbol;
      existing.clientOid = existing.clientOid || row.clientOid;
      existing.bitgetOrderId = existing.bitgetOrderId || row.bitgetOrderId;
      existing.lastError = existing.lastError || row.rejectionReason;
      existing.updatedAt = laterIso(existing.updatedAt, row.updatedAt);
      continue;
    }
    merged.set(key, {
      auditKey: key,
      source: "DECISION",
      outboxId: `decision:${row.id}`,
      decisionId: row.id,
      symbol: row.symbol,
      action: "LEGACY_ORDER_ERROR",
      status: row.status,
      clientOid: row.clientOid,
      bitgetOrderId: row.bitgetOrderId,
      attemptCount: 0,
      failureStage: "LEGACY_ORDER_ERROR",
      bitgetCode: null,
      httpStatus: null,
      remoteSubmissionAttempted: null,
      lastError: row.rejectionReason,
      updatedAt: row.updatedAt,
      orderLookup: "NOT_CHECKED",
      orderStatus: null,
      positionPresent: false,
      strategyOrderPresent: false,
      queryError: null,
      legacyUnverifiedRemotePossible: !row.clientOid && !row.bitgetOrderId,
    });
  }

  const items = [...merged.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const positions = input.positions;
  const strategies = input.strategies;

  for (const item of items) {
    item.positionPresent = Boolean(positions?.some((position) => position.symbol === item.symbol && position.total > 0));
    item.strategyOrderPresent = Boolean(strategies?.some((strategy) =>
      strategy.symbol === item.symbol && Boolean(
        (item.clientOid && strategy.clientOid === item.clientOid) ||
        (item.bitgetOrderId && strategy.orderId === item.bitgetOrderId)
      )
    ));

    if (item.clientOid || item.bitgetOrderId) {
      try {
        const order = await input.lookupOrder({
          ...(item.bitgetOrderId ? { orderId: item.bitgetOrderId } : {}),
          ...(item.clientOid ? { clientOid: item.clientOid } : {}),
        });
        if (order?.orderId) {
          item.orderLookup = "FOUND";
          item.orderStatus = String(order.orderStatus ?? "unknown");
        } else {
          item.orderLookup = "ABSENT";
        }
      } catch (error) {
        item.orderLookup = "QUERY_ERROR";
        item.queryError = error instanceof Error ? error.message : "order-info查询失败";
      }
    } else if (item.source === "DECISION" || item.failureStage === "LEGACY_ORDER_ERROR") {
      item.orderLookup = "NOT_CHECKED";
      item.legacyUnverifiedRemotePossible = true;
    } else if (item.remoteSubmissionAttempted === false) {
      item.orderLookup = "NOT_CHECKED";
    }
  }

  const accountQueryError = String(input.accountQueryError ?? "");
  const globalStateSafe = !accountQueryError && positions != null && strategies != null && positions.length === 0 && strategies.length === 0;
  const eachFailureVerifiedSafe = items.length > 0 && items.every((item) => {
    if (item.positionPresent || item.strategyOrderPresent || item.queryError) return false;
    if (item.legacyUnverifiedRemotePossible) return false;
    if (item.orderLookup === "FOUND" || item.orderLookup === "QUERY_ERROR") return false;
    if (item.orderLookup === "ABSENT") return true;
    return item.remoteSubmissionAttempted === false && item.source !== "DECISION";
  });
  const safeToConsiderResume = globalStateSafe && eachFailureVerifiedSafe;

  let summary: string;
  if (accountQueryError) {
    summary = `只读核对未完成：${accountQueryError}`;
  } else if (items.length === 0) {
    summary = "AUTO_ORDER暂停存在，但没有找到可核对的失败订单证据；保持暂停。";
  } else if (safeToConsiderResume) {
    summary = `已合并核对${items.length}条失败订单/ORDER_ERROR引用：未发现现存订单、持仓或策略单。仅表示可以由管理员进一步考虑恢复，不会自动恢复。`;
  } else {
    summary = "核对发现现存订单/持仓/策略单、查询失败，或存在无法用clientOid/orderId核对的旧ORDER_ERROR；保持暂停。";
  }

  return { items, safeToConsiderResume, summary };
}
