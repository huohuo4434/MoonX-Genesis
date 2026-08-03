import { Card, Text } from "@/components/ui";

const ITEMS = [
  {
    title: "今日方向与概率",
    body: "把上涨、震荡、下跌概率与收盘方向分开呈现，避免只看一句结论。",
  },
  {
    title: "下一交易日运行路径",
    body: "日度只使用开盘后、盘中、尾盘等日内节奏，不混入周初或后半周语言。",
  },
  {
    title: "关键价位与失效条件",
    body: "有真实技术数据才展示支撑、压力和确认位；数据不足时明确标注待技术确认。",
  },
  {
    title: "发布锁定与公开验证",
    body: "观点发布后锁定，市场结束后按统一规则公开验证，不为结果倒改历史记录。",
  },
] as const;

export function HomeValueOverview() {
  return (
    <section className="border-t border-border/[0.06] py-8 lg:py-10">
      <div className="mx-auto grid w-full max-w-[1200px] gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {ITEMS.map((item, index) => (
          <Card key={item.title} padding="md" className="min-w-0 border-border/[0.08]">
            <Text variant="caption" className="font-mono text-primary">
              0{index + 1}
            </Text>
            <Text variant="body" weight="semibold" className="mt-2 block break-keep">
              {item.title}
            </Text>
            <Text variant="body-sm" color="secondary" className="mt-2 block">
              {item.body}
            </Text>
          </Card>
        ))}
      </div>
    </section>
  );
}
