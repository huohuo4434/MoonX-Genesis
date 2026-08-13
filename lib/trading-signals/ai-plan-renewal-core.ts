export type ForecastBoundPlanStatus =
  | "PUBLISHED"
  | "WATCHING"
  | "ARMED"
  | "ORDER_SUBMITTED"
  | "PARTIALLY_FILLED"
  | "OPEN"
  | "REDUCED"
  | "CLOSED"
  | "CANCELLED"
  | "EXPIRED"
  | "INVALIDATED"
  | "SUPERSEDED"
  | "EXECUTION_ERROR";

export type ForecastPlanReadiness = "WAITING" | "TRIGGERABLE";

export type LockedForecastBinding = {
  forecastId: string;
  forecastVersion: string;
  horizon: "DAY" | "WEEK" | "MONTH";
  direction: "LONG" | "SHORT";
  publishedAt: string;
  lockedAt: string;
  validFrom: string;
  validUntil: string;
  source: string;
};

export type ForecastBoundStoredPlan = {
  id: string;
  planGroupId: string;
  version: number;
  status: ForecastBoundPlanStatus;
  forecastVersion: string | null;
  forecastPublishedAt: string | null;
  forecastLockedAt: string | null;
  clientOid: string | null;
  bitgetOrderId: string | null;
  submittedAt: string | null;
  firstFillAt: string | null;
};


export function forecastHorizonForStrategy(
  strategyType: "INTRADAY" | "SWING" | "POSITION"
): LockedForecastBinding["horizon"] {
  if (strategyType === "INTRADAY") return "DAY";
  if (strategyType === "SWING") return "WEEK";
  return "MONTH";
}

export type ForecastPlanReconcileResult<TPlan extends ForecastBoundStoredPlan> = {
  plan: TPlan | null;
  action: "CREATED" | "REFRESHED" | "RECOVERED" | "FAIL_CLOSED" | "ORDER_ALREADY_BOUND";
  readiness: ForecastPlanReadiness;
  code: string;
  reason: string;
};

export type ForecastPlanRepository<TPlan extends ForecastBoundStoredPlan> = {
  findByForecastVersion: (forecastVersion: string) => Promise<TPlan | null>;
  findLatest: () => Promise<TPlan | null>;
  create: (input: {
    binding: LockedForecastBinding;
    planGroupId: string;
    version: number;
    readiness: ForecastPlanReadiness;
  }) => Promise<TPlan>;
  refresh: (input: {
    plan: TPlan;
    binding: LockedForecastBinding;
    readiness: ForecastPlanReadiness;
  }) => Promise<TPlan>;
  supersede: (plan: TPlan, reason: string) => Promise<void>;
  isCreateConflict: (error: unknown) => boolean;
  recoverExecutionError?: (input: {
    failedPlan: TPlan;
    binding: LockedForecastBinding;
    readiness: ForecastPlanReadiness;
  }) => Promise<TPlan | null>;
};

export function forecastPlanGroupIdentity(input: {
  strategyType: "INTRADAY" | "SWING" | "POSITION";
  symbol: string;
  horizon: LockedForecastBinding["horizon"];
}): string {
  const symbol = input.symbol.trim().toUpperCase();
  if (!symbol) throw new Error("FORECAST_PLAN_GROUP_SYMBOL_REQUIRED");
  return `forecast:${input.strategyType}:${symbol}:${input.horizon}`;
}

const TERMINAL_NO_REVIVE = new Set<ForecastBoundPlanStatus>([
  "CLOSED",
  "CANCELLED",
  "EXPIRED",
  "INVALIDATED",
  "SUPERSEDED",
]);

const ORDER_BOUND = new Set<ForecastBoundPlanStatus>([
  "ORDER_SUBMITTED",
  "PARTIALLY_FILLED",
  "OPEN",
  "REDUCED",
  "CLOSED",
]);

