"use client";
// MOOX_V720110_FAST_STATUS_UI: tolerate bounded exchange snapshots and never render fake red blockers before status loads.
// MOOX_V720108_LIVE_ACTIVATION_UI: render migration/env/exchange/cron/account activation steps without false key alarms.
// MOOX_V720106_LIVE_HEARTBEAT_UI: separate minute-runner heartbeat from three-horizon scan freshness.

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";

type Setting = {
  horizon: "SHORT" | "MEDIUM" | "LONG";
  enabled: boolean;
  sizingMode: "FIXED_MARGIN" | "EQUITY_PERCENT" | "FIXED_NOTIONAL" | "RISK_PERCENT";
  sizingValue: number;
  leverage: number;
  maxOpenPositions: number;
  maxLossPercent: number;
  dailyLossPercent: number;
  weeklyLossPercent: number;
  maxMarginUsePercent: number;
  target1ReducePercent: number;
  isolatedMargin: true;
};

type LivePosition = {
  source?: string;
  id?: string;
  symbol?: string;
  horizon?: string | null;
  side?: string;
  status?: string;
  quantity?: number;
  leverage?: number;
  marginMode?: string | null;
  entryPrice?: number;
  markPrice?: number | null;
  unrealizedPnlUsdt?: number | null;
  profitRate?: number | null;
  stopPrice?: number | null;
  target1?: number | null;
  target2?: number | null;
  openedAt?: string | null;
  lastManagedAt?: string | null;
};

type TradePlan = {
  id?: string;
  strategyType?: string;
  horizon?: string;
  strategyLabel?: string;
  symbol?: string;
  status?: string;
  direction?: string;
  confidence?: number;
  currentPrice?: number | null;
  entryPrice?: number | null;
  stopLoss?: number | null;
  target1?: number | null;
  target2?: number | null;
  conditionsMet?: number;
  conditionsTotal?: number;
  unmetConditions?: string[];
  rejectionCode?: string;
  rejectionReason?: string;
  expiresAt?: string | null;
  updatedAt?: string;
};

type ExecutionRow = {
  id?: string;
  strategyType?: string;
  horizon?: string;
  symbol?: string;
  status?: string;
  direction?: string;
  confidence?: number;
  entryPrice?: number | null;
  stopLoss?: number | null;
  target1?: number | null;
  target2?: number | null;
  quantity?: number | null;
  riskAmountUsdt?: number | null;
  openedAt?: string | null;
  closedAt?: string | null;
  realizedPnlUsdt?: number | null;
  rejectionReason?: string;
  updatedAt?: string;
};

type ClosedPosition = {
  positionId?: string;
  symbol?: string;
  side?: string;
  openPrice?: number;
  closePrice?: number;
  quantity?: number;
  netProfitUsdt?: number;
  realizedPnlUsdt?: number;
  openedAt?: string | null;
  closedAt?: string | null;
};

type OfficialFeed = {
  state?: "LIVE_POSITION_OPEN" | "READY_WAITING_TRIGGER" | "BLOCKED" | string;
  generatedAt?: string;
  lastScanAt?: string | null;
  runnerFresh?: boolean;
  lastScanAgeSeconds?: number | null;
  runtimeHeartbeat?: {
    serverHealthy?: boolean;
    paused?: boolean;
    pauseReason?: string;
    cronSecretConfigured?: boolean;
    lastHeartbeatAt?: string | null;
    heartbeatAgeSeconds?: number | null;
    lastStrategyAt?: string | null;
    lastOrderAttemptAt?: string | null;
    lastOrderSuccessAt?: string | null;
    lastError?: string;
  } | null;
  exchangeSnapshotAvailable?: boolean;
  positions?: LivePosition[];
  recentClosedPositions?: ClosedPosition[];
  plans?: TradePlan[];
  recentExecutions?: ExecutionRow[];
  diagnosis?: string[];
  today?: {
    scansToday?: number;
    readyToday?: number;
    orderAttemptsToday?: number;
    openedToday?: number;
  };
};

type ActivationStatus = {
  version?: string;
  targetMigration?: string;
  databaseReady?: boolean;
  strategyDatabaseReady?: boolean;
  environmentReady?: boolean;
  exchangeReadOnlyAttempted?: boolean;
  exchangeReadOnlyReady?: boolean;
  cronReady?: boolean;
  custodyReady?: boolean;
  custodyAuditAuthoritative?: boolean;
  eligibleForServerPreflight?: boolean;
  readyForAccountSwitch?: boolean;
  accountLiveEnabled?: boolean;
  liveConfigured?: boolean;
  fullyLive?: boolean;
  missingEnv?: string[];
  envChecks?: Array<{ name?: string; ok?: boolean; expected?: string; secret?: boolean }>;
};

