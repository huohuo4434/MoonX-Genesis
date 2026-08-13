"use client";

import { Badge, Card, Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { MemberResearchRadarPack } from "@/types/member-research-radar";

export function MemberQimenStoneRadar({ radar }: { radar: MemberResearchRadarPack }) {
  const { locale } = useLocale();
  const en = locale === "en";
  const t = (value: { zh: string; en: string }) => en ? value.en : value.zh;
  return <section className="mb-10 space-y-4" aria-labelledby="qimen-stone-radar-heading">
    <div><Badge variant="outline">{en ? "Members · Research only" : "会员专享 · 仅供研究"}</Badge><Heading as="h2" size="h3" id="qimen-stone-radar-heading" className="mt-2">{en ? "Qimen environment + Stone liquidity radar" : "奇门市场环境 + Stone宏观流动性雷达"}</Heading><Text variant="body-sm" color="secondary" className="mt-2 block">{t(radar.qimenRole)}</Text></div>
    <Card padding="md" className="border-amber-400/20 bg-amber-400/[0.025]"><Text variant="body-sm" weight="semibold">{radar.sourcePeriod.start} — {radar.sourcePeriod.end}</Text><Text variant="caption" color="tertiary" className="mt-1 block">{en ? "Source publication time unavailable · unverified source claims · excluded from consensus" : "来源发布时间缺失 · 来源主张待核验 · 不进入共识"}</Text></Card>
    <div className="grid gap-3 lg:grid-cols-2">{radar.markets.map((market) => <Card key={market.id} padding="md"><Text variant="body" weight="semibold">{t(market.label)}</Text><Text variant="body-sm" color="secondary" className="mt-2 block">{t(market.qimenEnvironment)}</Text><div className="mt-3 space-y-2">{market.branchRiskBranches.map((item, index) => <Text key={`${market.id}-${index}`} variant="caption" color="tertiary" className="block">{en ? "Branch: " : "风险分支："}{t(item.branch)}</Text>)}</div></Card>)}</div>
    <Card padding="lg"><Text variant="body" weight="semibold">Stone · {en ? "Macro liquidity framework" : "宏观流动性框架"}</Text><Text variant="body-sm" color="secondary" className="mt-2 block">{t(radar.stone.role)}</Text><div className="mt-3 flex flex-wrap gap-2">{radar.stone.frameworkChain.map((step) => <Badge key={step} variant="outline">{step}</Badge>)}</div><div className="mt-5 grid gap-4 lg:grid-cols-2"><div><Text variant="caption" weight="semibold">SOURCE_CLAIM · {en ? "Unverified" : "待核验"}</Text>{radar.stone.sourceClaims.map((claim, index) => <Text key={`claim-${index}`} variant="body-sm" color="secondary" className="mt-2 block">• {t(claim)}</Text>)}</div><div><Text variant="caption" weight="semibold">MOOX · {en ? "Interpretation" : "框架解读"}</Text>{radar.stone.mooxInterpretation.map((item, index) => <Text key={`interpretation-${index}`} variant="body-sm" color="secondary" className="mt-2 block">• {t(item)}</Text>)}</div></div><Text variant="caption" color="tertiary" className="mt-4 block">{t(radar.stone.verificationNote)}</Text></Card>
  </section>;
}
