"use client";

import Link from "next/link";
import { useState } from "react";
import { PriceLevelsBlock } from "@/components/forecasts/PriceLevelsBlock";
import { ForecastEvidencePanel } from "@/components/forecasts/ForecastEvidencePanel";
import { VibeEvidencePanel } from "@/components/conviction/VibeEvidencePanel";
import { FocusDossierPanel } from "@/components/conviction/FocusDossierPanel";
import { KeyPersonContextPanel } from "@/components/conviction/KeyPersonContextPanel";
import { UnifiedDossierDisclosure } from "@/components/conviction/UnifiedDossierDisclosure";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import { formatMarketCapDisplay } from "@/lib/data/conviction/format-market-cap";
import { dailyPathTemporalStatus, prioritizeDailyPath } from "@/lib/data/conviction/freshness";
import { buildForecastModuleEvidence } from "@/lib/methodology/evidence";
import { mooxDirectionLabelZh, mooxPrimaryDirection, mooxTechnicalReferenceZh } from "@/lib/forecasts/moox-direction-doctrine";
import { assetVenue } from "@/lib/presentation/asset-catalog";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";
import type { ConvictionDetailPayload, ConvictionPeriodSlot } from "@/lib/data/conviction/access";
import type {
  MemberStockDailyMemberView,
  MemberStockWeeklyMemberView,
} from "@/types/member-stock";


