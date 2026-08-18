"use client";

import { useMemo, useState } from "react";
import type { XOpinionMatrix, XOpinionCell, XOpinionApprovalStatus } from "@/types/x-opinion-matrix";

type Props = { initial: XOpinionMatrix };

type Draft = { weightPct: number; displayAllowed: boolean };

function directionLabel(cell: XOpinionCell): string {
  return cell.direction === "LONG" ? "看多" : cell.direction === "SHORT" ? "看空" : "中性";
}

function dirClass(cell: XOpinionCell): string {
  return cell.direction === "LONG" ? "text-emerald-300" : cell.direction === "SHORT" ? "text-rose-300" : "text-slate-300";
}

function shortTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function XOpinionMatrixClient({ initial }: Props) {
  const [matrix, setMatrix] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const approvedCount = useMemo(() => matrix.rows.reduce((sum, row) => sum + Object.values(row.cells).filter((cell) => cell?.approval?.status === "APPROVED").length, 0), [matrix]);

  function cellKey(cell: XOpinionCell) { return `${cell.username}:${cell.postId}:${cell.symbol}`; }
  function draftFor(cell: XOpinionCell): Draft {
    return drafts[cellKey(cell)] ?? { weightPct: cell.approval?.weightPct ?? 5, displayAllowed: cell.approval?.displayAllowed ?? false };
  }

  async function save(cell: XOpinionCell, status: XOpinionApprovalStatus) {
    const key = cellKey(cell);
    const draft = draftFor(cell);
    setBusy(key); setMessage(null);
    const res = await fetch("/api/admin/x-opinions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: cell.username, postId: cell.postId, symbol: cell.symbol, status, ...draft }),
    });
    const json = await res.json().catch(() => ({})) as { approval?: XOpinionCell["approval"]; error?: string };
    setBusy(null);
    if (!res.ok || !json.approval) { setMessage(json.error ?? "保存失败"); return; }
    setMatrix((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => ({
        ...row,
        cells: Object.fromEntries(Object.entries(row.cells).map(([symbol, current]) => [symbol, current && cellKey(current) === key ? { ...current, approval: json.approval ?? null } : current])),
      })),
    }));
    setMessage(status === "APPROVED" ? "已批准：后续新生成预测会读取该权重。" : status === "REJECTED" ? "已拒绝。" : "已恢复待审核。");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
        <span>最近 {matrix.lookbackDays} 天 · 已批准 {approvedCount} 条 · 表格仅管理员可见</span>
        {message ? <span className="text-amber-200">{message}</span> : null}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
        <table className="min-w-[2200px] w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[#11131b] text-slate-300">
            <tr>
              <th className="sticky left-0 z-20 w-48 border-b border-r border-white/10 bg-[#11131b] px-3 py-3">博主 / 方法组</th>
              {matrix.assets.map((asset) => <th key={asset.code} className="min-w-40 border-b border-white/10 px-3 py-3">{asset.label}<div className="text-[10px] text-slate-500">{asset.code}</div></th>)}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.username} className="align-top">
                <td className="sticky left-0 z-10 border-b border-r border-white/10 bg-[#0d0f16] px-3 py-3">
                  <div className="font-semibold text-white">@{row.username}</div>
                  <div className="mt-1 text-[10px] text-slate-500">{row.family}</div>
                </td>
                {matrix.assets.map((asset) => {
                  const cell = row.cells[asset.code];
                  if (!cell) return <td key={asset.code} className="border-b border-white/10 px-3 py-3 text-slate-600">—</td>;
                  const draft = draftFor(cell);
                  const key = cellKey(cell);
                  return (
                    <td key={asset.code} className="border-b border-white/10 px-3 py-3">
                      <div className={`font-semibold ${dirClass(cell)}`}>{directionLabel(cell)} · {cell.confidence}%</div>
                      <div className="mt-1 line-clamp-3 leading-5 text-slate-300" title={cell.summary}>{cell.summary}</div>
                      {cell.levels.length ? <div className="mt-1 text-sky-200">点位 {cell.levels.join(" / ")}</div> : null}
                      {cell.timeWindows.length ? <div className="mt-1 text-violet-200">时间 {cell.timeWindows.join(" / ")}</div> : null}
                      <div className="mt-1 text-[10px] text-slate-500">{shortTime(cell.postedAt)}</div>
                      <div className="mt-2 flex items-center gap-1">
                        <select className="rounded border border-white/10 bg-black/40 px-1 py-1" value={draft.weightPct} onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: { ...draft, weightPct: Number(e.target.value) } }))}>
                          {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}%</option>)}
                        </select>
                        <label className="flex items-center gap-1 whitespace-nowrap text-[10px] text-slate-400"><input type="checkbox" checked={draft.displayAllowed} onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: { ...draft, displayAllowed: e.target.checked } }))}/>可展示</label>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <button disabled={busy === key} onClick={() => save(cell, "APPROVED")} className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-200 disabled:opacity-40">批准</button>
                        <button disabled={busy === key} onClick={() => save(cell, "REJECTED")} className="rounded bg-rose-500/15 px-2 py-1 text-rose-200 disabled:opacity-40">拒绝</button>
                        <button disabled={busy === key} onClick={() => save(cell, "PENDING")} className="rounded bg-white/5 px-2 py-1 text-slate-300 disabled:opacity-40">待审</button>
                      </div>
                      {cell.approval ? <div className="mt-1 text-[10px] text-slate-500">当前 {cell.approval.status} · {cell.approval.weightPct}%{cell.approval.displayAllowed ? " · 可展示" : ""}</div> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-5 text-slate-500">批准只影响以后新生成的预测版本，不回写已锁定历史。管理员权重只调整情景概率与风险提示，不能单独覆盖奇门正式方向，也不能单独触发实盘。</p>
    </div>
  );
}
