export const LIVE_COMMISSIONING_RECOVERY_AUDIT_TIMEOUT_MS = 8_000;

export type LiveCommissioningStoredFailure = {
  outboxId: string;
  decisionId: string | null;
  symbol: string;
  action: string;
  status: string;
  clientOid: string | null;
  failureStage: string;
  remoteSubmissionAttempted: boolean | null;
};

export type LiveCommissioningRecoveryEvidence = {
  checkedAt: string;
  outboxId: string;
  decisionId: string;
  clientOid: string;
  failureStage: string;
  remoteSubmissionAttempted: false;
  orderLookup: "ABSENT";
  positionsCount: 0;
  openOrdersCount: 0;
  pendingStrategyOrdersCount: 0;
};

type RecoveryAuditDependencies = {
  loadStoredFailures: () => Promise<LiveCommissioningStoredFailure[]>;
  getPositions: () => Promise<Array<{ symbol: string; total: number }>>;
  getOpenOrders: () => Promise<unknown[]>;
  getPendingStrategyOrders: () => Promise<unknown[]>;
  lookupExactOrder: () => Promise<{ orderId?: string | null } | null>;
  now?: () => Date;
};

async function withinAuditBudget<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("LIVE_COMMISSIONING_RECOVERY_AUDIT_TIMEOUT")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Bounded, read-only proof for retrying one commissioning failure. Every
 * dependency is required and runs inside one shared wall-clock budget. A
 * timeout, rejected read, duplicate stored reference, or non-empty exchange
 * state fails closed by returning null.
 */
export async function auditLiveCommissioningRecoveryCore(input: {
  decisionId: string;
  clientOid: string;
  symbol: string;
  timeoutMs?: number;
}, dependencies: RecoveryAuditDependencies): Promise<LiveCommissioningRecoveryEvidence | null> {
  const timeoutMs = Math.max(1, Math.min(
    LIVE_COMMISSIONING_RECOVERY_AUDIT_TIMEOUT_MS,
    Math.floor(input.timeoutMs ?? LIVE_COMMISSIONING_RECOVERY_AUDIT_TIMEOUT_MS)
  ));

  try {
    const [storedFailures, positions, openOrders, strategies, exactOrder] = await withinAuditBudget(
      Promise.all([
        dependencies.loadStoredFailures(),
        dependencies.getPositions(),
        dependencies.getOpenOrders(),
        dependencies.getPendingStrategyOrders(),
        dependencies.lookupExactOrder(),
      ]),
      timeoutMs
    );

    if (storedFailures.length !== 1) return null;
    const stored = storedFailures[0];
    if (
      !stored ||
      stored.outboxId.length === 0 ||
      stored.decisionId !== input.decisionId ||
      stored.clientOid !== input.clientOid ||
      stored.symbol !== input.symbol ||
      stored.action !== "OPEN_MARKET" ||
      stored.status !== "FAILED" ||
      stored.remoteSubmissionAttempted !== false ||
      stored.failureStage === "AMBIGUOUS_WRITE" ||
      exactOrder !== null ||
      positions.some((position) => Number(position.total) !== 0) ||
      openOrders.length !== 0 ||
      strategies.length !== 0
    ) {
      return null;
    }

    return {
      checkedAt: (dependencies.now?.() ?? new Date()).toISOString(),
      outboxId: stored.outboxId,
      decisionId: input.decisionId,
      clientOid: input.clientOid,
      failureStage: stored.failureStage,
      remoteSubmissionAttempted: false,
      orderLookup: "ABSENT",
      positionsCount: 0,
      openOrdersCount: 0,
      pendingStrategyOrdersCount: 0,
    };
  } catch {
    return null;
  }
}
