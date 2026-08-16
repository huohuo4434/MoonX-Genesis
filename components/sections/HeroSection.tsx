"use client";

import { Button, Section } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function HeroSection() {
  const { locale, href } = useLocale();
  const en = locale === "en";

  const steps = [
    ["01", en ? "Direction" : "方向", en ? "Bullish, bearish or wait" : "看涨、看跌或观望"],
    ["02", en ? "Confirmation" : "确认", en ? "Levels and structure" : "点位与结构触发"],
    ["03", en ? "Proof" : "验证", en ? "Locked public record" : "记录锁定后不删除，失败也保留"],
  ] as const;

  return (
    <Section id="hero" spacing="none" className="relative overflow-hidden px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pb-16 lg:pt-14">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(65,184,255,0.14),transparent_68%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(13,18,28,0.98),rgba(8,10,16,0.96))] px-6 py-10 shadow-[0_32px_100px_rgba(0,0,0,0.35)] sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full border border-cyan-300/10 bg-cyan-300/[0.04]" />
        <div className="absolute -bottom-40 right-20 h-80 w-80 rounded-full border border-violet-300/10 bg-violet-300/[0.035]" />

        <div className="relative max-w-4xl">
          <div className="mb-7 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
            <span className="h-px w-8 bg-cyan-300/60" />
            MOOX Intelligence
          </div>
          <h1 className="max-w-4xl break-keep text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl lg:text-7xl">
            {en ? "One direction. Better timing." : "先看清方向，再等到位置。"}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/60 sm:text-lg sm:leading-8">
            {en
              ? "MOOX turns multi-source market research into one readable decision: direction, confirmation, invalidation and a public record. When evidence conflicts, the answer is wait."
              : "MOOX 把卦象、市场结构、关键价位和多方研究整合成一个可执行结论：方向、确认、失效和验证。证据分歧大，就明确建议观望。"}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" variant="primary" className="whitespace-nowrap">
              <a href="#moonx-view">{en ? "See today’s decision" : "查看今日结论"}</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="whitespace-nowrap border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.07]">
              <a href={href("/guide")}>{en ? "How to use MOOX" : "1 分钟看懂 MOOX"}</a>
            </Button>
          </div>

          <div className="mt-8 grid max-w-3xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] sm:mt-10">
            {steps.map(([step, title, body]) => (
              <div key={step} className="bg-[#0b0f17]/95 px-3 py-4 sm:px-5 sm:py-5">
                <div className="text-[10px] font-semibold tracking-[0.2em] text-cyan-200/45">{step}</div>
                <div className="mt-2 text-xs font-semibold text-white sm:text-sm">{title}</div>
                <div className="mt-1 text-[10px] leading-4 text-white/45 sm:text-xs sm:leading-5">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
