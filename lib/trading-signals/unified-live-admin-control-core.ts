import type { UnifiedLiveMode } from "@/types/unified-live-trading";

export type UnifiedLiveRestoreBlocker = {
  code: string;
  severity: "BLOCKER";
  message: string;
  detail?: string;
};

export type UnifiedLiveRestoreReadiness = {
  runtimeModeLive: boolean;
  liveSwitchAllowed: boolean;
  environmentAllowsNewEntries: boolean;
  positionManagementEnabled: boolean;
  bitgetLiveExperiment: boolean;
  liveExperiment?: { status: string; startedAt: Date | string | null; endsAt: Date | string | null } | null;
  bitgetConfigured: boolean;
  bitgetExecutionAllowed: boolean;
  bitgetLiveConfirmationAccepted: boolean;
  initialCapitalIs1000U: boolean;
  strategyActiveExecutionEnabled: boolean;
  migrationRequired: boolean;
  custodyFreezeNewEntries: boolean;
  custodyIssues?: Array<{ code?: string; severity?: string; detail?: string }>;
};

export function buildUnifiedLiveRestoreBlockers(
  input: UnifiedLiveRestoreReadiness,
  now = new Date(),
): UnifiedLiveRestoreBlocker[] {
  const blockers: UnifiedLiveRestoreBlocker[] = [];
  const add = (code: string, message: string, detail?: string) => {
    blockers.push({ code, severity: "BLOCKER", message, ...(detail ? { detail } : {}) });
  };

  if (!input.runtimeModeLive) add("RUNTIME_MODE_NOT_LIVE", "服务器实盘运行模式尚未启用");
  if (!input.liveSwitchAllowed) add("LIVE_SWITCH_NOT_ALLOWED", "服务器未开放人工恢复LIVE");
  if (!input.environmentAllowsNewEntries) add("ENV_NEW_ENTRIES_DISABLED", "服务器环境仍禁止新开仓");
  if (!input.positionManagementEnabled) add("POSITION_MANAGEMENT_DISABLED", "已有仓位托管未启用");
  if (!input.bitgetLiveExperiment) add("BITGET_MODE_NOT_LIVE_EXPERIMENT", "Bitget当前不是1000U实盘实验模式");
  if (input.bitgetLiveExperiment) {
    const experiment = input.liveExperiment;
    const start = experiment?.startedAt ? new Date(experiment.startedAt).getTime() : NaN;
    const end = experiment?.endsAt ? new Date(experiment.endsAt).getTime() : NaN;
    if (!experiment) {
      add("LIVE_EXPERIMENT_UNAVAILABLE", "实盘实验状态未取得，暂不能开启；请稍后重新读取。");
    } else if (experiment.status === "COMPLETED" || (Number.isFinite(end) && end <= now.getTime())) {
      add("LIVE_EXPERIMENT_EXPIRED", "实盘实验已到期，自动新开仓尚未恢复。需要单独确认新的实验周期；重复点击开启不会续期。");
    } else if (experiment.status === "STOPPED") {
      add("LIVE_EXPERIMENT_STOPPED", "实盘实验已停止，需先核查停止原因；开启按钮不会重置实验。");
    } else if (experiment.status === "NOT_STARTED") {
      add("LIVE_EXPERIMENT_NOT_STARTED", "实盘实验尚未启动，需先完成实验周期配置。");
    } else if (experiment.status !== "ACTIVE" || !Number.isFinite(start) || !Number.isFinite(end)
      || !Number.isFinite(now.getTime()) || start >= end) {
      add("LIVE_EXPERIMENT_INVALID", "实盘实验状态或起止时间无效，暂不能开启。");
    } else if (start > now.getTime()) {
      add("LIVE_EXPERIMENT_NOT_DUE", "尚未到达实盘实验开始时间，暂不能开启。");
    }
  }
  if (!input.bitgetConfigured) add("BITGET_CREDENTIALS_MISSING", "Bitget交易凭据未完整配置");
  if (!input.bitgetExecutionAllowed) add("BITGET_EXECUTION_DISABLED", "Bitget实盘执行许可未通过");
  if (!input.bitgetLiveConfirmationAccepted) add("BITGET_LIVE_CONFIRMATION_MISSING", "Bitget实盘确认尚未生效");
  if (!input.initialCapitalIs1000U) add("LIVE_CAPITAL_NOT_1000U", "实盘实验本金配置不是精确1000U");
  if (!input.strategyActiveExecutionEnabled) add("TRADING_CONTROL_MODE_BLOCKED", "交易控制模式当前不允许新开仓");
  if (input.migrationRequired) add("UNIFIED_LIVE_MIGRATION_REQUIRED", "统一实盘数据库迁移尚未完成");

  if (input.custodyFreezeNewEntries) {
    const custodyBlockers = (input.custodyIssues ?? []).filter((item) => item.severity === "BLOCKER");
    if (custodyBlockers.length) {
      for (const issue of custodyBlockers) {
        add(issue.code || "CUSTODY_BLOCKER_PRESENT", "托管对账存在阻断项", issue.detail);
      }
    } else {
      add("CUSTODY_BLOCKER_PRESENT", "托管对账冻结了新开仓");
    }
  }

  return blockers;
}

export async function applyUnifiedLiveModeChange<TAccount>(input: {
  mode: UnifiedLiveMode;
  confirmation?: unknown;
  readiness: UnifiedLiveRestoreReadiness;
  apply: (mode: UnifiedLiveMode) => Promise<TAccount>;
}): Promise<
  | { ok: true; account: TAccount }
  | { ok: false; error: "LIVE_CONFIRMATION_REQUIRED" | "LIVE_SWITCH_BLOCKED"; blockers: UnifiedLiveRestoreBlocker[] }
> {
  if (input.mode === "LIVE" && input.confirmation !== "LIVE1000") {
    return { ok: false, error: "LIVE_CONFIRMATION_REQUIRED", blockers: [] };
  }

  const blockers = input.mode === "LIVE" ? buildUnifiedLiveRestoreBlockers(input.readiness) : [];
  if (blockers.length) return { ok: false, error: "LIVE_SWITCH_BLOCKED", blockers };

  return { ok: true, account: await input.apply(input.mode) };
}
