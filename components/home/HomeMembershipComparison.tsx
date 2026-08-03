"use client";

import Link from "next/link";
import { Button, Card, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const ROWS = [
  ["当日核心市场预测", "北京时间08:00后", "全天提前", "Daily core-market forecasts", "After 08:00 Beijing time", "Early access all day"],
  ["下一交易日方向", "—", "✓", "Next-session direction", "—", "✓"],
  ["方向概率与运行路径", "基础版", "完整版", "Probabilities and expected path", "Basic", "Full"],
  ["关键价位、确认与失效", "—", "✓", "Levels, confirmation and invalidation", "—", "✓"],
  ["周度与月度趋势", "—", "✓", "Weekly and monthly outlooks", "—", "✓"],
  ["六爻、奇门和技术依据", "—", "✓", "Liu Yao, Qi Men and technical basis", "—", "✓"],
  ["重点资产完整研究", "摘要", "✓", "Focused-asset research", "Summary", "✓"],
  ["AI交易台与会员信号", "公开摘要", "完整内容", "AI trading desk and member signals", "Public summary", "Full access"],
] as const;

export function HomeMembershipComparison() {
  const { locale } = useLocale();
  const en = locale === "en";
  return (
    <section id="member-benefits" className="scroll-mt-24 border-t border-border/[0.06] py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <Text variant="caption" className="uppercase tracking-[0.18em] text-primary">
            {en ? "Free vs paid access" : "免费与付费有什么区别"}
          </Text>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {en ? "Start with today's view. Unlock the full decision structure when needed." : "注册先看今日，付费解锁完整决策结构"}
          </h2>
          <Text variant="body-sm" color="secondary" className="mt-3 block">
            {en
              ? "Free accounts are designed for today's direction and public verification. Paid members receive next-session, weekly, monthly, technical levels and full research evidence."
              : "免费注册用户用于了解当日方向与公开验证；付费会员用于提前查看下一交易日、周度、月度、关键价位和完整研究依据。"}
          </Text>
        </div>

        <Card padding="none" className="mt-5 overflow-hidden border-border/[0.1]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-body-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 font-semibold text-foreground">{en ? "Feature" : "功能"}</th>
                  <th className="px-4 py-3 font-semibold text-foreground">{en ? "Free user" : "免费注册用户"}</th>
                  <th className="px-4 py-3 font-semibold text-foreground">{en ? "Paid member" : "付费会员"}</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row[0]} className="border-t border-border/[0.07]">
                    <td className="px-4 py-3 text-foreground">{en ? row[3] : row[0]}</td>
                    <td className="px-4 py-3 text-foreground-secondary">{en ? row[4] : row[1]}</td>
                    <td className="px-4 py-3 text-foreground-secondary">{en ? row[5] : row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild><Link href="/login?tab=register&next=%2F%23moonx-view">{en ? "Create a free account" : "免费注册查看今日观点"}</Link></Button>
          <Button asChild variant="outline"><Link href="/pricing">{en ? "View membership pricing" : "查看会员价格"}</Link></Button>
        </div>
      </div>
    </section>
  );
}
