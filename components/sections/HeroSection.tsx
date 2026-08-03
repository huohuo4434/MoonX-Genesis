"use client";

import { Button, Heading, Section, Text } from "@/components/ui";
import { CORE_MARKETS } from "@/lib/presentation/membership-benefits";

export function HeroSection() {
  return (
    <Section id="hero" spacing="sm" className="relative overflow-hidden py-8 lg:py-12">
      <div className="flex flex-col items-start gap-4 px-4 sm:px-6 lg:px-8">
        <span className="text-label uppercase tracking-[0.2em] text-primary" aria-label="MOOX">
          MOOX INTELLIGENCE
        </span>
        <Heading as="h1" size="h2" className="max-w-4xl break-keep text-h2 lg:text-h1">
          开盘前先看方向，入场前再等确认。
        </Heading>
        <Text variant="body" color="secondary" className="max-w-4xl leading-7">
          MOOX持续跟踪{CORE_MARKETS.join("、")}，提供方向、概率、运行路径、关键价位和失效条件。六爻判断方向，奇门辅助择时，技术结构确认入场；每条观点发布后锁定，行情结束后公开验证。
        </Text>
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
          <Button asChild size="lg" variant="primary" className="whitespace-nowrap">
            <a href="#moonx-view">免费查看今日核心市场</a>
          </Button>
          <Button asChild size="lg" variant="outline" className="whitespace-nowrap">
            <a href="#member-benefits">会员能多看到什么</a>
          </Button>
          <Button asChild size="lg" variant="ghost" className="whitespace-nowrap">
            <a href="/verification">查看公开验证</a>
          </Button>
        </div>
      </div>
    </Section>
  );
}
