"use client";

import { Card, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const ITEMS = [
  {
    zhTitle: "唯一方向先给结论",
    enTitle: "One official direction",
    zhBody: "卦象明确就直接给看涨或看跌；只有玄学证据冲突时才写方向不明确。",
    enBody: "Aligned metaphysical evidence produces one bullish or bearish call; only genuine conflict is labeled unclear.",
  },
  {
    zhTitle: "下一交易日运行路径",
    enTitle: "Next-session path",
    zhBody: "日度只使用开盘后、盘中、尾盘等日内节奏，不混入周度语言。",
    enBody: "Daily forecasts use open, intraday and close language rather than weekly wording.",
  },
  {
    zhTitle: "技术只负责点位",
    enTitle: "Technicals are levels only",
    zhBody: "支撑、压力、入场和风控来自技术分析，但技术位不参与把玄学方向反向修改。",
    enBody: "Support, resistance, entry and risk levels come from technical analysis, but they never flip the metaphysical call.",
  },
  {
    zhTitle: "发布锁定与公开验证",
    enTitle: "Locked publication and verification",
    zhBody: "观点发布后锁定，市场结束后按统一规则公开验证，不为结果倒改历史记录。",
    enBody: "Published views are locked and verified after the market window without rewriting history.",
  },
] as const;

export function HomeValueOverview() {
  const { locale } = useLocale();
  const en = locale === "en";
  return (
    <section className="border-t border-border/[0.06] py-8 lg:py-10">
      <div className="mx-auto grid w-full max-w-[1200px] gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {ITEMS.map((item, index) => (
          <Card key={item.zhTitle} padding="md" className="min-w-0 border-border/[0.08]">
            <Text variant="caption" className="font-mono text-primary">0{index + 1}</Text>
            <Text variant="body" weight="semibold" className="mt-2 block break-keep">
              {en ? item.enTitle : item.zhTitle}
            </Text>
            <Text variant="body-sm" color="secondary" className="mt-2 block">
              {en ? item.enBody : item.zhBody}
            </Text>
          </Card>
        ))}
      </div>
    </section>
  );
}