type LiveStatusPayload = {
  migrationRequired?: boolean;
  scope?: "OFFICIAL" | "MEMBER";
  officialControl?: boolean;
  localAgentRequired?: boolean;
  experimentCapitalUsdt?: number;
  activation?: ActivationStatus;
  account?: {
    mode?: string;
    newEntriesEnabled?: boolean;
    positionManagementEnabled?: boolean;
    settings?: Setting[];
    slices?: Array<Record<string, unknown>>;
  } | null;
  newEntryGate?: { allowed?: boolean; reasons?: string[]; mode?: string };
  runtimeConfig?: {
    mode?: string;
    allowLiveSwitch?: boolean;
    allowNewEntriesByEnv?: boolean;
    positionManagementEnabled?: boolean;
  };
  bitgetReadiness?: {
    mode?: string;
    configured?: boolean;
    executionAllowed?: boolean;
    liveConfirmationAccepted?: boolean;
    initialCapitalUsdt?: number;
    maxPositionNotionalUsdt?: number;
    maxConcurrentPositions?: number;
    maxTradesPerDay?: number;
    strategyActiveExecutionEnabled?: boolean;
  };
  officialFeed?: OfficialFeed;
  strategyDiagnostics?: {
    generatedAt?: string;
    databaseReady?: boolean;
    executionEnvironmentAllowed?: boolean;
    risk?: {
      blocked?: boolean;
      blockReason?: string;
      dailyLossPct?: number;
      weeklyLossPct?: number;
      openRiskPct?: number;
      availableUsdt?: number | null;
    };
    horizons?: Array<{
      strategyType?: "INTRADAY" | "SWING" | "POSITION";
      label?: string;
      lastScanAt?: string | null;
      stats?: {
        scansToday?: number;
        symbolsEvaluatedToday?: number;
        readyToday?: number;
        blockedToday?: number;
        orderAttemptsToday?: number;
        openedToday?: number;
      } | null;
      recent?: Array<{
        symbol?: string;
        status?: string;
        direction?: string;
        rejectionReason?: string;
        updatedAt?: string;
      }>;
    }>;
  } | null;
};

const labels = { SHORT: "短线 2—6小时", MEDIUM: "中线 1—7天", LONG: "长线 1—4周" } as const;
const horizonName: Record<string, string> = { INTRADAY: "短线", SWING: "中线", POSITION: "长线", SHORT: "短线", MEDIUM: "中线", LONG: "长线" };
const defaultSettings: Setting[] = [
  { horizon: "SHORT", enabled: true, sizingMode: "FIXED_MARGIN", sizingValue: 200, leverage: 2, maxOpenPositions: 2, maxLossPercent: 0.35, dailyLossPercent: 1, weeklyLossPercent: 2.5, maxMarginUsePercent: 20, target1ReducePercent: 30, isolatedMargin: true },
  { horizon: "MEDIUM", enabled: true, sizingMode: "EQUITY_PERCENT", sizingValue: 8, leverage: 2, maxOpenPositions: 2, maxLossPercent: 0.5, dailyLossPercent: 1, weeklyLossPercent: 2.5, maxMarginUsePercent: 25, target1ReducePercent: 35, isolatedMargin: true },
  { horizon: "LONG", enabled: true, sizingMode: "EQUITY_PERCENT", sizingValue: 10, leverage: 1, maxOpenPositions: 2, maxLossPercent: 0.4, dailyLossPercent: 1, weeklyLossPercent: 2.5, maxMarginUsePercent: 25, target1ReducePercent: 30, isolatedMargin: true },
];

function gateReasonLabel(reason: string) {
  const labelsByReason: Record<string, string> = {
    UNIFIED_LIVE_MIGRATION_REQUIRED: "实盘数据库迁移尚未完成",
    UNIFIED_LIVE_ACCOUNT_UNAVAILABLE: "官方实盘账户记录尚未建立",
    RUNTIME_MODE_MANAGE_ONLY: "Vercel 环境仍为 MANAGE_ONLY",
    RUNTIME_MODE_PAUSED: "Vercel 环境处于 PAUSED",
    ENV_NEW_ENTRIES_DISABLED: "Vercel 环境未允许新开仓",
    ACCOUNT_NEW_ENTRIES_DISABLED: "官方账户尚未点击启用实盘",
    POSITION_MANAGEMENT_DISABLED: "已有仓位托管没有启用",
    CUSTODY_BLOCKER_PRESENT: "交易所持仓/保护单对账存在阻断项",
    LEGACY_STRATEGY_EXECUTION_DISABLED: "策略执行兼容开关被显式关闭（MOOX_LIVE_ACTIVE_EXECUTION_V641=false）",
  };
  return labelsByReason[reason] ?? reason;
}

