"use client";

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

type LiveStatusPayload = {
  migrationRequired?: boolean;
  scope?: "OFFICIAL" | "MEMBER";
  officialControl?: boolean;
  localAgentRequired?: boolean;
  experimentCapitalUsdt?: number;
  account?: {
    mode?: string;
    newEntriesEnabled?: boolean;
    positionManagementEnabled?: boolean;
    settings?: Setting[];
    slices?: Array<Record<string, unknown>>;
  } | null;
  newEntryGate?: {
    allowed?: boolean;
    reasons?: string[];
    mode?: string;
  };
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
    LEGACY_STRATEGY_EXECUTION_DISABLED: "旧兼容策略执行开关被显式关闭（MOOX_LIVE_ACTIVE_EXECUTION_V641=false）",
  };
  return labelsByReason[reason] ?? reason;
}

export default function MemberLiveTradingClient() {
  const [settings, setSettings] = useState<Setting[]>(defaultSettings);
  const [status, setStatus] = useState("正在读取实盘托管状态……");
  const [positions, setPositions] = useState<Array<Record<string, unknown>>>([]);
  const [liveState, setLiveState] = useState<LiveStatusPayload | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch("/api/member/live-trading", { cache: "no-store", signal: controller.signal });
      const payload = await response.json() as LiveStatusPayload;
      setLiveState(payload);
      if (payload?.migrationRequired) {
        setStatus("实盘数据表尚未迁移。自动交易不会开仓，先完成数据库迁移。");
        return;
      }
      if (Array.isArray(payload?.account?.settings) && payload.account.settings.length === 3) {
        setSettings(payload.account.settings);
      }
      setPositions(Array.isArray(payload?.account?.slices) ? payload.account.slices : []);
      if (payload.officialControl) {
        const allowed = payload.newEntryGate?.allowed === true;
        setStatus(allowed
          ? "官方1000U账户：自动新开仓闸门已通过；每分钟服务器任务会扫描三周期策略，命中条件后可真实下单。"
          : "官方1000U账户：目前只管理已有仓位，不会新开仓。下方会显示具体阻断原因。");
      } else {
        setStatus(payload?.account
          ? `个人托管配置：${payload.account.mode ?? "MANAGE_ONLY"}。会员密钥仍只保存在自己的电脑/VPS，网站不会代替本地代理下单。`
          : "暂无个人实盘账户记录");
      }
    } catch {
      setStatus("10秒内未取得状态。当前不会因此自动开仓，请稍后刷新。");
    } finally {
      window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

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
      if (response.ok) await load();
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
      await load();
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
  const diagnostics = liveState?.strategyDiagnostics;
  const horizonName: Record<string, string> = { INTRADAY: "短线", SWING: "中线", POSITION: "长线" };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 text-white">
      <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-6">
        <p className="text-xs tracking-[0.25em] text-violet-300">MEMBER LIVE EXECUTION</p>
        <h1 className="mt-3 text-3xl font-semibold">AI实盘交易</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          {officialControl
            ? "管理员当前控制的是MOOX官方1000U真实实验账户。奇门/正式研究负责方向，4H—30m—5m缠论负责短线执行；所有新单仍受逐仓、止损、日/周亏损、组合风险和对账闸门约束。"
            : "会员的Bitget密钥保存在自己的电脑或VPS，不上传网站；必须关闭提币与划转权限并绑定固定IP。奇门、六爻决定方向，缠论与技术只确认点位。"}
        </p>
        <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm text-slate-300">{status}</div>

        {officialControl ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm">
              <p className="font-semibold text-cyan-200">1000U 实验账户状态</p>
              <p className="mt-2 text-slate-300">自动新开仓：{liveState?.newEntryGate?.allowed ? "已允许" : "未允许"}</p>
              <p className="mt-1 text-slate-300">Bitget：{bitgetReady?.mode ?? "—"} / {bitgetReady?.configured ? "密钥已配置" : "密钥未就绪"} / {bitgetReady?.executionAllowed ? "真实执行已授权" : "真实执行未授权"} / {bitgetReady?.strategyActiveExecutionEnabled === false ? "策略执行兼容开关已关闭" : "策略执行兼容开关可用"}</p>
              <p className="mt-1 text-slate-300">实验本金上限：{liveState?.experimentCapitalUsdt ?? 1000}U；单标的名义仓上限：{bitgetReady?.maxPositionNotionalUsdt ?? 400}U；最大同时仓位：{bitgetReady?.maxConcurrentPositions ?? 4}</p>
            </div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm">
              <p className="font-semibold text-amber-200">当前阻断原因</p>
              {blockers.length ? (
                <ul className="mt-2 space-y-1 text-slate-300">{blockers.map((reason) => <li key={reason}>• {gateReasonLabel(reason)}</li>)}</ul>
              ) : <p className="mt-2 text-emerald-300">无 Unified Live 阻断项。</p>}
            </div>
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
              <button disabled={busy} className="rounded-xl border border-emerald-400/30 px-5 py-3 text-emerald-200 disabled:opacity-50" onClick={() => void setOfficialMode("LIVE")}>启用1000U实盘</button>
              <button disabled={busy} className="rounded-xl border border-amber-400/30 px-5 py-3 text-amber-200 disabled:opacity-50" onClick={() => void setOfficialMode("MANAGE_ONLY")}>停止新开仓</button>
              <button disabled={busy} className="rounded-xl border border-white/15 px-5 py-3 disabled:opacity-50" onClick={() => void load()}>刷新实盘状态</button>
            </>
          ) : (
            <>
              <button className="rounded-xl border border-white/15 px-5 py-3" onClick={download}>下载本地代理风险配置</button>
              <a className="rounded-xl border border-cyan-400/30 px-5 py-3 text-cyan-200" href="/downloads/MOOX-Bitget-Live-Agent-v72031.zip">下载会员实盘代理</a>
            </>
          )}
        </div>
      </section>

      {officialControl ? (
        <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/75 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">三周期自动扫描诊断</h2>
              <p className="mt-1 text-sm text-slate-400">短线为4H环境 → 30分钟主线段 → 5分钟执行；这里直接告诉你今天扫描了多少、为什么没下单。</p>
            </div>
            <p className="text-xs text-slate-500">诊断更新时间：{diagnostics?.generatedAt ? new Date(diagnostics.generatedAt).toLocaleString() : "—"}</p>
          </div>
          {!diagnostics?.databaseReady ? (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100">策略决策表尚未就绪，先完成数据库迁移。</div>
          ) : (
            <>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {(diagnostics.horizons ?? []).map((row) => (
                  <article key={row.strategyType ?? row.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{horizonName[row.strategyType ?? ""] ?? row.label ?? "策略"}</h3>
                      <span className="text-xs text-slate-500">{row.lastScanAt ? new Date(row.lastScanAt).toLocaleString() : "尚未扫描"}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-300">
                      <p>今日扫描：{row.stats?.scansToday ?? 0}</p>
                      <p>评估标的：{row.stats?.symbolsEvaluatedToday ?? 0}</p>
                      <p>可执行：{row.stats?.readyToday ?? 0}</p>
                      <p>被拦截：{row.stats?.blockedToday ?? 0}</p>
                      <p>下单尝试：{row.stats?.orderAttemptsToday ?? 0}</p>
                      <p>已开仓：{row.stats?.openedToday ?? 0}</p>
                    </div>
                    <div className="mt-4 border-t border-white/10 pt-3">
                      <p className="text-xs font-medium text-slate-400">最近未成交/状态</p>
                      {(row.recent ?? []).length ? (
                        <ul className="mt-2 space-y-2 text-xs text-slate-400">
                          {(row.recent ?? []).map((decision, index) => (
                            <li key={`${decision.symbol ?? "asset"}-${decision.updatedAt ?? index}`}>
                              <span className="text-slate-200">{decision.symbol ?? "—"}</span> · {decision.direction ?? "—"} · {decision.status ?? "—"}
                              {decision.rejectionReason ? <span> · {decision.rejectionReason}</span> : null}
                            </li>
                          ))}
                        </ul>
                      ) : <p className="mt-2 text-xs text-slate-500">暂无策略决策记录。</p>}
                    </div>
                  </article>
                ))}
              </div>
              {diagnostics.risk?.blocked ? (
                <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-100">风险引擎当前阻断：{diagnostics.risk.blockReason || "RISK_BLOCKED"}</div>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/75 p-6">
        <h2 className="text-xl font-semibold">{officialControl ? "官方1000U三周期托管记录" : "我的三周期托管记录"}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm"><thead className="text-left text-slate-400"><tr><th className="p-2">类型</th><th className="p-2">标的</th><th className="p-2">方向</th><th className="p-2">状态</th><th className="p-2">杠杆</th><th className="p-2">最近管理</th></tr></thead><tbody>{positions.map((position) => <tr key={String(position.id)} className="border-t border-white/10"><td className="p-2">{String(position.horizon)}</td><td className="p-2">{String(position.symbol)}</td><td className="p-2">{String(position.side)}</td><td className="p-2">{String(position.status)}</td><td className="p-2">{String(position.leverage)}x</td><td className="p-2">{position.lastManagedAt ? new Date(String(position.lastManagedAt)).toLocaleString() : "待检查"}</td></tr>)}{!positions.length && <tr><td colSpan={6} className="p-8 text-center text-slate-400">暂无托管持仓。这里不会展示模拟单。</td></tr>}</tbody></table>
        </div>
      </section>
    </main>
  );
}
