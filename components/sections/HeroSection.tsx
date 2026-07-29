"use client";

import { Button, Heading, Section, Text } from "@/components/ui";

export function HeroSection() {
  return (
    <Section id="hero" spacing="sm" className="relative overflow-hidden py-6 lg:py-8">
      <div className="flex flex-col items-start gap-3 px-4 sm:px-6 lg:px-8">
        <span className="text-label uppercase tracking-[0.2em] text-primary" aria-label="MOOX">
          MOOX
        </span>
        <Heading as="h1" size="h2" className="max-w-3xl text-h2 lg:text-h1">
          每天提前一步，了解主要市场节奏
        </Heading>
        <Text variant="body" color="secondary" className="max-w-2xl">
          MoonX融合市场数据、AI分析、技术结构与I Ching研究，
          <br className="hidden sm:block" />
          提前发布判断，并在交易结束后公开验证。
        </Text>
        <div className="flex flex-col gap-3 pt-1 sm:flex-row">
          <Button asChild size="lg" variant="primary">
            <a href="#moonx-view">查看今日观点</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="/verification">查看历史验证</a>
          </Button>
        </div>
      </div>
    </Section>
  );
}
