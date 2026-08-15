"use client";

import { Badge, Card, Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { MemberResearchRadarPack } from "@/types/member-research-radar";
import { PUBLIC_ATTRIBUTION_DISCLOSURE_EN,PUBLIC_ATTRIBUTION_DISCLOSURE_ZH,PUBLIC_MARKET_VIEW_LABEL_ZH,publicAttributionText } from "@/lib/presentation/public-attribution";

type PublicResearchRadar=Omit<MemberResearchRadarPack,"stone">&{macroLiquidity:MemberResearchRadarPack["stone"]};
export function MemberQimenStoneRadar({ radar }: { radar: PublicResearchRadar }) {
  const { locale } = useLocale();
  const en = locale === "en";
  const t = (value: { zh: string; en: string }) => en ? value.en : value.zh;
  return <section className="mb-10 space-y-4" aria-labelledby="member-market-radar-heading">
    <div><Badge variant="outline">{en ? "Members · Research only" : "会员专享 · 仅供研究"}</Badge><Heading as="h2" size="h3" id="member-market-radar-heading" className="mt-2">{en ? "Yi's market environment and liquidity view" : `${PUBLIC_MARKET_VIEW_LABEL_ZH} · 市场环境与流动性`}</Heading><Text variant="body-sm" color="secondary" className="mt-2 block">{publicAttributionText(t(radar.qimenRole),en?"en":"zh")}</Text><Text variant="caption" color="tertiary" className="mt-2 block">{en?PUBLIC_ATTRIBUTION_DISCLOSURE_EN:PUBLIC_ATTRIBUTION_DISCLOSURE_ZH}</Text></div>
    <Card padding="md" className="border-amber-400/20 bg-amber-400/[0.025]"><Text variant="body-sm" weight="semibold">{radar.sourcePeriod.start} — {radar.sourcePeriod.end}</Text><Text variant="caption" color="tertiary" className="mt-1 block">{en ? "Source publication time unavailable · unverified source claims · excluded from consensus" : "来源发布时间缺失 · 来源主张待核验 · 不进入共识"}</Text></Card>
    <div className="grid gap-3 lg:grid-cols-2">{radar.markets.map((market) => <Card key={market.id} padding="md"><Text variant="body" weight="semibold">{t(market.label)}</Text><Text variant="body-sm" color="secondary" className="mt-2 block">{t(market.qimenEnvironment)}</Text><div className="mt-3 space-y-2">{market.branchRiskBranches.map((item, index) => <Text key={`${market.id}-${index}`} variant="caption" color="tertiary" className="block">{en ? "Branch: " : "风险分支："}{t(item.branch)}</Text>)}</div></Card>)}</div>
    <Card padding="lg"><Text variant="body" weight="semibold">{en ? "Macro liquidity framework" : "宏观流动性框架"}</Text><Text variant="body-sm" color="secondary" className="mt-2 block">{publicAttributionText(t(radar.macroLiquidity.role))}</Text><div className="mt-3 flex flex-wrap gap-2">{radar.macroLiquidity.frameworkChain.map((step) => <Badge key={step} variant="outline">{publicAttributionText(step)}</Badge>)}</div><div className="mt-5 grid gap-4 lg:grid-cols-2"><div><Text variant="caption" weight="semibold">{en ? "Public information · Unverified" : "公开信息 · 待核验"}</Text>{radar.macroLiquidity.sourceClaims.map((claim, index) => <Text key={`claim-${index}`} variant="body-sm" color="secondary" className="mt-2 block">• {publicAttributionText(t(claim))}</Text>)}</div><div><Text variant="caption" weight="semibold">{en ? "Independent interpretation" : PUBLIC_MARKET_VIEW_LABEL_ZH}</Text>{radar.macroLiquidity.mooxInterpretation.map((item, index) => <Text key={`interpretation-${index}`} variant="body-sm" color="secondary" className="mt-2 block">• {publicAttributionText(t(item))}</Text>)}</div></div><Text variant="caption" color="tertiary" className="mt-4 block">{publicAttributionText(t(radar.macroLiquidity.verificationNote))}</Text></Card>
  </section>;
}
