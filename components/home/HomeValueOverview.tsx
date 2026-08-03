"use client";

import { Card, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const ITEMS = [
  {
    zhTitle: "今日方向与概率",
    enTitle: "Direction and probabilities",
    zhBody: "把上涨、震荡、下跌概率与收盘方向分开呈现，避免只看一句结论。",
    enBody: "Closing direction is shown separately from up, sideways and down probabilities.",
  },
  {
    zhTitle: "下一交易日运行路径",
    enTitle: "Next-session path",
    zhBody: "日度只使用开盘后、盘中、尾盘等日内节奏，不混入周度语言。",
    enBody: "Daily forecasts use open, intraday and close language rather than weekly wording.",
  },
  {
    zhTitle: "关键价位与失效条件",
    enTitle: "Levels and invalidation",
    zhBody: "有真实技术数据才展示支撑、压力和确认位；数据不足时明确标注待技术确认。",
    enBody: "Support, resistance and confirmation levels appear only when real technical data is available.",
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
