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
    // PAUSE must be idempotent. Re-pausing an AUTO_ORDER/AUTO_API state must never
    // rewrite pauseSource/pauseReason or error counters to MANUAL. Otherwise a
    // later RESUME could bypass the server-side recovery audit.
    if (current.paused) {
      return { allowed: true, handled: true, status: 200, state: current };
    }
    const next = await input.setPaused(true, input.pauseReason || "管理员手动暂停");
    return { allowed: true, handled: true, status: 200, state: next };
  }

  if (!current.paused) {
    return {
      allowed: true,
      handled: true,
      status: 200,
      state: current,
    };
  }

  if (current.pauseSource === "AUTO_ORDER") {
    const audit = await input.auditFailures();
    if (!audit.safeToConsiderResume) {
      return {
        allowed: false,
        handled: true,
        status: 409,
        state: current,
        audit,
        error: `AUTO_ORDER恢复被服务器安全门拒绝：${audit.summary}`,
      };
    }
    const next = await input.setPaused(false);
    return { allowed: true, handled: true, status: 200, state: next, audit };
  }

  const next = await input.setPaused(false);
  return { allowed: true, handled: true, status: 200, state: next };
}
