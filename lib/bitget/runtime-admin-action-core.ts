import { LIVE_RESUME_CONFIRMATION_PHRASE } from "./legacy-order-reconciliation-core";

export type RuntimeAdminAction = "RUN_NOW" | "PAUSE" | "RESUME";

export type RuntimeControlState = {
  paused: boolean;
  pauseSource?: string;
  pauseReason?: string;
  consecutiveOrderErrors?: number;
};

export type RuntimeResumeAuditSummary = {
  safeToConsiderResume: boolean;
  summary: string;
  positionsCount: number | null;
  pendingStrategyOrdersCount: number | null;
  openOrdersCount?: number | null;
  legacyUnresolvedCount?: number;
};

export type RuntimeAdminActionGateResult<TState extends RuntimeControlState> = {
  allowed: boolean;
  handled: boolean;
  status: 200 | 409;
  state: TState;
  error?: string;
  audit?: RuntimeResumeAuditSummary;
};

export async function guardRuntimeAdminAction<TState extends RuntimeControlState>(input: {
  action: RuntimeAdminAction;
  pauseReason?: string;
  resumeConfirmation?: string;
  strictResumeGate?: boolean;
  getState: () => Promise<TState>;
  setPaused: (paused: boolean, reason?: string) => Promise<TState>;
  auditFailures: () => Promise<RuntimeResumeAuditSummary>;
}): Promise<RuntimeAdminActionGateResult<TState>> {
  const current = await input.getState();

  if (input.action === "RUN_NOW") {
    if (current.paused) {
      return {
        allowed: false,
        handled: true,
        status: 409,
        state: current,
        error: current.pauseSource === "AUTO_ORDER"
          ? "AUTO_ORDER暂停期间禁止RUN_NOW。请先完成服务器只读失败订单核对。"
          : "服务器当前处于暂停状态，暂停期间禁止RUN_NOW。",
      };
    }
    return { allowed: true, handled: false, status: 200, state: current };
  }

  if (input.action === "PAUSE") {
    if (current.paused) {
      return { allowed: true, handled: true, status: 200, state: current };
    }
    const next = await input.setPaused(true, input.pauseReason || "管理员手动暂停");
    return { allowed: true, handled: true, status: 200, state: next };
  }

  if (!current.paused) {
    return { allowed: true, handled: true, status: 200, state: current };
  }

  const requiresHardGate = Boolean(input.strictResumeGate) || current.pauseSource === "AUTO_ORDER";
  if (requiresHardGate) {
    if (input.resumeConfirmation !== LIVE_RESUME_CONFIRMATION_PHRASE) {
      return {
        allowed: false,
        handled: true,
        status: 409,
        state: current,
        error: `恢复确认短语不正确。请输入 ${LIVE_RESUME_CONFIRMATION_PHRASE}`,
      };
    }
    const audit = await input.auditFailures();
    if (!audit.safeToConsiderResume) {
      return {
        allowed: false,
        handled: true,
        status: 409,
        state: current,
        audit,
        error: `恢复被服务器安全门拒绝：${audit.summary}`,
      };
    }
    const next = await input.setPaused(false);
    return { allowed: true, handled: true, status: 200, state: next, audit };
  }

  const next = await input.setPaused(false);
  return { allowed: true, handled: true, status: 200, state: next };
}