function timestamp(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateLockedForecastBinding(
  binding: LockedForecastBinding | null,
  now: Date
): { ok: true; readiness: ForecastPlanReadiness } | { ok: false; code: string; reason: string } {
  if (!binding) {
    return {
      ok: false,
      code: "LOCKED_FORECAST_UNAVAILABLE",
      reason: "未找到与当前策略周期匹配的已锁定正式预测版本，计划续生成按fail-closed停止。",
    };
  }
  const nowMs = now.getTime();
  const publishedAt = timestamp(binding.publishedAt);
  const lockedAt = timestamp(binding.lockedAt);
  const validFrom = timestamp(binding.validFrom);
  const validUntil = timestamp(binding.validUntil);
  if (publishedAt == null || lockedAt == null || validFrom == null || validUntil == null) {
    return {
      ok: false,
      code: "LOCKED_FORECAST_METADATA_INVALID",
      reason: "正式预测缺少可校验的发布时间、锁定时间或有效区间，禁止生成实盘计划。",
    };
  }
  if (publishedAt > nowMs || lockedAt > nowMs) {
    return {
      ok: false,
      code: "LOCKED_FORECAST_NOT_YET_LOCKED",
      reason: "预测版本尚未到达正式发布时间或锁定时间，禁止提前生成可执行计划。",
    };
  }
  if (validUntil <= nowMs) {
    return {
      ok: false,
      code: "LOCKED_FORECAST_EXPIRED",
      reason: "最新已锁定预测已经超过有效窗口，旧版本不能复活，等待新的锁定预测。",
    };
  }
  return {
    ok: true,
    readiness: validFrom <= nowMs ? "TRIGGERABLE" : "WAITING",
  };
}

function orderAlreadyBound(plan: ForecastBoundStoredPlan): boolean {
  return ORDER_BOUND.has(plan.status) || Boolean(plan.clientOid || plan.bitgetOrderId || plan.submittedAt || plan.firstFillAt);
}

function canSupersedeWithoutTouchingExecution(plan: ForecastBoundStoredPlan): boolean {
  return !orderAlreadyBound(plan) && ["PUBLISHED", "WATCHING", "ARMED", "EXECUTION_ERROR"].includes(plan.status);
}

export async function reconcileForecastBoundPlan<TPlan extends ForecastBoundStoredPlan>(input: {
  binding: LockedForecastBinding | null;
  now: Date;
  triggerable: boolean;
  strategyType: "INTRADAY" | "SWING" | "POSITION";
  symbol: string;
  repository: ForecastPlanRepository<TPlan>;
}): Promise<ForecastPlanReconcileResult<TPlan>> {
  const validation = validateLockedForecastBinding(input.binding, input.now);
  if (validation.ok === false) {
    return {
      plan: null,
      action: "FAIL_CLOSED",
      readiness: "WAITING",
      code: validation.code,
      reason: validation.reason,
    };
  }
  const binding = input.binding!;
  const readiness: ForecastPlanReadiness = validation.readiness === "TRIGGERABLE" && input.triggerable
    ? "TRIGGERABLE"
    : "WAITING";
  const sameVersion = await input.repository.findByForecastVersion(binding.forecastVersion);
  if (sameVersion) {
    if (orderAlreadyBound(sameVersion)) {
      if (sameVersion.status === "EXECUTION_ERROR" && input.repository.recoverExecutionError) {
        const recovered = await input.repository.recoverExecutionError({
          failedPlan: sameVersion,
          binding,
          readiness,
        });
        if (recovered) {
          return {
            plan: recovered,
            action: "RECOVERED",
            readiness,
            code: "FORECAST_VERSION_COMMISSIONING_RECOVERED",
            reason: "服务器端已完成失败首单的权威只读核对：原订单不存在，且账户无持仓、普通订单或策略保护单；保留原失败计划并创建新的独立重试计划。",
          };
        }
      }
      return {
        plan: sameVersion,
        action: "ORDER_ALREADY_BOUND",
        readiness,
        code: "FORECAST_VERSION_ORDER_ALREADY_BOUND",
        reason: "该预测版本已经绑定过真实/模拟订单生命周期，同一版本同一品种同一周期禁止再次创建首笔订单。",
      };
    }
    if (TERMINAL_NO_REVIVE.has(sameVersion.status)) {
      return {
        plan: sameVersion,
        action: "FAIL_CLOSED",
        readiness: "WAITING",
        code: "FORECAST_VERSION_TERMINAL",
        reason: "该预测版本对应的旧计划已进入终态，禁止复活或复用；等待新的锁定预测版本。",
      };
    }
    const refreshed = await input.repository.refresh({ plan: sameVersion, binding, readiness });
    return {
      plan: refreshed,
      action: "REFRESHED",
      readiness,
      code: "FORECAST_VERSION_REFRESHED",
      reason: "同一锁定预测版本命中既有唯一计划，本轮只刷新状态与技术执行条件，不重复创建计划。",
    };
  }

  const latest = await input.repository.findLatest();
  if (latest && latest.forecastVersion && latest.forecastVersion !== binding.forecastVersion) {
    const latestLockedAt = latest.forecastLockedAt ? timestamp(latest.forecastLockedAt) : null;
    const latestPublishedAt = latest.forecastPublishedAt ? timestamp(latest.forecastPublishedAt) : null;
    const incomingLockedAt = timestamp(binding.lockedAt);
    const incomingPublishedAt = timestamp(binding.publishedAt);
    const latestChronology = latestLockedAt ?? latestPublishedAt;
    const incomingChronology = incomingLockedAt ?? incomingPublishedAt;
    if (latestChronology != null && incomingChronology != null && incomingChronology < latestChronology) {
      return {
        plan: latest,
        action: "FAIL_CLOSED",
        readiness: "WAITING",
        code: "STALE_FORECAST_VERSION",
        reason: "收到的锁定预测版本早于当前已记录版本，旧版本禁止回滚复活。",
      };
    }
    if (canSupersedeWithoutTouchingExecution(latest)) {
      await input.repository.supersede(latest, `新的锁定预测版本${binding.forecastVersion}已生效，旧计划保留审计但不再用于新开仓。`);
    }
  }
  let created: TPlan;
  try {
    created = await input.repository.create({
      binding,
      planGroupId: latest?.planGroupId ?? forecastPlanGroupIdentity({
        strategyType: input.strategyType,
        symbol: input.symbol,
        horizon: binding.horizon,
      }),
      version: latest ? latest.version + 1 : 1,
      readiness,
    });
  } catch (error) {
    if (!input.repository.isCreateConflict(error)) throw error;
    const authoritative = await input.repository.findByForecastVersion(binding.forecastVersion);
    return {
      plan: authoritative,
      action: "FAIL_CLOSED",
      readiness: "WAITING",
      code: authoritative ? "CONCURRENT_PLAN_CREATE_RECONCILED" : "PLAN_CREATE_CONFLICT_UNRESOLVED",
      reason: authoritative
        ? "并发任务已创建同一预测版本计划；本次仅权威重读并停止执行，下一轮再刷新技术状态，禁止重复下单。"
        : "计划创建发生唯一键冲突，但权威重读未找到同一预测版本；本轮fail-closed，禁止下单。",
    };
  }
  return {
    plan: created,
    action: "CREATED",
    readiness,
    code: readiness === "TRIGGERABLE" ? "NEW_FORECAST_PLAN_TRIGGERABLE" : "NEW_FORECAST_PLAN_WAITING",
    reason: readiness === "TRIGGERABLE"
      ? "检测到新的已锁定且已进入有效期的预测版本，已幂等创建可等待技术触发的唯一计划。"
      : "检测到新的已锁定预测版本，已提前创建WAITING计划；到达有效期前禁止执行。",
  };
}

export function prioritizeAllowedCommissioningSymbols<T extends string>(
  allowedSymbols: readonly T[],
  preferredSymbols: readonly T[]
): T[] {
  const allowed = Array.from(new Set(allowedSymbols));
  const allowedSet = new Set<T>(allowed);
  const preferred = preferredSymbols.filter((symbol) => allowedSet.has(symbol));
  return Array.from(new Set<T>([...preferred, ...allowed]));
}