function fmt(value: unknown, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function fmtTime(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString();
}

function directionLabel(value?: string) {
  if (value === "LONG") return "做多";
  if (value === "SHORT") return "做空";
  return value || "—";
}

function planStatusLabel(value?: string) {
  const map: Record<string, string> = {
    OBSERVING: "观察中",
    READY: "条件已满足",
    SHADOW_READY: "影子准备",
    BLOCKED: "被风控/条件拦截",
    ORDER_SUBMITTED: "已提交订单",
    OPEN: "持仓中",
    PARTIAL: "部分止盈",
    CLOSED: "已平仓",
    ERROR: "执行异常",
  };
  return map[value ?? ""] ?? value ?? "—";
}

function systemStateLabel(state?: string) {
  if (state === "LIVE_POSITION_OPEN") return "已有真实持仓，系统正在托管";
  if (state === "READY_WAITING_TRIGGER") return "链路已通，等待策略触发";
  return "尚有阻断，暂不会新开仓";
}

export default function MemberLiveTradingClient() {
  const [settings, setSettings] = useState<Setting[]>(defaultSettings);
  const [status, setStatus] = useState("正在读取实盘托管状态……");
  const [liveState, setLiveState] = useState<LiveStatusPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (options?: { silent?: boolean; syncSettings?: boolean }) => {
    const silent = options?.silent === true;
    const syncSettings = options?.syncSettings !== false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 11_000);
    try {
      const response = await fetch("/api/member/live-trading", { cache: "no-store", signal: controller.signal });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({})) as { message?: string; error?: string };
        throw new Error(failure.message || failure.error || `LIVE_STATUS_HTTP_${response.status}`);
      }
      const payload = await response.json() as LiveStatusPayload;
      setLiveState(payload);
      setLoadError(null);
      if (payload?.migrationRequired) {
        if (!silent) setStatus("Unified Live 数据表尚未迁移，因此不会开仓；但本页会继续检查 Bitget、Vercel 环境和 Cron，避免把数据库问题误报成密钥问题。");
      }
      if (syncSettings && Array.isArray(payload?.account?.settings) && payload.account.settings.length === 3) {
        setSettings(payload.account.settings);
      }
      if (!silent) {
        if (payload.officialControl) {
          const feed = payload.officialFeed;
          setStatus(`${systemStateLabel(feed?.state)}。${feed?.positions?.length ? `当前${feed.positions.length}笔真实持仓。` : "当前无真实持仓。"}`);
        } else {
          setStatus(payload?.account
            ? `个人托管配置：${payload.account.mode ?? "MANAGE_ONLY"}。下方同时展示MOOX官方1000U真实策略账户的持仓与计划。`
            : "暂无个人实盘账户记录；下方仍可查看MOOX官方1000U账户。"
          );
        }
      }
    } catch (error) {
      const reason = error instanceof Error && error.name !== "AbortError"
        ? error.message
        : "11秒内仍未取得状态";
      setLoadError(reason);
      if (!silent) setStatus(`${reason}。当前状态未知，不能视为“没有阻断”；请点“立即刷新状态”，若持续出现则检查生产API日志。`);
    } finally {
      window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    void load({ syncSettings: true });
    const interval = window.setInterval(() => void load({ silent: true, syncSettings: false }), 30_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const statusLoaded = liveState !== null && loadError === null;
  const officialControl = liveState?.officialControl === true;
  const maxLeverage = officialControl ? 2 : 10;
  const update = (index: number, patch: Partial<Setting>) => setSettings((rows) => rows.map((row, i) => i === index ? { ...row, ...patch, isolatedMargin: true } : row));

  const save = async () => {
    setBusy(true);
    setStatus("正在保存风险设置……");
    try {
      const response = await fetch("/api/member/live-trading/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      setStatus(response.ok
        ? officialControl
          ? "官方1000U三周期风险设置已保存。保存设置本身不会绕过实盘总闸门。"
          : "个人风险设置已保存。是否允许新开仓仍由你的本地实盘代理决定。"
        : "保存失败，请检查设置范围、登录状态或数据库迁移。"
      );
      if (response.ok) await load({ syncSettings: true });
    } finally {
      setBusy(false);
    }
  };

  const setOfficialMode = async (mode: "LIVE" | "MANAGE_ONLY") => {
    if (!officialControl) return;
    if (mode === "LIVE") {
      const confirmation = window.prompt("这会允许1000U真实实验账户在策略命中时开真实订单。请输入 LIVE1000 确认：");
      if (confirmation !== "LIVE1000") {
        setStatus("未输入 LIVE1000，实盘没有启用。");
        return;
      }
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/live-trading", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "SET_MODE", mode }),
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) {
        setStatus(`切换失败：${String(payload.error ?? "LIVE_SWITCH_BLOCKED")}。请按下方阻断原因补齐环境/迁移/对账。`);
      } else {
        setStatus(mode === "LIVE"
          ? "官方1000U实盘已显式启用。下一轮服务器扫描命中策略条件后可真实下单。"
          : "已切回只管理模式：停止新开仓，已有仓位继续托管。"
        );
      }
      await load({ syncSettings: true });
    } finally {
      setBusy(false);
    }
  };

  const agentConfig = useMemo(() => [
    "# Save only on your own computer/VPS. Never upload Bitget secrets to MOOX.",
    "MOOX_AGENT_MODE=LIVE",
    "MOOX_LIVE_TRADING_CONFIRM=I_UNDERSTAND_LIVE_ORDERS",
    ...settings.flatMap((row) => [
      `MOOX_${row.horizon}_ENABLED=${row.enabled}`,
      `MOOX_${row.horizon}_SIZING_MODE=${row.sizingMode}`,
      `MOOX_${row.horizon}_SIZING_VALUE=${row.sizingValue}`,
      `MOOX_${row.horizon}_LEVERAGE=${row.leverage}`,
    ]),
  ].join("\n"), [settings]);

  const download = () => {
    const blob = new Blob([agentConfig], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "moox-live-risk-settings.env";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const blockers = liveState?.newEntryGate?.reasons ?? [];
  const bitgetReady = liveState?.bitgetReadiness;
  const activation = liveState?.activation;
  const diagnostics = liveState?.strategyDiagnostics;
  const feed = liveState?.officialFeed;
  const positions = feed?.positions ?? [];
  const runtimeHeartbeat = feed?.runtimeHeartbeat;
  const cronHeartbeatFresh = runtimeHeartbeat?.heartbeatAgeSeconds != null && runtimeHeartbeat.heartbeatAgeSeconds <= 180;
  const plans = feed?.plans ?? [];
  const executions = feed?.recentExecutions ?? [];
  const closed = feed?.recentClosedPositions ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 text-white">
      <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-6">
        <p className="text-xs tracking-[0.25em] text-violet-300">MEMBER LIVE EXECUTION</p>
        <h1 className="mt-3 text-3xl font-semibold">AI实盘交易</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          {!statusLoaded
            ? "正在读取MOOX官方1000U真实策略账户状态。状态尚未返回前，本页不会把未知状态误报成系统阻断。"
            : officialControl
              ? "管理员控制MOOX官方1000U真实实验账户。奇门/正式研究负责方向，4H—30m—5m缠论负责短线执行；新单仍受逐仓、止损、日/周亏损、组合风险和对账闸门约束。"
              : "这里同时展示MOOX官方1000U真实策略账户的持仓、计划和执行状态。你的个人Bitget密钥仍只保存在自己的电脑或VPS，不上传网站。"}
        </p>
        <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm text-slate-300">{status}</div>

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-slate-500">自动交易总状态</p>
            <p className={`mt-2 font-semibold ${!statusLoaded ? "text-slate-300" : feed?.state === "BLOCKED" ? "text-amber-300" : "text-emerald-300"}`}>{statusLoaded ? systemStateLabel(feed?.state) : "正在读取状态…"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-slate-500">每分钟 Cron 心跳</p>
            <p className={`mt-2 font-semibold ${!statusLoaded ? "text-slate-300" : cronHeartbeatFresh && !runtimeHeartbeat?.paused ? "text-emerald-300" : "text-rose-300"}`}>{!statusLoaded ? "正在读取…" : cronHeartbeatFresh && !runtimeHeartbeat?.paused ? "正常" : runtimeHeartbeat?.paused ? "已暂停" : "未确认 / 超时"}</p>
            <p className="mt-1 text-xs text-slate-500">最后：{fmtTime(runtimeHeartbeat?.lastHeartbeatAt)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-slate-500">三周期策略扫描</p>
            <p className={`mt-2 font-semibold ${!statusLoaded ? "text-slate-300" : feed?.runnerFresh ? "text-emerald-300" : "text-rose-300"}`}>{!statusLoaded ? "正在读取…" : feed?.runnerFresh ? "正常" : "未扫描 / 被总闸门阻断"}</p>
            <p className="mt-1 text-xs text-slate-500">最后：{fmtTime(feed?.lastScanAt)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-slate-500">真实持仓</p>
            <p className="mt-2 text-xl font-semibold">{positions.length} 笔</p>
            <p className="mt-1 text-xs text-slate-500">{feed?.exchangeSnapshotAvailable ? "Bitget UTA权威快照" : "MOOX托管记录"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-slate-500">今日真实执行</p>
            <p className="mt-2 text-xl font-semibold">{feed?.today?.orderAttemptsToday ?? 0} 次尝试 / {feed?.today?.openedToday ?? 0} 开仓</p>
            <p className="mt-1 text-xs text-slate-500">当前计划 {plans.length} 条</p>
          </div>
        </div>

        {officialControl ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm">
              <p className="font-semibold text-cyan-200">1000U 实验账户状态</p>
              <p className="mt-2 text-slate-300">自动新开仓：{liveState?.newEntryGate?.allowed ? "已允许" : "未允许"}</p>
              <p className="mt-1 text-slate-300">Bitget：{bitgetReady?.mode ?? "—"} / {bitgetReady?.configured ? "密钥已配置" : "密钥未就绪"} / {bitgetReady?.executionAllowed ? "真实执行已授权" : "真实执行未授权"}</p>
              <p className="mt-1 text-slate-300">实验本金上限：{liveState?.experimentCapitalUsdt ?? 1000}U；单标的名义仓上限：{bitgetReady?.maxPositionNotionalUsdt ?? 400}U；最大同时仓位：{bitgetReady?.maxConcurrentPositions ?? 4}</p>
            </div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm">
              <p className="font-semibold text-amber-200">Unified Live 当前阻断</p>
              {blockers.length ? (
                <ul className="mt-2 space-y-1 text-slate-300">{blockers.map((reason) => <li key={reason}>• {gateReasonLabel(reason)}</li>)}</ul>
              ) : <p className="mt-2 text-emerald-300">无 Unified Live 阻断项。</p>}
            </div>
          </div>
        ) : null}

        {officialControl && activation ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">1000U 实盘激活五步检查</p>
                <p className="mt-1 text-xs text-slate-400">这五步全部通过以后，才允许点击“启用1000U实盘”。数据库未迁移时仍会继续检查其他步骤。</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs ${activation.liveConfigured ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200" : activation.eligibleForServerPreflight ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200" : "border-amber-400/30 bg-amber-400/10 text-amber-200"}`}>{activation.liveConfigured ? "LIVE已启用 · 托管由服务器复核" : activation.eligibleForServerPreflight ? "可提交服务器完整审计" : "仍有前置未完成"}</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              {[
                ["1 数据库迁移", activation.databaseReady, activation.databaseReady ? "已完成" : activation.targetMigration ?? "待迁移"],
                ["2 Vercel/实盘环境", activation.environmentReady, activation.environmentReady ? "已就绪" : `${activation.missingEnv?.length ?? 0}项未就绪`],
                ["3 Bitget只读验收", activation.exchangeReadOnlyReady, activation.exchangeReadOnlyReady ? "UTA读取成功" : activation.exchangeReadOnlyAttempted ? "读取失败" : "尚未尝试"],
                ["4 每分钟Cron", activation.cronReady, activation.cronReady ? "心跳正常" : "未确认/暂停/超时"],
                ["5 官方账户开仓", activation.accountLiveEnabled, activation.accountLiveEnabled ? "已启用；每次执行仍受托管闸门限制" : activation.eligibleForServerPreflight ? "可提交服务器完整审计" : "等待前置"],
              ].map(([label, ok, detail]) => (
                <div key={String(label)} className={`rounded-xl border p-3 text-xs ${ok ? "border-emerald-400/20 bg-emerald-400/5" : "border-amber-400/20 bg-amber-400/5"}`}>
                  <p className={ok ? "font-medium text-emerald-200" : "font-medium text-amber-200"}>{ok ? "✓" : "!"} {String(label)}</p>
                  <p className="mt-1 text-slate-400">{String(detail)}</p>
                </div>
              ))}
            </div>
            {!activation.databaseReady ? (
              <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-100">
                当前第一阻断就是数据库。安装本补丁后，在 <span className="font-mono">C:\MoonX-Genesis</span> 运行 <span className="font-mono">CHECK_1000U_LIVE_READINESS.cmd</span>；确认只有目标迁移待执行后，再运行 <span className="font-mono">APPLY_UNIFIED_LIVE_MIGRATION.cmd</span>。迁移脚本不会调用 Bitget，也不会自动开启实盘。
              </div>
            ) : null}
            {activation.missingEnv?.length ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300">
                <p className="font-medium text-white">仍未就绪的生产变量</p>
                <p className="mt-2 break-words font-mono text-slate-400">{activation.missingEnv.join(" · ")}</p>
                <p className="mt-2 text-slate-500">页面只返回变量名和“是否就绪”，不会返回 API Key、Secret 或 Passphrase 的值。</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {settings.map((row, index) => (
            <article key={row.horizon} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="font-semibold">{labels[row.horizon]}</h2>
              <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={row.enabled} onChange={(event: ChangeEvent<HTMLInputElement>) => update(index, { enabled: event.target.checked })}/>启用此周期</label>
              <label className="mt-4 block text-xs text-slate-400">金额模式<select className="mt-1 w-full rounded-lg bg-slate-900 p-2" value={row.sizingMode} onChange={(event: ChangeEvent<HTMLSelectElement>) => update(index, { sizingMode: event.target.value as Setting["sizingMode"] })}><option value="FIXED_MARGIN">固定保证金</option><option value="EQUITY_PERCENT">账户权益比例</option><option value="FIXED_NOTIONAL">固定名义仓位</option><option value="RISK_PERCENT">单笔风险比例</option></select></label>
              <label className="mt-3 block text-xs text-slate-400">金额 / 百分比<input className="mt-1 w-full rounded-lg bg-slate-900 p-2" type="number" min="0.01" step="0.01" value={row.sizingValue} onChange={(event: ChangeEvent<HTMLInputElement>) => update(index, { sizingValue: Number(event.target.value) })}/></label>
              <label className="mt-3 block text-xs text-slate-400">杠杆 1—{maxLeverage}倍<input className="mt-1 w-full rounded-lg bg-slate-900 p-2" type="number" min="1" max={maxLeverage} value={row.leverage} onChange={(event: ChangeEvent<HTMLInputElement>) => update(index, { leverage: Math.min(maxLeverage, Math.max(1, Number(event.target.value))) })}/></label>
              <label className="mt-3 block text-xs text-slate-400">单笔最大亏损（权益%）<input className="mt-1 w-full rounded-lg bg-slate-900 p-2" type="number" min="0.01" max={officialControl ? 0.5 : 10} step="0.01" value={row.maxLossPercent} onChange={(event: ChangeEvent<HTMLInputElement>) => update(index, { maxLossPercent: Number(event.target.value) })}/></label>
              <p className="mt-3 text-xs text-slate-500">保证金模式固定为逐仓。{officialControl ? "官方1000U实验账户最高2倍；" : ""}杠杆不能突破止损损失、日亏损和总保证金占用上限。</p>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button disabled={busy} className="rounded-xl bg-violet-500 px-5 py-3 font-medium disabled:opacity-50" onClick={save}>保存设置</button>
          {officialControl ? (
            <>
              <button disabled={busy || !activation?.eligibleForServerPreflight} title={!activation?.eligibleForServerPreflight ? "数据库/环境/Bitget只读/Cron等前置条件尚未全部通过" : "点击后由服务器执行完整托管审计；审计不通过不会启用"} className="rounded-xl border border-emerald-400/30 px-5 py-3 text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => void setOfficialMode("LIVE")}>{activation?.eligibleForServerPreflight ? "提交完整审计并启用1000U实盘" : "启用1000U实盘（前置未完成）"}</button>
              <button disabled={busy} className="rounded-xl border border-amber-400/30 px-5 py-3 text-amber-200 disabled:opacity-50" onClick={() => void setOfficialMode("MANAGE_ONLY")}>停止新开仓</button>
              <button disabled={busy} className="rounded-xl border border-white/15 px-5 py-3 disabled:opacity-50" onClick={() => void load({ syncSettings: true })}>立即刷新状态</button>
            </>
          ) : (
            <>
              <button className="rounded-xl border border-white/15 px-5 py-3" onClick={download}>下载本地代理风险配置</button>
              <a className="rounded-xl border border-cyan-400/30 px-5 py-3 text-cyan-200" href="/downloads/MOOX-Bitget-Live-Agent-v72031.zip">下载会员实盘代理</a>
            </>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/75 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">当前真实持仓</h2>
            <p className="mt-1 text-sm text-slate-400">管理员优先读取Bitget UTA权威持仓；会员看到官方策略账户的安全只读持仓快照。</p>
          </div>
          <p className="text-xs text-slate-500">每30秒自动刷新 · {fmtTime(feed?.generatedAt)}</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-400"><tr><th className="p-2">周期</th><th className="p-2">标的</th><th className="p-2">方向</th><th className="p-2">数量</th><th className="p-2">杠杆</th><th className="p-2">开仓</th><th className="p-2">现价</th><th className="p-2">浮盈亏</th><th className="p-2">止损 / TP</th></tr></thead>
            <tbody>
              {positions.map((position) => (
                <tr key={String(position.id ?? `${position.symbol}-${position.side}`)} className="border-t border-white/10">
                  <td className="p-2">{horizonName[String(position.horizon ?? "")] ?? position.horizon ?? "—"}</td>
                  <td className="p-2 font-medium">{position.symbol ?? "—"}</td>
                  <td className="p-2">{directionLabel(position.side)}</td>
                  <td className="p-2">{fmt(position.quantity, 6)}</td>
                  <td className="p-2">{fmt(position.leverage, 0)}x</td>
                  <td className="p-2">{fmt(position.entryPrice, 4)}</td>
                  <td className="p-2">{fmt(position.markPrice, 4)}</td>
                  <td className={`p-2 ${Number(position.unrealizedPnlUsdt ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{position.unrealizedPnlUsdt == null ? "—" : `${fmt(position.unrealizedPnlUsdt)} U`}</td>
                  <td className="p-2 text-xs text-slate-400">SL {fmt(position.stopPrice, 4)} / T1 {fmt(position.target1, 4)} / T2 {fmt(position.target2, 4)}</td>
                </tr>
              ))}
              {!positions.length && <tr><td colSpan={9} className="p-8 text-center text-slate-400">当前没有真实持仓。下面会说明是“没有触发”还是“系统被阻断”。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/75 p-6">
        <h2 className="text-xl font-semibold">待执行 / 观察计划</h2>
        <p className="mt-1 text-sm text-slate-400">计划不等于已下单。READY代表条件基本满足；OBSERVING代表方向存在但仍在等结构/5分钟触发；BLOCKED会直接写明原因。</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => (
            <article key={String(plan.id)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><span className="font-semibold">{plan.symbol ?? "—"}</span><span className="ml-2 text-xs text-violet-300">{horizonName[plan.strategyType ?? plan.horizon ?? ""] ?? plan.strategyLabel ?? "策略"}</span></div>
                <span className="text-xs text-slate-400">{planStatusLabel(plan.status)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-300">
                <p>方向：<span className="font-medium text-white">{directionLabel(plan.direction)}</span></p>
                <p>置信：{fmt(plan.confidence, 0)}%</p>
                <p>参考入场：{fmt(plan.entryPrice, 4)}</p>
                <p>当前价：{fmt(plan.currentPrice, 4)}</p>
                <p>止损：{fmt(plan.stopLoss, 4)}</p>
                <p>TP1 / TP2：{fmt(plan.target1, 4)} / {fmt(plan.target2, 4)}</p>
              </div>
              <p className="mt-3 text-xs text-slate-400">条件：{plan.conditionsMet ?? 0}/{plan.conditionsTotal ?? 0}{plan.unmetConditions?.length ? ` · 还差：${plan.unmetConditions.join("、")}` : ""}</p>
              {plan.rejectionReason ? <p className="mt-2 text-xs text-amber-300">当前未执行：{plan.rejectionReason}</p> : null}
              <p className="mt-2 text-xs text-slate-500">更新 {fmtTime(plan.updatedAt)} · 失效 {fmtTime(plan.expiresAt)}</p>
            </article>
          ))}
          {!plans.length && <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">当前没有方向明确的待执行计划。若服务器扫描正常，这表示策略暂未找到值得准备下单的候选。</div>}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/75 p-6">
        <h2 className="text-xl font-semibold">为什么现在没有下单 / 系统排查</h2>
        <div className="mt-4 space-y-2">
          {(feed?.diagnosis ?? []).map((reason, index) => <div key={`${index}-${reason}`} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">{index + 1}. {reason}</div>)}
          {!statusLoaded && <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">{loadError ? `当前状态读取失败：${loadError}。页面上残留的旧数据不能代表当前状态。` : "状态仍在读取，尚不能判断是否存在阻断项。"}</div>}
          {statusLoaded && !(feed?.diagnosis ?? []).length && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">状态已成功读取，暂未发现阻断项。</div>}
        </div>
      </section>

      {officialControl ? (
        <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/75 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">三周期自动扫描诊断</h2>
              <p className="mt-1 text-sm text-slate-400">短线为4H环境 → 30分钟主线段 → 5分钟执行；这里直接告诉你今天扫描了多少、为什么没下单。</p>
            </div>
            <p className="text-xs text-slate-500">诊断更新时间：{fmtTime(diagnostics?.generatedAt)}</p>
          </div>
          {!diagnostics?.databaseReady ? (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100">策略决策表尚未就绪，先完成数据库迁移。</div>
          ) : (
            <>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {(diagnostics.horizons ?? []).map((row) => (
                  <article key={row.strategyType ?? row.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{horizonName[row.strategyType ?? ""] ?? row.label ?? "策略"}</h3><span className="text-xs text-slate-500">{fmtTime(row.lastScanAt)}</span></div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-300"><p>今日扫描：{row.stats?.scansToday ?? 0}</p><p>评估标的：{row.stats?.symbolsEvaluatedToday ?? 0}</p><p>可执行：{row.stats?.readyToday ?? 0}</p><p>被拦截：{row.stats?.blockedToday ?? 0}</p><p>下单尝试：{row.stats?.orderAttemptsToday ?? 0}</p><p>已开仓：{row.stats?.openedToday ?? 0}</p></div>
                    <div className="mt-4 border-t border-white/10 pt-3"><p className="text-xs font-medium text-slate-400">最近状态</p>{(row.recent ?? []).length ? <ul className="mt-2 space-y-2 text-xs text-slate-400">{(row.recent ?? []).map((decision, index) => <li key={`${decision.symbol ?? "asset"}-${decision.updatedAt ?? index}`}><span className="text-slate-200">{decision.symbol ?? "—"}</span> · {decision.direction ?? "—"} · {decision.status ?? "—"}{decision.rejectionReason ? <span> · {decision.rejectionReason}</span> : null}</li>)}</ul> : <p className="mt-2 text-xs text-slate-500">暂无策略决策记录。</p>}</div>
                  </article>
                ))}
              </div>
              {diagnostics.risk?.blocked ? <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-100">风险引擎当前阻断：{diagnostics.risk.blockReason || "RISK_BLOCKED"}</div> : null}
            </>
          )}
        </section>
      ) : null}

      <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/75 p-6">
        <h2 className="text-xl font-semibold">最近真实执行记录</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm"><thead className="text-left text-slate-400"><tr><th className="p-2">周期</th><th className="p-2">标的</th><th className="p-2">方向</th><th className="p-2">状态</th><th className="p-2">入场</th><th className="p-2">数量</th><th className="p-2">已实现盈亏</th><th className="p-2">更新</th></tr></thead><tbody>{executions.map((row) => <tr key={String(row.id)} className="border-t border-white/10"><td className="p-2">{horizonName[row.strategyType ?? row.horizon ?? ""] ?? "—"}</td><td className="p-2">{row.symbol ?? "—"}</td><td className="p-2">{directionLabel(row.direction)}</td><td className="p-2">{planStatusLabel(row.status)}</td><td className="p-2">{fmt(row.entryPrice, 4)}</td><td className="p-2">{fmt(row.quantity, 6)}</td><td className={`p-2 ${Number(row.realizedPnlUsdt ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{row.realizedPnlUsdt == null ? "—" : `${fmt(row.realizedPnlUsdt)} U`}</td><td className="p-2 text-xs text-slate-400">{fmtTime(row.updatedAt)}</td></tr>)}{!executions.length && <tr><td colSpan={8} className="p-8 text-center text-slate-400">暂无真实下单/成交记录。</td></tr>}</tbody></table>
        </div>
        {officialControl && closed.length ? <p className="mt-3 text-xs text-slate-500">Bitget最近已平仓记录已同步 {closed.length} 笔，用于与MOOX执行记录交叉核对。</p> : null}
      </section>
    </main>
  );
}
