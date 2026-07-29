import Link from "next/link";
import { Badge, Button, Text } from "@/components/ui";
import { SectionHeader } from "@/components/home/SectionHeader";

/** Homepage entry into Conviction List — no forecast body. */
export async function HomeMemberStocksSection() {
  return (
    <section id="member-stocks" className="border-t border-border/[0.06] py-8 lg:py-12">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="研究"
          title="重点关注"
          subtitle="MOOX持续研究和验证的少数重点资产。公开基本面，会员查看完整预测。"
        />
        <div className="mt-4 max-w-lg rounded-lg border border-border/[0.08] bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="body" weight="semibold">
              长鑫科技 · 太空狗
            </Text>
            <Badge variant="outline">Conviction List</Badge>
          </div>
          <Text variant="caption" color="tertiary" className="mt-2 block">
            当前跟踪 2 项资产 · 股票与加密资产统一栏目
          </Text>
          <Button asChild size="sm" className="mt-3 w-fit">
            <Link href="/featured-stocks">查看研究详情</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
