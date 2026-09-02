"use client";

import { Badge, Card, Heading, Text } from "@/components/ui";
import { MEMBER_SEPTEMBER_ROTATION_REPORT_20260826 as report } from "@/lib/data/member-september-rotation-report-20260826";
import { QIMEN_CYCLE_PATTERN_SOURCE_20260901 as cyclePattern } from "@/lib/data/qimen-cycle-pattern-source-20260901";
import { useLocale } from "@/lib/i18n/LocaleProvider";

function assetTone(tone: "positive" | "neutral" | "negative") {
  if (tone === "positive") return "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200";
  if (tone === "negative") return "border-rose-400/25 bg-rose-400/[0.06] text-rose-200";
  return "border-amber-300/25 bg-amber-300/[0.06] text-amber-100";
}
function cellTone(value: string) {
  if (/强|高位候选|Strength|Strong|high zone/i.test(value)) return "text-emerald-200";
  if (/回调|退守|受限|风险|pullback|Defensive|Capped|risk/i.test(value)) return "text-rose-200";
  return "text-foreground-secondary";
}

export function MemberSeptemberRotationReport() {
  const { locale } = useLocale();
  const en = locale === "en";

  return (
    <section className="space-y-4" aria-labelledby="september-rotation-title">
      <Card padding="lg" data-conclusion-first="1" className="overflow-hidden border-violet-400/25 bg-gradient-to-br from-violet-500/[0.10] via-background to-cyan-500/[0.05]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">{en ? "September member briefing" : "9月会员月报"}</Badge>
            <Badge variant="outline">{en ? "Partial cross-horizon alignment" : "跨周期部分共振"}</Badge>
          </div>
          <Text variant="caption" color="tertiary">{en ? "Forward record · Aug 26" : "前瞻记录 · 8月26日"}</Text>
        </div>

        <Heading id="september-rotation-title" as="h2" size="h2" className="mt-5 max-w-5xl">
          {en ? report.titleEn : report.titleZh}
        </Heading>
        <Text variant="body" color="secondary" className="mt-3 block max-w-5xl leading-7">
          {en ? report.conclusionEn : report.conclusionZh}
        </Text>

        <div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/[0.055] p-4" data-primary-liuyao-update>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">{en ? report.primaryUpdate.publicLabelEn : report.primaryUpdate.publicLabelZh}</Badge>
            <Badge variant="outline">{en ? "New forward evidence · Sep 2" : "9月2日新增前瞻证据"}</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-foreground-secondary">{en ? report.primaryUpdate.summaryEn : report.primaryUpdate.summaryZh}</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {report.primaryUpdate.items.map((item) => (
              <article key={item.id} className="rounded-xl border border-white/[0.08] bg-black/15 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{en ? item.scopeEn : item.scopeZh}</span>
                  <span className="rounded-full border border-amber-300/25 px-2.5 py-1 text-xs font-semibold text-amber-100">
                    {item.authority === "PRIMARY" ? (en ? "Primary" : "主判") : (en ? "Auxiliary" : "辅助")} · {en ? item.confidenceEn : item.confidenceZh}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground-secondary">{en ? item.conclusionEn : item.conclusionZh}</p>
                <p className="mt-2 text-xs leading-5 text-foreground-tertiary">{en ? item.boundaryEn : item.boundaryZh}</p>
              </article>
            ))}
          </div>
          <details className="mt-4 border-t border-white/10 pt-3 text-sm text-foreground-secondary" data-method-learning-20260902>
            <summary className="min-h-8 cursor-pointer py-1 font-semibold">{en ? "Method learning from this batch" : "展开：本批资料学到的方法规则"}</summary>
            <ul className="mt-2 space-y-2 leading-6">
              {(en ? report.primaryUpdate.methodLearningEn : report.primaryUpdate.methodLearningZh).map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </details>
        </div>

        <div className="mt-5 rounded-xl border border-rose-300/20 bg-rose-300/[0.045] p-4" data-qimen-monthly-update-20260902>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="warning">{en ? report.qimenMonthlyUpdate.publicLabelEn : report.qimenMonthlyUpdate.publicLabelZh}</Badge>
              <Badge variant="outline">{en ? "Timing auxiliary · no direction override" : "时机辅助 · 不覆盖主判"}</Badge>
            </div>
            <span className="font-mono text-xs text-rose-100">
              {en ? "Risk center: Sep 27" : "风险中心候选：9月27日前后"}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-foreground-secondary">{en ? report.qimenMonthlyUpdate.summaryEn : report.qimenMonthlyUpdate.summaryZh}</p>
          <div className="mt-3 rounded-lg border border-rose-300/15 bg-black/15 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-rose-100">{en ? report.qimenMonthlyUpdate.riskWindow.actionEn : report.qimenMonthlyUpdate.riskWindow.actionZh}</span>
              <span className="text-xs text-foreground-tertiary">{report.qimenMonthlyUpdate.riskWindow.start} — {report.qimenMonthlyUpdate.riskWindow.end}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-foreground-secondary">{en ? report.qimenMonthlyUpdate.riskWindow.noteEn : report.qimenMonthlyUpdate.riskWindow.noteZh}</p>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {report.qimenMonthlyUpdate.items.map((item) => (
              <article key={item.id} className={`rounded-lg border p-3 ${item.relationship === "ALIGNED" ? "border-emerald-300/15 bg-emerald-300/[0.03]" : item.relationship === "CONFLICTED" ? "border-rose-300/20 bg-rose-300/[0.04]" : "border-amber-300/15 bg-amber-300/[0.03]"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">{en ? item.scopeEn : item.scopeZh}</span>
                  <Badge variant="outline">{en ? item.relationshipEn : item.relationshipZh}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-foreground-secondary">{en ? item.conclusionEn : item.conclusionZh}</p>
                <p className="mt-2 text-xs leading-5 text-foreground-tertiary">{en ? item.usageEn : item.usageZh}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.045] p-4" data-forward-confidence-calibration>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">{en ? report.confidenceCalibration.publicLabelEn : report.confidenceCalibration.publicLabelZh}</Badge>
            <Badge variant="outline">{en ? report.confidenceCalibration.metricEn : report.confidenceCalibration.metricZh}</Badge>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {report.confidenceCalibration.items.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/[0.07] bg-black/15 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">{en ? item.scopeEn : item.scopeZh}</span>
                  <span className="rounded-full border border-emerald-300/25 px-2.5 py-1 text-xs font-semibold text-emerald-100">
                    {en ? "Consensus" : "共振指数"} {item.index}/{item.max} · +{item.delta}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-foreground-secondary">{en ? item.reasonEn : item.reasonZh}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-foreground-tertiary">{en ? report.confidenceCalibration.unchangedEn : report.confidenceCalibration.unchangedZh}</p>
        </div>

        <div className="mt-5 rounded-xl border border-primary/25 bg-primary/[0.06] p-4" data-monthly-action-summary>
          <div className="text-sm font-semibold text-primary">{en ? "Trading plan first" : "做单建议｜先看这里"}</div>
          <ol className="mt-3 grid gap-3 text-sm leading-6 text-foreground-secondary lg:grid-cols-3">
            {(en ? report.executionEn : report.executionZh).map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {report.assets.map((asset) => (
            <div key={asset.symbol} className={`rounded-xl border p-4 ${assetTone(asset.tone)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs opacity-70">{asset.symbol}</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{en ? asset.nameEn : asset.nameZh}</div>
                </div>
                <div className="rounded-full border border-current/25 px-2.5 py-1 text-xs font-semibold">
                  {en ? asset.directionEn : asset.directionZh}
                </div>
              </div>
              <div className="mt-4 text-xs opacity-75">{en ? asset.windowEn : asset.windowZh}</div>
              <p className="mt-1 text-sm leading-6 text-foreground-secondary">{en ? asset.conclusionEn : asset.conclusionZh}</p>
              <details className="mt-3 border-t border-white/10 pt-2 text-xs leading-5 text-foreground-tertiary">
                <summary className="min-h-8 cursor-pointer py-1 font-semibold text-foreground-secondary">{en ? "Confirmation / invalidation" : "展开确认与失效条件"}</summary>
                <div className="mt-1 space-y-2">
                  <p><span className="font-semibold text-foreground-secondary">{en ? "Confirm: " : "确认："}</span>{en ? asset.confirmationEn : asset.confirmationZh}</p>
                  <p><span className="font-semibold text-foreground-secondary">{en ? "Invalidate: " : "失效："}</span>{en ? asset.invalidationEn : asset.invalidationZh}</p>
                </div>
              </details>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="lg" className="border-cyan-300/20 bg-cyan-300/[0.025]" data-cycle-pattern-crosscheck>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{en ? cyclePattern.publicLabelEn : cyclePattern.publicLabelZh}</Badge>
          <Badge variant="success">{en ? "Partial same-window resonance" : cyclePattern.september2026.relationshipZh}</Badge>
          <Badge variant="outline">{en ? "Monthly climate: medium-high" : "月度环境信心：中高"}</Badge>
        </div>
        <Heading as="h3" size="h3" className="mt-4">
          {en ? "September cross-check: a recovery window, not a lasting reversal" : "9月周期复核：修复窗口成立，但不是长期反转"}
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 block max-w-5xl leading-6">
          {en ? cyclePattern.september2026.sourceConclusionEn : cyclePattern.september2026.sourceConclusionZh}
        </Text>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.035] p-4">
            <div className="text-sm font-semibold text-emerald-200">{en ? "Where it aligns" : "与现有预测一致的地方"}</div>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-foreground-secondary">
              {(en ? cyclePattern.september2026.alignedEn : cyclePattern.september2026.alignedZh).map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-4">
            <div className="text-sm font-semibold text-amber-100">{en ? "What it cannot prove" : "不能外推的边界"}</div>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-foreground-secondary">
              {(en ? cyclePattern.september2026.boundariesEn : cyclePattern.september2026.boundariesZh).map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <div className="text-sm font-semibold text-foreground">{en ? "How MOOX uses it" : "系统如何采用"}</div>
            <p className="mt-2 text-sm leading-6 text-foreground-secondary">
              {en
                ? "The cross-market September-to-October transition moves from medium to medium-high research confidence. Asset directions, probabilities, levels and trading permissions are unchanged."
                : cyclePattern.september2026.confidenceScopeZh}
            </p>
            <p className="mt-3 text-xs leading-5 text-foreground-tertiary">
              {en
                ? "Older June and August material teaches the method only and is not backfilled into accuracy statistics."
                : cyclePattern.historyPolicy.reasonZh}
            </p>
          </div>
        </div>
        <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4" data-cycle-pattern-method-loop>
          <summary className="min-h-8 cursor-pointer py-1 text-sm font-semibold text-foreground-secondary">
            {en ? "How the cycle-pattern review is produced" : "展开：周期格局流派的研判闭环"}
          </summary>
          <div className="mt-3 border-t border-white/10 pt-3">
            <ol className="grid gap-2 text-sm leading-6 text-foreground-secondary md:grid-cols-2">
              {cyclePattern.analysisLoop.map((item) => (
                <li key={item.step} className="flex gap-3 rounded-lg border border-white/[0.06] bg-background/20 p-3">
                  <span className="text-xs font-semibold text-cyan-200">{String(item.step).padStart(2, "0")}</span>
                  <span>
                    <span className="font-semibold text-foreground">{en ? item.titleEn : item.titleZh}</span>
                    <span className="mt-1 block text-foreground-tertiary">{en ? item.detailEn : item.detailZh}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs leading-5 text-amber-100/80">
              {en
                ? "Historical monthly cases teach the workflow only. They are not backfilled into accuracy statistics and cannot change an asset forecast or trading permission."
                : cyclePattern.historyPolicy.reasonZh}
            </p>
          </div>
        </details>
      </Card>

      <Card padding="lg" className="space-y-4">
        <div>
          <Heading as="h3" size="h3">{en ? "Four-phase rotation map" : "四阶段轮动表"}</Heading>
          <Text variant="body-sm" color="tertiary" className="mt-1 block">
            {en ? "Read horizontally by time and vertically by asset. This is relative strength, not guaranteed inverse correlation." : "横向看时间，纵向看资产；展示的是相对强弱，不代表每天严格反向。"}
          </Text>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-xs text-foreground-tertiary">
              <tr>
                <th className="px-4 py-3 font-medium">{en ? "Window" : "时间窗"}</th>
                <th className="px-4 py-3 font-medium">SOXL · {en ? "Semis" : "半导体"}</th>
                <th className="px-4 py-3 font-medium">BTC · {en ? "Bitcoin" : "比特币"}</th>
                <th className="px-4 py-3 font-medium">ETH · {en ? "Ether" : "以太坊"}</th>
                <th className="px-4 py-3 font-medium">GOLD · {en ? "Gold" : "黄金"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {report.phases.map((phase) => {
                const soxl = en ? phase.soxlEn : phase.soxlZh;
                const btc = en ? phase.btcEn : phase.btcZh;
                const eth = en ? phase.ethEn : phase.ethZh;
                const gold = en ? phase.goldEn : phase.goldZh;
                return (
                  <tr key={phase.periodZh} className="bg-background/20">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-foreground">{en ? phase.periodEn : phase.periodZh}</td>
                    <td className={`px-4 py-3 ${cellTone(soxl)}`}>{soxl}</td>
                    <td className={`px-4 py-3 ${cellTone(btc)}`}>{btc}</td>
                    <td className={`px-4 py-3 ${cellTone(eth)}`}>{eth}</td>
                    <td className={`px-4 py-3 ${cellTone(gold)}`}>{gold}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card padding="md">
        <details>
          <summary className="min-h-9 cursor-pointer py-1 text-sm font-semibold text-foreground-secondary">
            {en ? "Why this is only partial resonance" : "展开：共振依据与边界"}
          </summary>
          <div className="mt-3 grid gap-3 border-t border-white/10 pt-3 lg:grid-cols-2">
            <Text variant="body-sm" color="secondary" className="block leading-6">{en ? report.resonanceEn : report.resonanceZh}</Text>
            <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-3 text-sm leading-6 text-amber-100/90">
              {en ? report.inferenceEn : report.inferenceZh}
            </div>
          </div>
        </details>
      </Card>
    </section>
  );
}