function cleanResearchText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/MOOX唯一方向[:：]?/g, "")
    .replace(/唯一方向/g, "方向")
    .replace(/技术分析只(?:负责|寻找)[^。；]*(?:。|；)?/g, "")
    .replace(/技术只(?:负责|决定)[^。；]*(?:。|；)?/g, "")
    .replace(/[^。；]*(?:不推翻|不覆盖|不反向修改|不改变)[^。；]*(?:。|；)?/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function ProbRow({ p }: { p: { up: number; flat: number; down: number } }) {
  return (
    <Text variant="caption" className="block text-white/45">
      上涨 {p.up}% · 震荡 {p.flat}% · 下跌 {p.down}%
    </Text>
  );
}

function DailyPanel({ title, forecast }: { title: string; forecast: MemberStockDailyMemberView }) {
  return (
    <Card padding="md" className="min-w-0 space-y-2 overflow-hidden border-white/[0.08] bg-[#0c0e12]">
      <Text variant="body" weight="semibold" className="text-white">
        {title}
      </Text>
      <Text variant="caption" className="block text-white/45">
        预测日期：{forecast.forecastDate}
      </Text>
      <Badge variant="outline">{mooxDirectionLabelZh(forecast.direction)}</Badge>
      <ProbRow p={forecast.probabilities} />
      <Text variant="body-sm" className="block break-words font-semibold text-white/85">
        方向：{mooxDirectionLabelZh(forecast.direction)}
      </Text>
      <Text variant="caption" className="block break-words text-white/55">
        运行说明：{forecast.headline}
      </Text>
      <Text variant="caption" className="block break-words text-white/55">
        盘中运行顺序：{forecast.expectedPath || forecast.pathDirection}
      </Text>
      <PriceLevelsBlock
        support={forecast.keySupport}
        resistance={forecast.keyResistance}
        invalidation={forecast.invalidation}
        confirmation={forecast.confirmation}
      />
      <ForecastEvidencePanel
        items={buildForecastModuleEvidence({
          directionLabel: forecast.direction,
          summary: forecast.headline,
          expectedPath: forecast.expectedPath ? [forecast.expectedPath] : undefined,
          probabilities: forecast.probabilities,
          supportLevels: forecast.keySupport,
          resistanceLevels: forecast.keyResistance,
          invalidation: forecast.invalidation,
          confirmation: forecast.confirmation,
        })}
      />
    </Card>
  );
}

function WeeklyPanel({ weekly }: { weekly: MemberStockWeeklyMemberView }) {
  return (
    <Card padding="md" className="min-w-0 space-y-2 overflow-hidden border-white/[0.08] bg-[#0c0e12]">
      <Text variant="body" weight="semibold" className="text-white">
        本周分析
      </Text>
      <Badge variant="outline">{mooxDirectionLabelZh(weekly.overallDirection)}</Badge>
      <ProbRow p={weekly.probabilities} />
      <Text variant="body-sm" className="block break-words font-semibold text-white/85">
        方向：{mooxDirectionLabelZh(weekly.overallDirection)}
      </Text>
      <Text variant="caption" className="block break-words text-white/55">
        运行说明：{weekly.headline}
      </Text>
      <PriceLevelsBlock
        support={weekly.keySupport}
        resistance={weekly.keyResistance}
        invalidation={weekly.invalidation}
        confirmation={weekly.confirmation}
      />
    </Card>
  );
}

function Stars({ value }: { value: number }) {
  const safe = Math.max(1, Math.min(5, Math.round(value)));
  return (
    <span className="font-mono text-amber-300" aria-label={`${safe}星共识`}>
      {"★".repeat(safe)}
      <span className="text-white/15">{"★".repeat(5 - safe)}</span>
    </span>
  );
}

function tradeCall(direction: string) {
  const primary = mooxPrimaryDirection(direction);
  if (primary === "BULLISH") {
    return { label: "↑ 看涨", note: "当前周期偏多，关注支撑、压力、确认与失效位。", tone: "emerald" as const };
  }
  if (primary === "BEARISH") {
    return { label: "↓ 看跌", note: "当前周期偏空，关注支撑、压力、确认与失效位。", tone: "rose" as const };
  }
  return { label: "↔ 震荡 / 分歧", note: "当前周期分歧较大，重点观察区间、确认与失效位。", tone: "slate" as const };
}

function tradeToneClass(tone: "emerald" | "rose" | "amber" | "slate") {
  if (tone === "emerald") return "border-emerald-300/20 bg-emerald-300/[0.045] text-emerald-100";
  if (tone === "rose") return "border-rose-300/20 bg-rose-300/[0.045] text-rose-100";
  if (tone === "amber") return "border-amber-300/20 bg-amber-300/[0.045] text-amber-100";
  return "border-white/10 bg-white/[0.025] text-white";
}

function PeriodPanel({ slot, asOfDate }: { slot: ConvictionPeriodSlot; asOfDate: string }) {
  if (!slot.forecast) {
    return (
      <Card padding="md" className="border-white/[0.08] bg-[#0c0e12]">
        <Text variant="body-sm" className="text-white/60">
          {slot.emptyZh}
        </Text>
      </Card>
    );
  }
  const f = slot.forecast;
  const directionViews = (f.methodViews ?? []).filter((view) => !/技术|价格|支撑|压力|technical|price|support|resistance/i.test(`${view.label} ${view.id}`));
  const directionEvidence = f.ichingEvidence
    ? `${f.ichingEvidence.primaryHexagram}${f.ichingEvidence.changingHexagram ? ` → ${f.ichingEvidence.changingHexagram}` : ""}。${f.consensusLabel || f.ichingEvidence.notes || "本周期六爻结论。"}`
    : (f.consensusLabel || "本周期六爻结论。");
  const ended = slot.freshnessStatus === "EXPIRED";
  const upcoming = slot.freshnessStatus === "UPCOMING";
  const current = slot.freshnessStatus === "CURRENT";
  return (
    <Card padding="md" className="min-w-0 space-y-5 overflow-hidden border-white/[0.08] bg-[#0c0e12]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="body" weight="semibold" className="text-white">
              {slot.labelZh}分析
            </Text>
            <Badge variant="outline">{mooxDirectionLabelZh(f.direction)}</Badge>
            <Badge variant="outline">风险 {f.riskLevel}</Badge>
            {current ? <Badge variant="outline">当前周期 · 自动定位 {asOfDate}</Badge> : null}{ended ? <Badge variant="outline">历史周期 · 已结束</Badge> : null}{upcoming ? <Badge variant="outline">即将开始</Badge> : null}
          </div>
          <Text variant="caption" className="block text-white/45">
            周期：{f.periodStart} 至 {f.periodEnd}
          </Text>
        </div>
        {f.consensusStars ? (
          <div className="rounded-lg border border-amber-400/15 bg-amber-400/[0.04] px-3 py-2 text-right">
            <p className="text-caption text-white/40">方法共识</p>
            <Stars value={f.consensusStars} />
          </div>
        ) : null}
      </div>

      {(() => {
        const call = tradeCall(f.direction);
        return (
          <section className={`rounded-xl border p-4 ${tradeToneClass(call.tone)}`}>
            <p className="font-mono text-caption uppercase tracking-[0.14em] opacity-60">本周期方向</p>
            <p className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{call.label}</p>
            <p className="mt-2 text-body-sm leading-relaxed opacity-75">{call.note}</p>
          </section>
        );
      })()}

      <section className="space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="font-mono text-caption uppercase tracking-[0.14em] text-white/40">为什么定为{mooxDirectionLabelZh(f.direction)}</p>
        <ProbRow
          p={{
            up: f.upProbability,
            flat: f.sidewaysProbability,
            down: f.downProbability,
          }}
        />
        <Text variant="body-sm" className="block break-words leading-relaxed text-white/80">
          {directionEvidence}
        </Text>
        <Text variant="caption" className="block text-cyan-100/60">
          当前结论与关键依据如下。
        </Text>
        {f.summary ? (
          <details className="rounded-lg border border-white/[0.06] bg-black/10 px-3 py-2">
            <summary className="cursor-pointer text-caption text-white/40">查看原始版本研究摘要</summary>
            <p className="mt-2 text-caption leading-relaxed text-white/50">{cleanResearchText(f.summary)}</p>
          </details>
        ) : null}
      </section>

      <section className="space-y-2">
        <p className="font-mono text-caption uppercase tracking-[0.14em] text-white/40">方向内的运行节奏</p>
        <Text variant="body-sm" className="block break-words leading-relaxed text-white/70">
          {cleanResearchText(f.expectedPath)}
        </Text>
      </section>

      {(f.supportLevels.length || f.resistanceLevels.length || f.confirmationLevel || f.invalidationLevel) ? (
        <section className="grid gap-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.025] p-4 md:grid-cols-2">
          <div>
            <p className="font-mono text-caption uppercase tracking-[0.14em] text-cyan-100/70">关键技术位</p>
            <div className="mt-2 space-y-2 text-body-sm text-white/75">
              {f.supportLevels.length ? <p><span className="text-emerald-200/80">支撑：</span>{f.supportLevels.join(" / ")}</p> : null}
              {f.resistanceLevels.length ? <p><span className="text-rose-200/80">压力：</span>{f.resistanceLevels.join(" / ")}</p> : null}
            </div>
          </div>
          <div>
            <p className="font-mono text-caption uppercase tracking-[0.14em] text-cyan-100/70">执行 / 风控参考</p>
            <div className="mt-2 space-y-2 text-body-sm leading-relaxed text-white/75">
              {f.confirmationLevel ? <p><span className="text-emerald-200/80">跟随参考：</span>{mooxTechnicalReferenceZh(f.confirmationLevel, "follow")}</p> : null}
              {f.invalidationLevel ? <p><span className="text-rose-200/80">风控参考：</span>{mooxTechnicalReferenceZh(f.invalidationLevel, "risk")}</p> : null}
              <p className="text-cyan-100/55">关注支撑、压力、确认与失效位。</p>
            </div>
          </div>
        </section>
      ) : null}

      {f.calendarMonthPath?.length ? (
        <section className="space-y-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.025] p-4">
          <div>
            <p className="font-mono text-caption uppercase tracking-[0.14em] text-cyan-100/75">逐月路线</p>
            <p className="mt-1 text-caption text-white/40">各月独立记录，便于观察节奏变化。</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {f.calendarMonthPath.map((item) => (
              <article key={`${f.id}-${item.period}`} className="rounded-lg border border-white/[0.07] bg-black/15 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-body-sm font-semibold text-white">{item.labelZh}</p>
                  <Badge variant="outline">{mooxDirectionLabelZh(item.direction)}</Badge>
                </div>
                <p className="mt-2 text-caption text-white/45">
                  {item.primaryHexagram}{item.changingHexagram ? ` → ${item.changingHexagram}` : ""}
                </p>
                <p className="mt-2 text-caption leading-relaxed text-white/65">{cleanResearchText(item.summary)}</p>
                {item.sourceNote ? <p className="mt-2 text-caption text-cyan-100/45">来源：{item.sourceNote}</p> : null}
                {item.riskNote ? <p className="mt-2 text-caption leading-relaxed text-amber-100/60">风险：{item.riskNote}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {f.rollingUpdate ? (
        <section className="space-y-2 rounded-lg border border-fuchsia-400/15 bg-fuchsia-400/[0.025] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-caption uppercase tracking-[0.14em] text-fuchsia-200/75">{f.rollingUpdate.label}</p>
            <Badge variant="outline">截至 {formatDateTimeChina(f.rollingUpdate.asOf)}</Badge>
          </div>
          <p className="text-body-sm leading-relaxed text-white/75">{cleanResearchText(f.rollingUpdate.summary)}</p>
          {f.rollingUpdate.originalLockedView ? (
            <p className="text-caption leading-relaxed text-white/45">原始版本：{cleanResearchText(f.rollingUpdate.originalLockedView)}</p>
          ) : null}
          {f.rollingUpdate.timingTolerance ? (
            <p className="text-caption text-fuchsia-100/65">时间规则：{f.rollingUpdate.timingTolerance}</p>
          ) : null}
        </section>
      ) : null}

      {f.dailyPath?.length ? (
        <section className="space-y-3 rounded-xl border border-rose-400/15 bg-gradient-to-br from-rose-400/[0.035] to-transparent p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-caption uppercase tracking-[0.14em] text-rose-200/80">逐日路径</p>
              <p className="mt-1 text-caption text-white/40">页面按北京时间自动定位今天；历史路径、今日进行和后续预测分开显示。星级代表方法共识，不代表涨跌幅。</p>
            </div>
            <Badge variant="outline">日级时间容差 ±1天</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {prioritizeDailyPath(f.dailyPath, asOfDate).map((day) => {
              const temporalStatus = dailyPathTemporalStatus(day.date, asOfDate);
              const displayStatus =
                temporalStatus === "TODAY" ? "今日进行" : temporalStatus === "FUTURE" ? "后续预测" : "历史路径";
              const statusClass =
                temporalStatus === "PAST"
                  ? "border-emerald-400/20 bg-emerald-400/[0.035] text-emerald-200"
                  : temporalStatus === "TODAY"
                    ? "border-sky-400/20 bg-sky-400/[0.035] text-sky-200"
                    : "border-white/10 bg-black/10 text-white/65";
              return (
                <div key={`${f.id}-${day.date}`} className="rounded-lg border border-white/[0.07] bg-black/15 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-body-sm font-semibold text-white">{day.date}{day.ganzhi ? ` · ${day.ganzhi}` : ""}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-caption ${statusClass}`}>{displayStatus}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{mooxDirectionLabelZh(day.direction)}</Badge>
                    <Stars value={day.consensusStars} />
                  </div>
                  <p className="mt-2 text-caption leading-relaxed text-white/65">{cleanResearchText(day.summary)}</p>
                  {day.confirmation ? <p className="mt-2 text-caption text-emerald-200/65">技术跟随参考：{mooxTechnicalReferenceZh(day.confirmation, "follow")}</p> : null}
                  {day.riskNote ? <p className="mt-1 text-caption text-red-200/60">风险：{day.riskNote}</p> : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {f.targetScenarioTests?.length ? (
        <section className="space-y-4 rounded-xl border border-amber-300/20 bg-gradient-to-br from-amber-300/[0.055] via-orange-400/[0.025] to-transparent p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-caption uppercase tracking-[0.14em] text-amber-200/85">9月底目标市值压力测试</p>
              <p className="mt-1 text-caption leading-relaxed text-white/45">四档目标用于比较相对难度，不是统计概率；必须由真实价格、流动性和成交持续性逐级确认。</p>
            </div>
            <Badge variant="outline">两套六爻框架交叉</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {f.targetScenarioTests.map((item) => (
              <article key={`${f.id}-${item.targetMarketCap}`} className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-body font-semibold text-white">{item.targetMarketCap}</p>
                    <p className="mt-1 text-caption text-amber-200/75">{item.tier}</p>
                  </div>
                  <div className="text-right">
                    <Stars value={item.consensusStars} />
                    {item.consensusRange ? <p className="mt-1 text-caption text-white/35">区间：{item.consensusRange}</p> : null}
                  </div>
                </div>
                <p className="mt-3 text-caption text-white/55">卦象：{item.primaryHexagram} → {item.changingHexagram}</p>
                <div className="mt-3 space-y-2 text-caption leading-relaxed">
                  <p className="text-white/65"><span className="text-white/40">结构力量：</span>{item.structureView}</p>
                  <p className="text-white/65"><span className="text-white/40">时序演变：</span>{item.timelineView}</p>
                  <p className="text-amber-100/80"><span className="text-white/40">综合：</span>{item.conclusion}</p>
                  <p className="text-emerald-200/65"><span className="text-white/40">激活条件：</span>{item.activation}</p>
                  <p className="text-red-200/60"><span className="text-white/40">风险：</span>{item.riskNote}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {f.marketContext ? (
        <section className="space-y-2 rounded-lg border border-sky-400/15 bg-sky-400/[0.025] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-caption uppercase tracking-[0.14em] text-sky-200/75">{f.marketContext.label}</p>
            <Badge variant="outline">环境旁证</Badge>
          </div>
          <p className="text-body-sm text-white/70">{f.marketContext.primaryHexagram} → {f.marketContext.changingHexagram} · {f.marketContext.direction}</p>
          <p className="text-caption leading-relaxed text-white/55">{f.marketContext.summary}</p>
          <p className="text-caption leading-relaxed text-sky-100/55">{f.marketContext.note}</p>
        </section>
      ) : null}

      {f.benchmarkEvidence ? (
        <section className="space-y-2 rounded-lg border border-sky-400/12 bg-sky-400/[0.025] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-caption uppercase tracking-[0.14em] text-sky-200/70">与大盘比较</p>
            <Badge variant="outline">{f.benchmarkEvidence.relation}</Badge>
          </div>
          <p className="text-body-sm text-white/70">
            {f.benchmarkEvidence.benchmarkNameZh}（{f.benchmarkEvidence.benchmarkSymbol}）：{f.benchmarkEvidence.benchmarkDirection}
          </p>
          <p className="text-caption leading-relaxed text-white/50">{f.benchmarkEvidence.summary}</p>
        </section>
      ) : null}

      {f.keyDates?.length ? (
        <section className="space-y-3 rounded-lg border border-amber-400/15 bg-amber-400/[0.03] p-4">
          <div>
            <p className="font-mono text-caption uppercase tracking-[0.14em] text-amber-200/70">关键日期</p>
            <p className="mt-1 text-caption text-white/40">仅展示有老师原始规则或正式卦象依据的日期。</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {f.keyDates.map((item, index) => (
              <div key={`${item.date ?? item.branchRule ?? index}-${item.label}`} className="rounded-lg border border-white/[0.07] bg-black/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-body-sm font-semibold text-amber-200">
                    {item.date ?? item.branchRule ?? "干支日期待确认"}
                    {item.ganzhi ? ` · ${item.ganzhi}` : ""}
                  </p>
                  <Badge variant="outline">{item.type}</Badge>
                </div>
                <p className="mt-1 text-caption text-white/70">{item.label}</p>
                <p className="mt-1 text-caption text-white/40">来源：{item.source}{item.confidence ? ` · 置信度${item.confidence}%` : ""}</p>
                {item.note ? <p className="mt-1 text-caption leading-relaxed text-white/50">{item.note}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {directionViews.length ? (
        <section className="space-y-2">
          <p className="font-mono text-caption uppercase tracking-[0.14em] text-white/40">玄学方向票</p>
          <p className="text-caption text-white/40">这里只展示参与方向判断的玄学证据；技术分析不进入方向投票。</p>
          <div className="grid gap-2 md:grid-cols-2">
            {directionViews.map((view) => (
              <div key={view.id} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-body-sm font-medium text-white/80">{view.label}</p>
                  <span className="text-caption text-white/40">权重 {view.weight}%</span>
                </div>
                <p className="mt-1 text-caption text-primary">{view.direction}</p>
                <p className="mt-1 text-caption leading-relaxed text-white/55">{cleanResearchText(view.summary)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <p className="font-mono text-caption uppercase tracking-[0.14em] text-white/40">六爻依据</p>
        <Text variant="body-sm" className="block text-white/75">
          {f.ichingEvidence.primaryHexagram}
          {f.ichingEvidence.changingHexagram ? ` → ${f.ichingEvidence.changingHexagram}` : ""}
        </Text>
        <Text variant="caption" className="block break-words leading-relaxed text-white/50">
          {cleanResearchText(f.ichingEvidence.notes)}
        </Text>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="space-y-2 rounded-lg border border-white/[0.06] p-3">
          <p className="font-mono text-caption uppercase tracking-[0.14em] text-white/40">催化因素</p>
          <ul className="space-y-1 text-caption text-white/60">
            {f.catalysts.length ? f.catalysts.map((item) => <li key={item}>· {item}</li>) : <li>· 暂无独立催化信号</li>}
          </ul>
        </section>
        <section className="space-y-2 rounded-lg border border-white/[0.06] p-3">
          <p className="font-mono text-caption uppercase tracking-[0.14em] text-white/40">主要风险</p>
          <ul className="space-y-1 text-caption text-white/60">
            {f.risks.length ? f.risks.map((item) => <li key={item}>· {item}</li>) : <li>· 暂无独立风险信号</li>}
          </ul>
        </section>
      </div>
    </Card>
  );
}

function LongTermArchive({ periods }: { periods: ConvictionPeriodSlot[] }) {
  const items = periods.filter((slot) => slot.forecast?.archiveSummary);
  if (!items.length) return null;
  return (
    <details className="rounded-xl border border-white/[0.08] bg-[#0c0e12] p-4">
      <summary className="cursor-pointer list-none text-body-sm font-medium text-white/80">
        总趋势资料库
        <span className="ml-2 text-caption font-normal text-white/40">长期材料仅作大方向背景</span>
      </summary>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((slot) => {
          const f = slot.forecast!;
          return (
            <div key={f.id} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-body-sm font-medium text-white/80">{slot.labelZh}</p>
                <Badge variant="outline">{mooxDirectionLabelZh(f.direction)}</Badge>
              </div>
              <p className="mt-2 text-caption leading-relaxed text-white/55">{cleanResearchText(f.archiveSummary)}</p>
              <p className="mt-2 text-caption text-white/35">
                {f.ichingEvidence.primaryHexagram}
                {f.ichingEvidence.changingHexagram ? ` → ${f.ichingEvidence.changingHexagram}` : ""}
              </p>
            </div>
          );
        })}
      </div>
    </details>
  );
}

// MOOX_TSLA_LITE_DERIVED_DAILY_V7187
function pickResearchBasisPeriod(periods: ConvictionPeriodSlot[], asOfDate: string) {
  const published = periods.filter((slot) => Boolean(slot.forecast));
  const active = published.find(
    (slot) => Boolean(slot.forecast) && slot.forecast!.periodStart <= asOfDate && slot.forecast!.periodEnd >= asOfDate
  );
  if (active) return active;
  const upcoming = published
    .filter((slot) => Boolean(slot.forecast) && slot.forecast!.periodStart > asOfDate)
    .sort((a, b) => a.forecast!.periodStart.localeCompare(b.forecast!.periodStart));
  if (upcoming.length) return upcoming[0];
  return published
    .slice()
    .sort((a, b) => b.forecast!.periodEnd.localeCompare(a.forecast!.periodEnd))[0] ?? null;
}


export function ConvictionDetailClient({ payload }: { payload: ConvictionDetailPayload }) {
  const a = payload.public;
  const mcap = formatMarketCapDisplay(a);
  const title = `${a.nameZh}研究档案`;
  const unlockHref = payload.isAuthenticated
    ? "/pricing"
    : `/login?next=${encodeURIComponent(a.detailHref)}`;
  const isStaticPeriodAsset = [
    "tsla",
    "lite",
    "cxmt",
    "asteroid",
    "sandisk",
    "nbis",
    "mu",
    "hype",
    "sol",
    "eth",
    "btc",
    "googl",
    "msft",
    "tencent",
    "kingsoft-office",
    "ganfeng-lithium",
    "lian-tech",
    "lexin-medical",
    "spcx",
    "intel",
  ].includes(a.slug);
  const isAsteroid = a.slug === "asteroid";
  const tabs = payload.periodSlots;
  const lockedResearchCount = tabs.filter((item) => item.hasResearch).length;
  const staticResearchComplete = isStaticPeriodAsset && lockedResearchCount > 0;
  const visibleTypes = new Set(tabs.map((item) => item.type));
  const archivePeriods = payload.forecast?.periods?.filter((item) => !visibleTypes.has(item.type)) ?? [];
  const preferredResearchTab = payload.forecast?.periods
    ? pickResearchBasisPeriod(payload.forecast.periods, payload.asOfDate)?.type
    : tabs.find((item) => item.hasResearch)?.type;
  const [tab, setTab] = useState(preferredResearchTab ?? tabs[0]?.type ?? "WEEK");
  const hasUnifiedDossier = payload.mode === "fullAccess" && Boolean(payload.focusDossier);

  return (
    <div className="min-h-screen bg-[#07080a] text-white">
      <div className="mx-auto w-full max-w-[1240px] space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div>
          <Link
            href="/featured-stocks"
            className="text-caption text-white/45 underline-offset-4 hover:text-white/70 hover:underline"
          >
            ← 返回重点关注
          </Link>
          <Heading as="h1" size="h2" className="mt-3 text-white">
            {isAsteroid ? "Asteroid（太空狗）" : title}
          </Heading>
          <p className="mt-2 font-mono text-body-sm text-white/50">
            {isAsteroid
              ? `ASTEROID · ${assetVenue("ASTEROID")}`
              : `${a.nameEn}${a.aliasZh && a.aliasZh !== a.nameZh ? ` · ${a.aliasZh}` : ""} · ${a.symbol} · ${assetVenue(a.symbol)}`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline">{a.assetType === "STOCK" ? "股票" : a.assetType === "CRYPTO" ? "加密资产" : a.assetType === "ETF" ? "ETF" : a.assetType === "INDEX" ? "指数" : "商品"}</Badge>
            <Badge variant="outline">MOOX评级：{a.rating}</Badge>
            <Badge variant="outline">风险等级：{a.riskLevel}</Badge>
            <Badge variant="outline">{staticResearchComplete ? `多周期研究已更新 · ${lockedResearchCount}个周期` : a.researchStatusZh}</Badge>
          </div>
          <p className="mt-2 text-caption text-white/40">
            最近更新：{formatDateChina(a.researchUpdatedAt)}
          </p>
        </div>

        {payload.mode === "fullAccess" && payload.focusDossier ? (
          <FocusDossierPanel dossier={payload.focusDossier} />
        ) : null}

        {payload.mode === "fullAccess" ? (
          <KeyPersonContextPanel slug={a.slug} asOfDate={payload.asOfDate} resonanceSignal={payload.resonanceSignal} periods={payload.forecast?.periods ?? []} />
        ) : null}

        <UnifiedDossierDisclosure enabled={hasUnifiedDossier} title="资产背景与风险">
        <section className="space-y-3">
          <h2 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">基本面介绍</h2>
          <p className="text-body-sm leading-relaxed text-white/75">{cleanResearchText(a.summaryZh)}</p>
          {mcap ? (
            <div className="space-y-1 text-body-sm text-white/65">
              <p>市值：{mcap.labelZh}</p>
              {mcap.updatedAt ? (
                <p className="text-caption text-white/45">
                  市值更新时间：{formatDateTimeChina(mcap.updatedAt)}
                </p>
              ) : null}
            </div>
          ) : null}
          {a.contractAddress ? (
            <p className="break-all text-body-sm text-white/65">
              合约地址：<span className="font-mono text-caption">{a.contractAddress}</span>
            </p>
          ) : a.contractPendingAdminConfirm ? (
            <p className="text-caption text-white/50">合约信息尚未公开。</p>
          ) : null}
          {a.network ? (
            <p className="text-body-sm text-white/65">所属链：{a.network}</p>
          ) : null}
          
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">为什么关注</h2>
          <ul className="space-y-2">
            {a.thesisZh.map((line) => (
              <li key={line} className="text-body-sm text-white/75">
                · {cleanResearchText(line)}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">催化剂</h2>
          <div className="flex flex-wrap gap-2">
            {a.catalystsZh.map((c) => (
              <Badge key={c} variant="outline" className="border-white/12 text-white/70">
                {c}
              </Badge>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">主要风险</h2>
          <ul className="space-y-1.5">
            {a.risksZh.map((r) => (
              <li key={r} className="text-body-sm text-white/65">
                · {r}
              </li>
            ))}
          </ul>
        </section>
        </UnifiedDossierDisclosure>

        {payload.deviceAccessRequired ? (
          <Card padding="md" className="border-amber-400/20 bg-amber-400/[0.05]">
            <Text variant="body-sm" className="text-amber-100">
              当前付费账号需要确认本设备后才能显示完整研究。<Link className="ml-1 underline" href="/account#account-security">管理登录设备</Link>
            </Text>
          </Card>
        ) : null}

        <UnifiedDossierDisclosure enabled={hasUnifiedDossier} title="完整研究依据与历史版本">
        {payload.mode === "fullAccess" && payload.vibeEvidence ? (
          <VibeEvidencePanel evidence={payload.vibeEvidence} />
        ) : null}

        {payload.mode === "fullAccess" && payload.resonanceSignal ? (
          <section className={`rounded-2xl border p-5 ${payload.resonanceSignal.direction === "BULLISH" ? "border-emerald-300/25 bg-emerald-300/[0.045]" : payload.resonanceSignal.direction === "BEARISH" ? "border-rose-300/25 bg-rose-300/[0.045]" : "border-amber-300/20 bg-amber-300/[0.035]"}`}>
            <p className="font-mono text-caption uppercase tracking-[0.16em] text-white/45">多周期共振</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{payload.resonanceSignal.direction === "BULLISH" ? "↑ 看涨" : payload.resonanceSignal.direction === "BEARISH" ? "↓ 看跌" : "↔ 方向不明确"}</h2>
            <p className="mt-2 text-body-sm text-white/70">{payload.resonanceSignal.strengthZh} · {payload.resonanceSignal.evidenceZh.join(" · ")}</p>
            <p className="mt-2 text-caption text-cyan-100/60">多周期信号与执行位置。</p>
          </section>
        ) : null}

        {payload.freshness.needsUpdate && !staticResearchComplete ? (
          <Card padding="md" className="border-red-400/20 bg-red-400/[0.04]">
            <Text variant="body-sm" weight="semibold" className="text-red-100">当前周期研究待更新</Text>
            <Text variant="caption" className="mt-1 block text-red-100/65">{payload.freshness.label}。页面不再把过期内容标记为当前报告。</Text>
          </Card>
        ) : null}
<section className="space-y-3">
          <h2 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">会员预测周期</h2>
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => setTab(t.type)}
                className={`rounded-md px-3 py-1.5 text-body-sm ${
                  tab === t.type
                    ? "bg-white text-black"
                    : "border border-white/15 text-white/70 hover:bg-white/5"
                }`}
              >
                {t.labelZh}
                {payload.mode === "publicOnly" && t.hasResearch ? (
                  <span className="ml-1 text-caption text-white/40">·已更新</span>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        {payload.mode === "publicOnly" ? (
          <section className="relative overflow-hidden rounded-2xl border border-cyan-300/15 bg-[radial-gradient(circle_at_80%_0%,rgba(77,208,225,.10),transparent_32%),linear-gradient(145deg,rgba(15,19,28,.98),rgba(8,10,14,.98))] p-5 sm:p-6">
            <div className="pointer-events-none absolute -bottom-6 -right-2 text-[clamp(70px,14vw,145px)] font-black tracking-[-.08em] text-white/[.025]">LOCK</div>
            <div className="relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-caption uppercase tracking-[0.16em] text-cyan-200/55">MOOX MEMBER DOSSIER</p>
                  <h2 className="mt-1 text-h3 text-white">研究已经做完，答案没有放在公开页。</h2>
                </div>
                <Badge variant="outline" className="border-amber-300/20 bg-amber-300/[.05] text-amber-100/75">
                  已锁定 {tabs.filter((item) => item.hasResearch).length} 个研究周期
                </Badge>
              </div>
              <p className="mt-3 max-w-3xl text-body-sm leading-7 text-white/55">
                会员可查看完整方向、六爻与奇门双观点、关键日期、技术位和验证记录。
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {payload.locks.map((lock, index) => (
                  <div key={lock.key} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-black/15 px-3 py-3">
                    <span className="text-body-sm text-white/65">{lock.labelZh}</span>
                    <span className="font-mono text-caption text-white/30">0{index + 1} · LOCK</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                <p className="text-body-sm font-medium text-white/80">会员打开后会直接看到什么？</p>
                <p className="mt-2 text-caption leading-6 text-white/48">会员专题提供当前方向、逐日双观点、未来节奏、关键位和历史验证。</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={unlockHref}>解锁方向 · 日期 · 支撑压力</Link>
                </Button>
                <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/5">
                  <Link href="/pricing">查看会员价格</Link>
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <h2 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">会员专享预测</h2>
            {payload.isAdmin ? (
              <p className="text-caption text-emerald-300/80">完整研究已开放</p>
            ) : null}

            {isStaticPeriodAsset && payload.forecast?.periods ? (
              <>
                <PeriodPanel
                  asOfDate={payload.asOfDate}
                  slot={
                    payload.forecast.periods.find((p) => p.type === tab) ?? {
                      type: tab,
                      labelZh: tabs.find((t) => t.type === tab)?.labelZh ?? tab,
                      emptyZh: tabs.find((t) => t.type === tab)?.emptyZh ?? "该周期预测尚未发布",
                      forecast: null,
                      freshnessStatus: "MISSING",
                    }
                  }
                />
                <LongTermArchive periods={archivePeriods} />
              </>
            ) : (
              <>
                {tab === "TODAY" ? (
                  payload.forecast?.today ? (
                    <DailyPanel title="今日预测" forecast={payload.forecast.today} />
                  ) : (
                    <Card padding="md" className="border-white/[0.08] bg-[#0c0e12]">
                      <Text variant="body-sm" className="text-white/60">
                        今日分析尚未发布
                      </Text>
                    </Card>
                  )
                ) : null}
                {tab === "TOMORROW" ? (
                  payload.forecast?.tomorrow ? (
                    <DailyPanel title="下一交易日预测" forecast={payload.forecast.tomorrow} />
                  ) : (
                    <Card padding="md" className="border-white/[0.08] bg-[#0c0e12]">
                      <Text variant="body-sm" className="text-white/60">
                        下一交易日分析尚未发布
                      </Text>
                    </Card>
                  )
                ) : null}
                {tab === "WEEK" ? (
                  payload.forecast?.weekly ? (
                    <WeeklyPanel weekly={payload.forecast.weekly} />
                  ) : (
                    <Card padding="md" className="border-white/[0.08] bg-[#0c0e12]">
                      <Text variant="body-sm" className="text-white/60">
                        该周期预测尚未发布
                      </Text>
                    </Card>
                  )
                ) : null}
              </>
            )}

            <section className="space-y-3">
              <h3 className="font-mono text-caption uppercase tracking-[0.16em] text-white/40">历史验证</h3>
              {payload.forecast?.history?.length ? (
                payload.forecast.history.map((r) => (
                  <Card key={r.forecastId} padding="md" className="border-white/[0.08] bg-[#0c0e12]">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text variant="body-sm" weight="semibold" className="text-white">
                        {r.forecastDate}
                      </Text>
                      <Badge variant="outline">{r.predictedDirection}</Badge>
                      <Badge variant="outline">{r.verdictLabel}</Badge>
                    </div>
                  </Card>
                ))
              ) : isStaticPeriodAsset && payload.forecast?.periods?.length ? (
                <div className="space-y-3">
                  <Card padding="md" className="border-white/[0.08] bg-[#0c0e12]">
                    <Text variant="body-sm" weight="semibold" className="text-white">
                      周期研究：当前 {payload.forecast.periods.filter((item) => item.forecast && item.freshnessStatus === "CURRENT").length} 条 · 历史 {payload.forecast.periods.filter((item) => item.forecast && item.freshnessStatus === "EXPIRED").length} 条
                    </Text>
                    <Text variant="caption" className="mt-1 block text-white/45">
                      周期结束并取得真实行情后才进入命中率；不会为了页面好看提前填写“命中”。
                    </Text>
                  </Card>
                  <div className="grid gap-2 md:grid-cols-2">
                    {payload.forecast.periods
                      .filter((item) => item.forecast)
                      .slice(0, 4)
                      .map((item) => (
                        <Card key={`sample-${item.forecast!.id}`} padding="md" className="border-white/[0.08] bg-[#0c0e12]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Text variant="body-sm" weight="semibold" className="text-white">
                              {item.labelZh} · {item.forecast!.direction}
                            </Text>
                            <Badge variant="outline">
                              {item.forecast!.validationStatus === "UNVERIFIED"
                                ? "待验证"
                                : item.forecast!.validationStatus}
                            </Badge>
                          </div>
                          <Text variant="caption" className="mt-1 block text-white/45">
                            {item.forecast!.periodStart} 至 {item.forecast!.periodEnd}
                          </Text>
                        </Card>
                      ))}
                  </div>
                </div>
              ) : (
                <Text variant="body-sm" className="text-white/55">
                  正式验证从2026年8月1日新基准开始积累；当前暂无完成周期的真实样本。
                </Text>
              )}
            </section>
          </section>
        )}
        </UnifiedDossierDisclosure>
      </div>
    </div>
  );
}
