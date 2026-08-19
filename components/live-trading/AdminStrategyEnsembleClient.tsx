"use client";

import { useEffect, useMemo, useState } from "react";
import type { StrategyEnsembleCandidate, StrategyEnsembleSnapshot } from "@/types/strategy-ensemble";

type HistoryRow = { id: string; code: string; symbol?: string | null; createdAt: string; payload: unknown };
type Payload = { snapshot: StrategyEnsembleSnapshot; history: HistoryRow[] };

const sleeveName: Record<StrategyEnsembleCandidate["sleeve"], string> = {
  LIUYAO: "六爻",
  QIMEN: "奇门",
  TECHNICAL: "纯技术",
  COMPOSITE: "综合",
};

function sideText(side: StrategyEnsembleCandidate["side"]) {
  return side === "LONG" ? "看多" : side === "SHORT" ? "看空" : "等待";
}

export default function AdminStrategyEnsembleClient() {
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    const res = await fetch("/api/admin/strategy-ensemble", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setData((await res.json()) as Payload);
  };

  useEffect(() => { void load().catch((err) => setError(String(err))); }, []);

  const runNow = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/admin/strategy-ensemble", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "RUN_NOW" }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (err) { setError(String(err)); } finally { setBusy(false); }
  };

  const approve = async (candidate: StrategyEnsembleCandidate) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/admin/strategy-ensemble", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "APPROVE", candidate }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (err) { setError(String(err)); } finally { setBusy(false); }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, StrategyEnsembleCandidate[]>();
    for (const item of data?.snapshot.candidates ?? []) {
      const rows = map.get(item.symbol) ?? [];
      rows.push(item); map.set(item.symbol, rows);
    }
    return [...map.entries()];
  }, [data]);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 text-white">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">MOOX Strategy Ensemble</p>
            <h1 className="mt-2 text-2xl font-semibold">四策略并行候选单</h1>
            <p className="mt-2 text-sm text-white/55">六爻、奇门、纯技术、综合分别给出结果。批准只写入审批留痕，不会自动下真实订单。</p>
          </div>
          <button disabled={busy} onClick={runNow} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">{busy ? "运行中…" : "立即运行四策略"}</button>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </section>

      <section className="overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.02]">
        <table className="min-w-[1050px] w-full text-left text-sm">
          <thead className="border-b border-white/10 text-white/45">
            <tr><th className="p-4">标的</th><th className="p-4">方法</th><th className="p-4">方向</th><th className="p-4">信心</th><th className="p-4">支撑</th><th className="p-4">压力</th><th className="p-4">理由</th><th className="p-4">操作</th></tr>
          </thead>
          <tbody>
            {grouped.flatMap(([symbol, rows]) => rows.map((item, index) => (
              <tr key={item.id} className="border-b border-white/5 align-top">
                <td className="p-4 font-semibold">{index === 0 ? `${item.displayName} ${symbol}` : ""}{item.researchOnly ? <div className="mt-1 text-xs text-amber-300">研究观察</div> : null}</td>
                <td className="p-4">{sleeveName[item.sleeve]}</td>
                <td className="p-4">{sideText(item.side)}</td>
                <td className="p-4">{item.confidence ? `${item.confidence}%` : "—"}</td>
                <td className="p-4">{item.support ?? "—"}</td>
                <td className="p-4">{item.resistance ?? "—"}</td>
                <td className="max-w-[360px] p-4 text-white/65">{item.reason}{item.technicalNote ? <div className="mt-1 text-xs text-white/35">{item.technicalNote}</div> : null}</td>
                <td className="p-4">{item.eligibleForApproval && item.side !== "WAIT" ? <button disabled={busy} onClick={() => approve(item)} className="rounded-lg border border-cyan-300/40 px-3 py-1.5 text-cyan-200 disabled:opacity-50">批准候选</button> : <span className="text-white/30">不进入审批</span>}</td>
              </tr>
            )))}
          </tbody>
        </table>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-lg font-semibold">最近审批/信号记录</h2>
        <div className="mt-3 space-y-2 text-sm text-white/55">
          {(data?.history ?? []).slice(0, 30).map((row) => <div key={row.id} className="rounded-xl border border-white/5 p-3">{new Date(row.createdAt).toLocaleString()} · {row.symbol ?? "—"} · {row.code}</div>)}
          {!data?.history?.length ? <p>暂无记录。</p> : null}
        </div>
      </section>
    </main>
  );
}
