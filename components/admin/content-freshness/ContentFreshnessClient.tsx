"use client";

import { useState } from "react";
import type { ContentFreshnessReport } from "@/types/content-freshness";

export function ContentFreshnessClient({ initial }: { initial: ContentFreshnessReport }) {
  const [report, setReport] = useState(initial);
  const [loading, setLoading] = useState(false);
  async function run() {
    setLoading(true);
    const res = await fetch("/api/admin/content-freshness", { method: "POST" });
    const json = await res.json().catch(() => ({})) as { report?: ContentFreshnessReport };
    if (json.report) setReport(json.report);
    setLoading(false);
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-400">北京时间 {report.beijingDate} · 最后自检 {new Date(report.generatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</div>
        <button onClick={run} disabled={loading} className="rounded-lg border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-sm text-violet-100 disabled:opacity-50">{loading ? "自检中…" : "立即更新并自检"}</button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-slate-300"><tr><th className="px-4 py-3">版块</th><th className="px-4 py-3">固定更新规则</th><th className="px-4 py-3">最晚要求</th><th className="px-4 py-3">当前状态</th><th className="px-4 py-3">处理方式</th></tr></thead>
          <tbody>
            {report.policies.map((policy) => {
              const item = report.items.find((row) => row.key === policy.key);
              return <tr key={policy.key} className="border-t border-white/10 align-top"><td className="px-4 py-3 font-medium text-white">{policy.label}</td><td className="px-4 py-3 text-slate-300">{policy.scheduleZh}</td><td className="px-4 py-3 text-slate-400">{policy.hardDeadlineZh}</td><td className="px-4 py-3"><span className={item?.status === "OK" ? "text-emerald-300" : "text-amber-300"}>{item?.status ?? "—"}</span><div className="mt-1 max-w-md text-xs leading-5 text-slate-500">{item?.detailZh ?? "等待检查"}</div></td><td className="px-4 py-3 text-slate-400">{policy.repairMode === "AUTO" ? "自动补跑" : "仅报警，不伪造研究"}<div className="mt-1 text-xs text-slate-500">{policy.noteZh}</div></td></tr>;
            })}
          </tbody>
        </table>
      </div>
      {report.repairs.length ? <div className="rounded-2xl border border-white/10 p-4"><h2 className="font-medium text-white">本轮自动修复</h2><div className="mt-3 space-y-2">{report.repairs.map((repair, index) => <div key={`${repair.key}-${index}`} className="text-sm text-slate-300"><span className={repair.ok ? "text-emerald-300" : "text-rose-300"}>{repair.ok ? "✓" : "✕"}</span> {repair.actionZh} · {repair.detailZh}</div>)}</div></div> : null}
      <p className="text-xs leading-5 text-slate-500">{report.noteZh}</p>
    </div>
  );
}
