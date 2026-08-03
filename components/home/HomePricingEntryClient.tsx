"use client";

import Link from "next/link";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Button, Card, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function HomePricingEntryClient() {
  const { locale } = useLocale();
  const en = locale === "en";
  const benefits = en
    ? [
        "Full daily and next-session forecasts",
        "Weekly and monthly market paths",
        "Technical levels and invalidation",
        "Liu Yao, Qi Men and technical basis",
        "Focused-asset research",
        "AI trading desk and member signals",
      ]
    : [
        "今日与下一交易日完整预测",
        "周度与月度行情路径",
        "关键价位与失效条件",
        "六爻、奇门与技术依据",
        "重点资产完整研究",
        "AI交易台与会员信号",
      ];

  return (
    <section className="border-t border-border/[0.06] py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={en ? "Membership" : "会员"}
          title={en ? "Unlock the full MOOX research structure" : "解锁 MOOX 完整研究"}
          subtitle={en ? "Get earlier access to complete market views and evidence summaries." : "提前获取完整判断与证据摘要。"}
        />
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((item) => (
            <li key={item} className="text-body-sm text-foreground-secondary">· {item}</li>
          ))}
        </ul>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            [en ? "Monthly" : "月度", "80 USDT"],
            [en ? "Quarterly" : "季度", "200 USDT"],
            [en ? "Annual" : "年度", "700 USDT"],
          ].map(([label, price]) => (
            <Card key={label} padding="sm" className="border-border/[0.08]">
              <Text variant="caption" color="tertiary">{label}</Text>
              <Text variant="body" weight="semibold" className="mt-1 block">{price}</Text>
            </Card>
          ))}
        </div>
        <Card padding="md" className="mt-4 border-amber-400/25 bg-amber-400/[0.04]">
          <Text variant="body-sm" weight="semibold">
            {en ? "Founding member offer" : "创始会员优惠"}
          </Text>
          <Text variant="body-sm" color="secondary" className="mt-1 block">
            {en
              ? "The first 10 paid members receive 20% off uninterrupted renewals (64 / 160 / 560 USDT); members 11–50 receive 10% off (72 / 180 / 630 USDT)."
              : "前10名付费会员连续续订永久8折（64／160／560 USDT）；第11至50名永久9折（72／180／630 USDT）。"}
          </Text>
        </Card>
        <div className="mt-5">
          <Button asChild><Link href="/pricing">{en ? "View membership plans" : "查看会员方案"}</Link></Button>
        </div>
        <Text variant="caption" color="tertiary" className="mt-3 block">
          {en ? "Research only. Not investment advice." : "研究观点仅供参考，不构成投资建议。"}
        </Text>
      </div>
    </section>
  );
}
