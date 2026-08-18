"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";

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

const labels = { SHORT: "短线 2—6小时", MEDIUM: "中线 1—7天", LONG: "长线 1—4周" } as const;
const defaultSettings: Setting[] = [
  { horizon: "SHORT", enabled: true, sizingMode: "FIXED_MARGIN", sizingValue: 200, leverage: 2, maxOpenPositions: 2, maxLossPercent: 0.35, dailyLossPercent: 1, weeklyLossPercent: 2.5, maxMarginUsePercent: 20, target1ReducePercent: 30, isolatedMargin: true },
  { horizon: "MEDIUM", enabled: true, sizingMode: "EQUITY_PERCENT", sizingValue: 8, leverage: 2, maxOpenPositions: 2, maxLossPercent: 0.5, dailyLossPercent: 1, weeklyLossPercent: 2.5, maxMarginUsePercent: 25, target1ReducePercent: 35, isolatedMargin: true },
  { horizon: "LONG", enabled: true, sizingMode: "EQUITY_PERCENT", sizingValue: 10, leverage: 1, maxOpenPositions: 2, maxLossPercent: 0.4, dailyLossPercent: 1, weeklyLossPercent: 2.5, maxMarginUsePercent: 25, target1ReducePercent: 30, isolatedMargin: true },
];

export default function MemberLiveTradingClient() {
  const [settings, setSettings] = useState<Setting[]>(defaultSettings);
  const [status, setStatus] = useState("正在读取实盘托管状态……");
  const [positions, setPositions] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10000);
    fetch("/api/member/live-trading", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (payload?.migrationRequired) { setStatus("实盘数据表尚未迁移，请联系管理员完成部署。"); return; }
        if (Array.isArray(payload?.account?.settings) && payload.account.settings.length === 3) setSettings(payload.account.settings);
        setPositions(Array.isArray(payload?.account?.slices) ? payload.account.slices : []);
        setStatus(payload?.account ? `当前模式：${payload.account.mode}；新开仓：${payload.account.newEntriesEnabled ? "已允许" : "已暂停"}；已有仓管理：${payload.account.positionManagementEnabled ? "运行中" : "已停止"}` : "暂无实盘账户记录");
      })
      .catch(() => setStatus("10秒内未取得状态。当前不会因此自动开仓，请稍后刷新。"))
      .finally(() => window.clearTimeout(timer));
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, []);

  const update = (index: number, patch: Partial<Setting>) => setSettings((rows) => rows.map((row, i) => i === index ? { ...row, ...patch, isolatedMargin: true } : row));
  const save = async () => {
    setStatus("正在保存风险设置……");
    const response = await fetch("/api/member/live-trading/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ settings }) });
    setStatus(response.ok ? "风险设置已保存。是否允许新开仓仍由你的本地实盘代理和统一安全闸门共同决定。" : "保存失败，请检查会员登录状态或联系管理员。");
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
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "moox-live-risk-settings.env"; anchor.click(); URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 text-white">
      <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-6">
        <p className="text-xs tracking-[0.25em] text-violet-300">MEMBER LIVE EXECUTION</p>
        <h1 className="mt-3 text-3xl font-semibold">AI实盘交易</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">只保留实盘产品。会员的Bitget密钥保存在自己的电脑或VPS，不上传网站；必须关闭提币与划转权限并绑定固定IP。奇门、六爻决定方向，缠论与技术只确认点位。</p>
        <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm text-slate-300">{status}</div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {settings.map((row, index) => (
            <article key={row.horizon} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="font-semibold">{labels[row.horizon]}</h2>
              <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={row.enabled} onChange={(event: ChangeEvent<HTMLInputElement>) => update(index, { enabled: event.target.checked })}/>启用此周期</label>
              <label className="mt-4 block text-xs text-slate-400">金额模式<select className="mt-1 w-full rounded-lg bg-slate-900 p-2" value={row.sizingMode} onChange={(event: ChangeEvent<HTMLSelectElement>) => update(index, { sizingMode: event.target.value as Setting["sizingMode"] })}><option value="FIXED_MARGIN">固定保证金</option><option value="EQUITY_PERCENT">账户权益比例</option><option value="FIXED_NOTIONAL">固定名义仓位</option><option value="RISK_PERCENT">单笔风险比例</option></select></label>
              <label className="mt-3 block text-xs text-slate-400">金额 / 百分比<input className="mt-1 w-full rounded-lg bg-slate-900 p-2" type="number" min="0.01" step="0.01" value={row.sizingValue} onChange={(event: ChangeEvent<HTMLInputElement>) => update(index, { sizingValue: Number(event.target.value) })}/></label>
              <label className="mt-3 block text-xs text-slate-400">杠杆 1—10倍<input className="mt-1 w-full rounded-lg bg-slate-900 p-2" type="number" min="1" max="10" value={row.leverage} onChange={(event: ChangeEvent<HTMLInputElement>) => update(index, { leverage: Math.min(10, Math.max(1, Number(event.target.value))) })}/></label>
              <label className="mt-3 block text-xs text-slate-400">单笔最大亏损（权益%）<input className="mt-1 w-full rounded-lg bg-slate-900 p-2" type="number" min="0.01" max="10" step="0.01" value={row.maxLossPercent} onChange={(event: ChangeEvent<HTMLInputElement>) => update(index, { maxLossPercent: Number(event.target.value) })}/></label>
              <p className="mt-3 text-xs text-slate-500">保证金模式固定为逐仓。高杠杆不能突破止损损失、日亏损和总保证金占用上限。</p>
            </article>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3"><button className="rounded-xl bg-violet-500 px-5 py-3 font-medium" onClick={save}>保存设置</button><button className="rounded-xl border border-white/15 px-5 py-3" onClick={download}>下载本地代理风险配置</button><a className="rounded-xl border border-cyan-400/30 px-5 py-3 text-cyan-200" href="/downloads/MOOX-Bitget-Live-Agent-v72031.zip">下载会员实盘代理</a></div>
      </section>
      <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/75 p-6"><h2 className="text-xl font-semibold">我的三周期托管记录</h2><div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead className="text-left text-slate-400"><tr><th className="p-2">类型</th><th className="p-2">标的</th><th className="p-2">方向</th><th className="p-2">状态</th><th className="p-2">杠杆</th><th className="p-2">最近管理</th></tr></thead><tbody>{positions.map((position) => <tr key={String(position.id)} className="border-t border-white/10"><td className="p-2">{String(position.horizon)}</td><td className="p-2">{String(position.symbol)}</td><td className="p-2">{String(position.side)}</td><td className="p-2">{String(position.status)}</td><td className="p-2">{String(position.leverage)}x</td><td className="p-2">{position.lastManagedAt ? new Date(String(position.lastManagedAt)).toLocaleString() : "待检查"}</td></tr>)}{!positions.length && <tr><td colSpan={6} className="p-8 text-center text-slate-400">暂无托管持仓。这里不会展示模拟单。</td></tr>}</tbody></table></div></section>
    </main>
  );
}
