"use client";

import { useRef, useState } from "react";
import { parseLiveConfigurationDraft, type LiveConfigurationDraftView } from "@/lib/trading-signals/live-configuration-draft-core";

function decodeView(value: unknown): LiveConfigurationDraftView {
  if (!value || typeof value !== "object") throw new Error("INVALID_VIEW");
  const data = value as LiveConfigurationDraftView;
  if (data.applied !== false) throw new Error("INVALID_VIEW");
  if (data.draft === null && data.revision === null && data.savedAt === null) return data;
  if (!data.draft || data.draft.state !== "PENDING" || data.draft.schemaVersion !== 1
    || typeof data.revision !== "string" || !data.revision || typeof data.savedAt !== "string" || !Number.isFinite(Date.parse(data.savedAt))) throw new Error("INVALID_VIEW");
  parseLiveConfigurationDraft({ durationMode: data.draft.durationMode, durationDays: data.draft.durationDays, capitalUsdt: data.draft.capitalUsdt });
  return data;
}

export default function LiveConfigurationDraftClient() {
  const [view, setView] = useState<LiveConfigurationDraftView | null>(null);
  const [mode, setMode] = useState("CONTINUOUS");
  const [days, setDays] = useState("30");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [message, setMessage] = useState("展开读取已保存配置。保存只记录你的选择，不会启动、续期或更改当前预算。");
  const accept = (data: LiveConfigurationDraftView) => {
    setView(data);
    setMode(data.draft?.durationMode ?? "CONTINUOUS");
    setDays(String(data.draft?.durationDays ?? 30));
    setBudget(data.draft?.capitalUsdt ?? "");
  };
  const load = async () => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setView(null);
    setMessage("正在读取待启用配置……");
    try {
      const response = await fetch("/api/admin/live-trading/configuration-draft", { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("READ_FAILED");
      const data = decodeView(await response.json()); accept(data);
      setMessage(data.draft ? "已读取待启用配置，当前实盘未应用。" : "尚无已保存配置。请选择运行期限并填写预算。");
    } catch { setMessage("配置读取失败，暂不能保存。请收起后重新展开。"); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const save = async () => {
    if (inFlight.current || !view) return;
    let draft;
    try { draft = parseLiveConfigurationDraft({ durationMode: mode, durationDays: mode === "FIXED" ? Number(days) : null, capitalUsdt: budget }); }
    catch { setMessage("预算须为大于0的金额，最多两位小数；固定期限为1—36525天的整数。"); return; }
    inFlight.current = true; setBusy(true);
    try {
      const response = await fetch("/api/admin/live-trading/configuration-draft", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ draft: { durationMode: draft.durationMode, durationDays: draft.durationDays, capitalUsdt: draft.capitalUsdt }, expectedRevision: view.revision, requestId: crypto.randomUUID() }),
      });
      if (response.status === 409) throw new Error("CONFLICT");
      if (!response.ok) throw new Error("SAVE_FAILED");
      const data = decodeView(await response.json());
      if (JSON.stringify(data.draft) !== JSON.stringify(draft)) throw new Error("MISMATCH");
      accept(data); setMessage("配置已保存，尚未启用。当前实验期限、1000U执行预算和所有风控保持不变；不会划转资金或自动下单。");
    } catch (error) {
      setView(null);
      setMessage(error instanceof Error && error.message === "CONFLICT" ? "配置已被另一窗口更新。请收起后重新展开，核对后再保存。" : "保存结果未确认，不代表已启用。请收起后重新展开核对，不要反复提交。");
    } finally { inFlight.current = false; setBusy(false); }
  };
  return <details className="mt-6 rounded-3xl border border-white/10 p-4" onToggle={(event) => { if (event.currentTarget.open) void load(); }}>
    <summary className="cursor-pointer text-slate-200">运行期限与预算（待启用配置）</summary>
    <p className="mt-3 text-sm text-amber-200">保存不等于启用。持续运行仅表示不按固定日期结束，不取消手动关闭、亏损、回撤或保护单限制。</p>
    <fieldset disabled={busy || !view} className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm">运行期限
        <select aria-label="运行期限" className="rounded-lg bg-slate-900 p-3" value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="CONTINUOUS">持续运行（手动停止／风控停止）</option><option value="FIXED">自定义天数</option>
        </select>
      </label>
      {mode === "FIXED" ? <label className="grid gap-2 text-sm">天数<input aria-label="运行天数" type="number" min="1" max="36525" step="1" className="rounded-lg bg-slate-900 p-3" value={days} onChange={(event) => setDays(event.target.value)} /></label> : null}
      <label className="grid gap-2 text-sm">拟用交易预算（USDT）<input aria-label="拟用交易预算" type="text" inputMode="decimal" placeholder="例如 500、1000 或 2000" className="rounded-lg bg-slate-900 p-3" value={budget} onChange={(event) => setBudget(event.target.value)} /></label>
      <button type="button" onClick={() => void save()} disabled={busy || !view} className="self-end rounded-xl bg-slate-700 p-3 disabled:opacity-50">保存待启用配置</button>
    </fieldset>
    <p role="status" className="mt-3 text-sm text-slate-300">{message}</p>
    {view?.savedAt ? <p className="mt-2 text-xs text-slate-400">保存时间：{new Date(view.savedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })}（北京时间）。实际启用前仍须核对可用资金、未完成订单及历史风险记录。</p> : null}
  </details>;
}
