"use client";

import { Badge, Card, Heading, Text } from "@/components/ui";
import { PlainLanguageSummary } from "@/components/education/PlainLanguageSummary";
import { listCurrentMonthlyMarketOutlooks } from "@/lib/data/monthly-market-outlook";
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
  const items = listCurrentMonthlyMarketOutlooks();
  return (
    <div className="space-y-7">
      <div>
        <Badge variant="default">{en ? "Members only" : "会员专享"}</Badge>
        <Heading as="h1" size="h2" className="mt-3">{en ? "Monthly Outlook" : "月度走势分析"}</Heading>
        <Text variant="body" color="secondary" className="mt-2 block max-w-4xl">
          {en
            ? "MOOX OFFICIAL DIRECTION comes first. Where the metaphysical evidence is clear, the call is bullish or bearish; only genuinely conflicting evidence is marked unclear. Technical analysis is used for levels, not for changing the call."
            : "月度页先给 MOOX 唯一方向：卦象明确就直接看涨或看跌，卦象冲突才写方向不明确。技术分析只负责点位，不参与修改方向。"}
        </Text>
      </div>
      <Card padding="md" className="border-primary/20 bg-primary/[0.025]">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span>{en ? "Current cycle: August 2026" : "当前周期：2026年8月"}</span>
          <span>{en ? `Complete coverage: ${items.length} assets` : `完整覆盖：${items.length}项`}</span>
          <span>{en ? `Data coverage: ${items.length}/${items.length}` : `数据覆盖：${items.length}/${items.length}`}</span>
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
