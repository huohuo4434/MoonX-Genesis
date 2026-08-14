"use client";

import Link from "next/link";
import { Button, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function HomePricingEntryClient() {
  const { locale, href } = useLocale();
  const en = locale === "en";

  return (
    <section className="border-t border-border/[0.06] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="flex flex-col gap-6 rounded-3xl border border-primary/15 bg-[linear-gradient(120deg,rgba(64,180,255,0.07),rgba(124,92,255,0.035))] px-6 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="max-w-2xl">
            <Text variant="caption" className="uppercase tracking-[0.18em] text-primary">
              {en ? "Membership" : "会员"}
            </Text>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {en ? "See the full decision, not more noise." : "会员看到的不是更多杂乱信息，而是完整决策。"}
            </h2>
            <Text variant="body-sm" color="secondary" className="mt-3 block max-w-xl leading-6">
              {en
                ? "Unlock the next-session path, weekly stage, key levels, focused research and the AI confirmation desk. Plans and founding-member terms stay on one dedicated page."
                : "解锁下一交易日路径、本周阶段、关键价位、重点研究和 AI 执行确认。价格与创始会员条件统一放在方案页。"}
            </Text>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
            <Button asChild size="lg">
              <Link href={href("/pricing")}>{en ? "Compare plans" : "查看会员方案"}</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href={href("/guide")}>{en ? "Read the guide" : "先看使用指南"}</Link>
            </Button>
          </div>
        </div>
        <Text variant="caption" color="tertiary" className="mt-3 block">
          {en ? "Research only. Not investment advice." : "研究观点仅供参考，不构成投资建议。"}
        </Text>
      </div>
    </section>
  );
}
