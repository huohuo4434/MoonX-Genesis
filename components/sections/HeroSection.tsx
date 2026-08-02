"use client";
import { Button, Heading, Section, Text } from "@/components/ui";
export function HeroSection() {
  return <Section id="hero" spacing="sm" className="relative overflow-hidden py-7 lg:py-10"><div className="flex flex-col items-start gap-4 px-4 sm:px-6 lg:px-8">
    <span className="text-label uppercase tracking-[0.2em] text-primary" aria-label="MOOX">MOOX INTELLIGENCE</span>
    <Heading as="h1" size="h2" className="max-w-3xl text-h2 lg:text-h1">先判方向，再等确认。</Heading>
    <Text variant="body" color="secondary" className="max-w-2xl">六爻提出方向假设，奇门辅助择时，技术结构确认入场与失效位；每次判断发布后锁定，并在市场结束后公开验证。</Text>
    <div className="flex flex-col gap-3 pt-1 sm:flex-row"><Button asChild size="lg" variant="primary"><a href="#moonx-view">查看今日研判</a></Button><Button asChild size="lg" variant="outline"><a href="/methodology">了解方法论</a></Button><Button asChild size="lg" variant="ghost"><a href="/verification">查看公开验证</a></Button></div>
  </div></Section>;
}
