// MOOX_V72080_RESEARCH_INTEGRITY_ADMIN
import type { ReactNode } from "react";
import { requireAdminOrRedirect } from "@/lib/auth/permissions";
import { getChinaDateKey } from "@/lib/date/china-date";
import { buildResearchIntegrityAudit } from "@/lib/research-integrity/audit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Pill({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <span className={`rounded-full border px-2 py-1 text-xs ${ok ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200" : "border-rose-400/20 bg-rose-500/10 text-rose-200"}`}>{children}</span>;
}

export default async function ResearchIntegrityPage() {
  await requireAdminOrRedirect("/admin/research-integrity");
  const now = new Date();
  const asOfDate = getChinaDateKey(now);
  const audit = buildResearchIntegrityAudit({ asOfDate, nowMs: now.getTime() });

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
        <p className="text-xs tracking-[0.18em] text-cyan-200/60">RESEARCH INTEGRITY</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">研究完整性自检</h1>
        <p className="mt-2 text-sm text-white/55">{asOfDate} · 九大市场 {audit.summary.coreOk}/{audit.summary.coreTotal} · 重点关注 {audit.summary.focusOk}/{audit.summary.focusTotal} · 缺项 {audit.summary.criticalIssues}</p>
      </div>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-xl font-semibold text-white">九大市场</h2>
        <div className="mt-4 overflow-x-auto"><table className="min-w-[1180px] w-full text-left text-sm"><thead className="text-white/40"><tr><th className="p-3">市场</th><th className="p-3">周研究</th><th className="p-3">周方向</th><th className="p-3">六爻今日</th><th className="p-3">奇门今日</th><th className="p-3">六爻次日</th><th className="p-3">奇门次日</th><th className="p-3">1H技术位</th><th className="p-3">状态</th></tr></thead><tbody className="divide-y divide-white/6">{audit.core.map((row) => <tr key={row.key}><td className="p-3 text-white">{row.label} <span className="text-white/35">{row.key}</span></td><td className="p-3"><Pill ok={row.weeklySource}>{row.weeklySource ? "已就绪" : "缺失"}</Pill></td><td className="p-3 text-white/70">{row.weeklyDirection ?? "—"}</td><td className="p-3 text-white/70">{row.todayLiuyao ?? "—"}</td><td className="p-3 text-violet-100/70">{row.todayQimen ?? "—"}</td><td className="p-3 text-white/70">{row.nextLiuyao ?? "—"}</td><td className="p-3 text-violet-100/70">{row.nextQimen ?? "—"}</td><td className="p-3"><Pill ok={row.intraday1h}>{row.intraday1h ? "1H" : "缺失"}</Pill></td><td className="p-3 text-white/55">{row.issues.join("；") || "完整"}</td></tr>)}</tbody></table></div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-xl font-semibold text-white">重点关注</h2>
        <div className="mt-4 overflow-x-auto"><table className="min-w-[1200px] w-full text-left text-sm"><thead className="text-white/40"><tr><th className="p-3">资产</th><th className="p-3">正式来源</th><th className="p-3">六爻今日</th><th className="p-3">奇门今日</th><th className="p-3">六爻次日</th><th className="p-3">奇门次日</th><th className="p-3">1H</th><th className="p-3">状态</th></tr></thead><tbody className="divide-y divide-white/6">{audit.focus.map((row) => <tr key={row.assetId}><td className="p-3 text-white">{row.label}<div className="text-xs text-white/30">{row.assetId}</div></td><td className="p-3 text-white/65">{row.authorityType ?? "—"}<div className="text-xs text-white/35">{row.authorityDirection ?? "—"}</div></td><td className="p-3 text-white/70">{row.todayLiuyao ?? "—"}</td><td className="p-3 text-violet-100/70">{row.todayQimen ?? "—"}<div className="text-xs text-white/30">{row.todayRelation ?? ""}</div></td><td className="p-3 text-white/70">{row.nextLiuyao ?? "—"}</td><td className="p-3 text-violet-100/70">{row.nextQimen ?? "—"}<div className="text-xs text-white/30">{row.nextRelation ?? ""}</div></td><td className="p-3"><Pill ok={row.intraday1h}>{row.intraday1h ? "1H" : "缺失"}</Pill></td><td className="p-3 text-white/55">{row.issues.join("；") || "完整"}</td></tr>)}</tbody></table></div>
      </section>
    </main>
  );
}
