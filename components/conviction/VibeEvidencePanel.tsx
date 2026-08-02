import { Badge, Card, Text } from "@/components/ui";
import { formatDateTimeChina } from "@/lib/utils/datetime";
import type { VibeEvidencePublicView } from "@/types/vibe-evidence";

function scoreTone(score: number): string {
  if (score >= 18) return "text-emerald-300";
  if (score <= -18) return "text-red-300";
  return "text-amber-200";
}

function sourceLabel(mode: VibeEvidencePublicView["sourceMode"]): string {
  if (mode === "VIBE_API") return "实时客观证据";
  if (mode === "MANUAL") return "人工核验证据";
  return "内置证据快照";
}

function freshnessLabel(evidence: VibeEvidencePublicView): string {
  if (evidence.sourceMode === "SEEDED") return "快照（不按实时新鲜度评分）";
  if (evidence.sourceMode === "MANUAL") return `人工记录 · 质量分 ${evidence.freshness}%`;
  return `实时源新鲜度 ${evidence.freshness}%`;
}

export function VibeEvidencePanel({ evidence }: { evidence: VibeEvidencePublicView }) {
  return (
    <Card padding="md" className="space-y-4 border-cyan-400/15 bg-cyan-400/[0.025]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="body" weight="semibold" className="text-white">
              Vibe客观证据
            </Text>
            <Badge variant="outline">{sourceLabel(evidence.sourceMode)}</Badge>
            <Badge variant="outline">月度权重 {evidence.monthlyWeight}%</Badge>
          </div>
          <Text variant="caption" className="mt-1 block text-white/45">
            只作为一种方法票，不直接触发交易，也不回写已经锁定的历史预测。
          </Text>
        </div>
        <div className="text-right">
          <p className={`font-mono text-2xl font-semibold ${scoreTone(evidence.effectiveScore)}`}>
            {evidence.effectiveScore > 0 ? "+" : ""}{evidence.effectiveScore}
          </p>
          <p className="text-caption text-white/45">{evidence.stance}</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {evidence.dimensions.map((item) => (
          <div key={item.key} className="rounded-lg border border-white/[0.07] bg-black/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-caption text-white/55">{item.labelZh}</p>
              <span className={`font-mono text-caption ${item.available ? scoreTone(item.score) : "text-white/25"}`}>
                {item.available ? `${item.score > 0 ? "+" : ""}${item.score}` : "缺失"}
              </span>
            </div>
            <p className="mt-1 text-caption leading-relaxed text-white/45">{item.summary}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="rounded-lg border border-emerald-400/10 p-3">
          <p className="text-caption font-medium text-emerald-200/80">支持证据</p>
          <ul className="mt-2 space-y-1 text-caption text-white/55">
            {evidence.supports.length ? evidence.supports.map((item) => <li key={item}>· {item}</li>) : <li>· 暂无明确支持项</li>}
          </ul>
        </section>
        <section className="rounded-lg border border-red-400/10 p-3">
          <p className="text-caption font-medium text-red-200/80">风险与反对证据</p>
          <ul className="mt-2 space-y-1 text-caption text-white/55">
            {evidence.risks.length ? evidence.risks.map((item) => <li key={item}>· {item}</li>) : <li>· 暂无明确反对项</li>}
          </ul>
        </section>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-caption text-white/40">
        <span>数据完整度 {evidence.completeness}%</span>
        <span>{freshnessLabel(evidence)}</span>
        <span>日度/周度/月度权重 {evidence.dailyWeight}% / {evidence.weeklyWeight}% / {evidence.monthlyWeight}%</span>
        <span>更新 {formatDateTimeChina(evidence.updatedAt)}</span>
      </div>

      {evidence.dataGaps.length ? (
        <details className="rounded-lg border border-white/[0.06] px-3 py-2">
          <summary className="cursor-pointer text-caption text-white/50">查看缺失数据</summary>
          <ul className="mt-2 space-y-1 text-caption text-white/40">
            {evidence.dataGaps.map((item) => <li key={item}>· {item}</li>)}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}
