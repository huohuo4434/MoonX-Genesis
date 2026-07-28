import Link from "next/link";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Button, Text } from "@/components/ui";

export function HomePricingEntry() {
  return (
    <section className="border-t border-border/[0.06] py-8 lg:py-12">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="会员"
          title="提前查看明日预测与本周行情"
          subtitle="免费用户查看今日观点；会员可以提前查看下一交易日完整预测，并查看本周整体走势、周内运行顺序和风险窗口。"
        />
        <Text variant="body-sm" color="secondary" className="mt-2 max-w-2xl">
          完整预测包括方向、三种情景概率、运行顺序、关键支撑与压力、失效条件和风险等级。
        </Text>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/pricing">查看会员价格</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/member/weekly">本周行情分析</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
