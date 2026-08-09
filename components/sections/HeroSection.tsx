"use client";

import { Button, Heading, Section, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CORE_MARKETS } from "@/lib/presentation/membership-benefits";

export function HeroSection() {
  const { locale, href } = useLocale();
  const en = locale === "en";
  return (
    <Section id="hero" spacing="sm" className="relative overflow-hidden py-8 lg:py-12">
      <div className="flex flex-col items-start gap-4 px-4 sm:px-6 lg:px-8">
        <span className="text-label uppercase tracking-[0.2em] text-primary" aria-label="MOOX">
          MOOX INTELLIGENCE
        </span>
        <Heading as="h1" size="h2" className="max-w-4xl break-keep text-h2 lg:text-h1">
          {en ? "Metaphysics sets direction. Technicals find levels." : "玄学定方向，技术找点位。"}
        </Heading>
        <Text variant="body" color="secondary" className="max-w-4xl leading-7">
          {en
            ? "MOOX uses metaphysical research to make one official bullish, bearish or unclear call. Qimen assists timing; technical analysis is strictly used for levels and execution. Multi-horizon alignment raises conviction. Published views are time-stamped, locked and publicly verified."
            : `MOOX持续跟踪${CORE_MARKETS.join("、")}。方向只看玄学主判断：卦象明确就只给看涨或看跌，卦象冲突才写方向不明确；奇门辅助时间，技术分析只找支撑、压力和位置，不反向修改方向。多周期同向就是共振，共振越强，观点越明确。`}
        </Text>
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
          <Button asChild size="lg" variant="primary" className="whitespace-nowrap">
            <a href="#moonx-view">{en ? "View Today’s Outlook" : "免费查看今日核心市场"}</a>
          </Button>
          <Button asChild size="lg" variant="outline" className="whitespace-nowrap">
            <a href="#member-benefits">{en ? "Compare Access" : "会员能多看到什么"}</a>
          </Button>
          <Button asChild size="lg" variant="ghost" className="whitespace-nowrap">
            <a href={href("/verification")}>{en ? "See Public Verification" : "查看公开验证"}</a>
          </Button>
        </div>
      </div>
    </Section>
  );
}
