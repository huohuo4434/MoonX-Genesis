"use client";

import { useState } from "react";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import { PlainLanguageSummary } from "@/components/education/PlainLanguageSummary";
import { listMonthlyMarketCycles, type MonthlyMarketCycle } from "@/lib/data/monthly-market-outlook";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { mooxDirectionArrow, mooxDirectionLabelEn, mooxDirectionLabelZh } from "@/lib/forecasts/moox-direction-doctrine";

function bars(values: { up: number; flat: number; down: number }, en: boolean) {
  return [
    [en ? "Higher" : "上涨", values.up, "bg-emerald-500/75"],
    [en ? "Range" : "震荡", values.flat, "bg-slate-400/65"],
    [en ? "Lower" : "下跌", values.down, "bg-rose-500/75"],
  ] as const;
}

export function MemberMonthlyPage() {
  const { locale } = useLocale();
  const en = locale === "en";
  const cycles = listMonthlyMarketCycles();
  const [cycleId, setCycleId] = useState<MonthlyMarketCycle["id"]>("2026-09");
  const cycle = cycles.find((item) => item.id === cycleId) ?? cycles[0]!;
  const items = cycle.items;
  const completeCount = items.filter((item) => item.sourceComplete).length;
  return (
    <div className="space-y-7">
      <div>
        <Badge variant="default">{en ? "Members only" : "会员专享"}</Badge>
        <Heading as="h1" size="h2" className="mt-3">{en ? "Monthly Outlook" : "会员月走势预测"}</Heading>
        <Text variant="body" color="secondary" className="mt-2 block max-w-4xl">
          {en
            ? "MOOX OFFICIAL DIRECTION comes first. Where the metaphysical evidence is clear, the call is bullish or bearish; only genuinely conflicting evidence is marked unclear. Technical analysis is used for levels, not for changing the call."
            : "先看月度主方向，再看月内路径、关键周与失效条件。"}
        </Text>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={en ? "Monthly forecast cycle" : "月度预测周期"}>
        {cycles.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={item.id === cycle.id ? "primary" : "outline"}
            role="tab"
            aria-selected={item.id === cycle.id}
            onClick={() => setCycleId(item.id)}
          >
            {en ? item.labelEn : item.labelZh}{item.isUpcoming ? (en ? " · Focus" : " · 重点") : ""}
          </Button>
        ))}
      </div>
      <Card padding="md" className="border-primary/20 bg-primary/[0.025]">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span>{en ? `Selected cycle: ${cycle.labelEn}` : `所选周期：${cycle.labelZh}`}</span>
          <span>{en ? `Published: ${items.length} assets` : `已发布：${items.length}项`}</span>
          <span>{en ? `Standalone monthly evidence: ${completeCount}/${items.length}` : `独立月度证据：${completeCount}/${items.length}`}</span>
          {cycle.isUpcoming ? <span className="text-amber-200/80">{en ? "Forward research; subject to pre-period teacher updates" : "事前预测；开盘前若有更高优先级老师新卦可修订"}</span> : null}
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((item) => (
          <Card key={item.assetId} padding="lg" className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Heading as="h2" size="h3">{en ? item.assetNameEn : item.assetName} <span className="text-base font-normal text-foreground-tertiary">{item.symbol}</span></Heading>
                <Text variant="caption" color="tertiary" className="mt-1 block">{en ? item.venueEn : item.venue} · {item.periodStart} {en ? "to" : "至"} {item.periodEnd}</Text>
              </div>
              <div className="flex flex-wrap gap-2"><Badge variant={item.direction.includes("跌") || item.direction.includes("回落") ? "warning" : "outline"}>{mooxDirectionArrow(item.direction)} {en ? mooxDirectionLabelEn(item.direction) : mooxDirectionLabelZh(item.direction)}</Badge>{item.volatility === "HIGH" ? <Badge variant="outline">{en ? "High volatility" : "高波动"}</Badge> : null}</div>
            </div>
            <PlainLanguageSummary
              direction={item.direction}
              path={en ? item.pathEn : item.path}
              en={en}
            />
            <div className="space-y-2">
              <Text variant="caption" color="tertiary">{en ? "Scenario weights (not a direction vote)" : "情景权重（不参与方向投票）"}</Text>
              {bars(item.probabilities, en).map(([label, value, color]) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <span className="w-14 text-foreground-tertiary">{label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className={`h-full ${color}`} style={{ width: `${value}%` }} /></div>
                  <span className="w-10 text-right tabular-nums">{value}%</span>
                </div>
              ))}
            </div>
            <div><Text variant="caption" color="tertiary">{en ? "Expected path" : "运行路径"}</Text><Text variant="body-sm" className="mt-1 block">{en ? item.pathEn : item.path}</Text></div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">{en ? "Key window" : "重点窗口"}</Text><Text variant="body-sm" className="mt-1 block">{en ? item.keyWindowEn : item.keyWindow}</Text></div>
              <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">{en ? "Primary risk" : "主要风险"}</Text><Text variant="body-sm" className="mt-1 block">{en ? item.riskEn : item.risk}</Text></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
