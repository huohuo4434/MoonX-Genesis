import type { TeacherMethodRulebook, TeacherMethodRuleStatus, TeacherResearchEvaluation } from "@/types/teacher-method-rulebook";
import { PUBLIC_ATTRIBUTION_DISCLOSURE_ZH,PUBLIC_INTERPRETATION_LABEL_ZH,publicAttributionText } from "@/lib/presentation/public-attribution";

const STATUS_LABEL: Record<TeacherMethodRuleStatus, string> = {
  TEACHER_CONFIRMED_RULE: "方法规则",
  CASE_DERIVED_RULE: "案例归纳，待继续验证",
  MOOX_INTERPRETATION: "MOOX研究政策",
  MISSING_RULE: "原资料缺失，禁止补造",
};

export function TeacherMethodRulebookPanel({ rulebook, evaluation }: { rulebook: TeacherMethodRulebook; evaluation: TeacherResearchEvaluation }) {
  return <details className="mt-4 rounded-2xl border border-white/10 p-5">
    <summary className="cursor-pointer font-semibold">{PUBLIC_INTERPRETATION_LABEL_ZH} · 方法规则与缺失项</summary>
    <p className="mt-3 text-sm leading-6 text-zinc-400">版本 {rulebook.version} · RESEARCH_ONLY。{PUBLIC_ATTRIBUTION_DISCLOSURE_ZH}</p>
    <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm text-amber-100">研究检查：{evaluation.action}</b><span className="text-xs text-zinc-500">方向权威 {evaluation.direction}</span></div>
      <p className="mt-2 text-xs leading-6 text-zinc-400">{evaluation.hardWaitReasons.length ? `等待原因：${evaluation.hardWaitReasons.join(" · ")}` : "四类证据完整且同向；仅形成研究候选，不具备交易资格。"}</p>
      <p className="mt-1 text-[11px] text-zinc-600">RESEARCH_ONLY · tradingEligible=false</p>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {rulebook.rules.map((rule) => <article key={rule.id} className="rounded-xl border border-white/10 bg-black/15 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm text-zinc-100">{publicAttributionText(rule.title)}</b><span className="text-[11px] text-amber-200/75">{STATUS_LABEL[rule.status]}</span></div>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{publicAttributionText(rule.summary)}</p>
      </article>)}
    </div>
    <p className="mt-4 text-xs text-zinc-500">内部来源与原始路径仅供管理员审计；会员展示不公开外部身份、原文或文件路径。</p>
  </details>;
}
