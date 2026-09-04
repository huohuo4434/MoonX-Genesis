"use client";

import { Badge, Card, Heading, Text } from "@/components/ui";
import { memberSeptemberOutlook as report } from "@/lib/presentation/member-september-outlook";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function MemberSeptemberRotationReport() {
  const { locale } = useLocale();
  const en = locale === "en";
  return (
    <section className="space-y-4" aria-labelledby="september-rotation-title">
      <Card padding="lg" data-conclusion-first="1" className="border-violet-400/25 bg-gradient-to-br from-violet-500/[0.10] via-background to-cyan-500/[0.05]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="default">{en ? "Mr. Yi · September outlook" : "易老师 · 9月研判"}</Badge>
          <Text variant="caption" color="tertiary">{en ? "Updated Sep 4 · V6" : "9月4日更新 · V6"}</Text>
        </div>
        <Heading id="september-rotation-title" as="h2" size="h2" className="mt-5 max-w-5xl">{en ? report.titleEn : report.titleZh}</Heading>
        <Text variant="body" color="secondary" className="mt-3 block max-w-5xl leading-7">{en ? report.conclusionEn : report.conclusionZh}</Text>
        <div className="mt-5 rounded-xl border border-primary/25 bg-primary/[0.06] p-4" data-monthly-action-summary>
          <div className="text-sm font-semibold text-primary">{en ? "What to watch and how to respond" : "怎么看、怎么应对｜先看这里"}</div>
          <ol className="mt-3 grid gap-3 text-sm leading-6 text-foreground-secondary lg:grid-cols-3">
            {(en ? report.executionEn : report.executionZh).map((item, index) => <li key={item} className="flex gap-3"><span className="font-semibold text-primary">{index + 1}.</span><span>{item}</span></li>)}
          </ol>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {report.assets.map((asset) => (
            <article key={asset.symbol} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{asset.symbol} · {en ? asset.nameEn : asset.nameZh}</h3>
                <Badge variant="outline">{en ? asset.directionEn : asset.directionZh}</Badge>
              </div>
              <p className="mt-3 text-xs text-foreground-tertiary">{en ? asset.windowEn : asset.windowZh}</p>
              <p className="mt-2 text-sm leading-6 text-foreground-secondary">{en ? asset.conclusionEn : asset.conclusionZh}</p>
              <details className="mt-3 border-t border-white/10 pt-2 text-xs leading-5 text-foreground-tertiary">
                <summary className="min-h-8 cursor-pointer py-1 font-semibold">{en ? "Confirmation / invalidation" : "展开确认与失效条件"}</summary>
                <p className="mt-2">{en ? "Confirm: " : "确认："}{en ? asset.confirmationEn : asset.confirmationZh}</p>
                <p className="mt-2">{en ? "Invalidate: " : "失效："}{en ? asset.invalidationEn : asset.invalidationZh}</p>
              </details>
            </article>
          ))}
        </div>
      </Card>
      <Card padding="lg" className="border-rose-300/20" data-monthly-risk-outlook>
        <Heading as="h3" size="h3">{en ? "Late-month risk and exit windows" : "月底风险与退出窗口"}</Heading>
        <p className="mt-3 text-sm leading-6 text-foreground-secondary">{en
          ? "Review technology exposure before Sep 21. Sep 27 remains a candidate risk center, not a confirmed event date or bottom. Conflict and transport disruption are possible scenarios, not established facts."
          : "9月21日前重点检查科技仓位；27日前后仍是风险中心候选，不是已确认的事件日或底部。地缘冲突与运输受阻只是可能情景，不是已发生事实。"}</p>
        <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/[0.04] p-4">
          <div className="font-semibold">{en ? report.riskWindow.actionEn : report.riskWindow.actionZh}</div>
          <div className="mt-1 text-xs text-foreground-tertiary">{report.riskWindow.start} — {report.riskWindow.end}</div>
          <p className="mt-2 text-sm leading-6 text-foreground-secondary">{en ? report.riskWindow.noteEn : report.riskWindow.noteZh}</p>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {report.riskItems.map((item) => <article key={item.id} className="rounded-xl border border-white/10 p-4">
            <div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">{en ? item.scopeEn : item.scopeZh}</h4><Badge variant="outline">{en ? item.statusEn : item.statusZh}</Badge></div>
            <p className="mt-2 text-sm leading-6 text-foreground-secondary">{en ? item.conclusionEn : item.conclusionZh}</p>
            <p className="mt-2 text-xs leading-5 text-foreground-tertiary">{en ? item.usageEn : item.usageZh}</p>
          </article>)}
        </div>
      </Card>
      <Card padding="lg" data-forward-confidence-calibration>
        <Heading as="h3" size="h3">{en ? "Method-consensus index" : "方法共振指数"}</Heading>
        <p className="mt-2 text-xs leading-5 text-foreground-tertiary">{en ? "Unchanged this revision. A score of 4/5 is not an 80% win rate or a return guarantee." : "本轮维持。4/5不代表80%命中率，也不代表收益保证。"}</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {report.confidenceItems.map((item) => <article key={item.id} className="rounded-xl border border-white/10 p-4">
            <div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">{en ? item.scopeEn : item.scopeZh}</h4><Badge variant="outline">{item.index}/{item.max}</Badge></div>
            <p className="mt-2 text-sm leading-6 text-foreground-secondary">{en ? item.reasonEn : item.reasonZh}</p>
          </article>)}
        </div>
      </Card>
      <Card padding="lg" data-horizon-outlook>
        <Heading as="h3" size="h3">{en ? "Other assets and longer horizons" : "其他标的与长周期判断"}</Heading>
        <p className="mt-2 text-xs text-foreground-tertiary">{en ? "Keep each asset and horizon separate. Long-term conviction is not a short-term entry signal." : "各标的、各周期分别判断；长期看好不等于短线立即买入。"}</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {report.primaryItems.map((item) => <article key={item.id} className="rounded-xl border border-white/10 p-4">
            <div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">{en ? item.scopeEn : item.scopeZh}</h4><Badge variant="outline">{en ? "Confidence: " : "信心："}{en ? item.confidenceEn : item.confidenceZh}</Badge></div>
            <p className="mt-2 text-sm leading-6 text-foreground-secondary">{en ? item.conclusionEn : item.conclusionZh}</p>
            <p className="mt-2 text-xs leading-5 text-foreground-tertiary">{en ? item.boundaryEn : item.boundaryZh}</p>
          </article>)}
        </div>
      </Card>
      <Card padding="lg">
        <Heading as="h3" size="h3">{en ? "Four-phase rotation map" : "四阶段轮动表"}</Heading>
        <p className="mt-2 text-xs leading-5 text-foreground-tertiary">{en ? "Relative strength does not imply guaranteed inverse correlation. Confirm each asset independently." : "相对强弱不代表每天严格反向，各标的仍需独立确认。"}</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-white/[0.04] text-foreground-tertiary"><tr>{[en ? "Window" : "时间窗", "SOXL", "BTC", "ETH", "GOLD"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/10">{report.phases.map((phase) => <tr key={phase.periodZh}>
              {[en ? phase.periodEn : phase.periodZh, en ? phase.soxlEn : phase.soxlZh, en ? phase.btcEn : phase.btcZh, en ? phase.ethEn : phase.ethZh, en ? phase.goldEn : phase.goldZh].map((cell, index) => <td key={index} className="px-4 py-3 text-foreground-secondary">{cell}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}

