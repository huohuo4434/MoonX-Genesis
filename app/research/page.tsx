import type { Metadata } from "next";
import Link from "next/link";
import { Card, Heading, Section, Text } from "@/components/ui";
import { ResearchSubnav } from "@/components/research/ResearchSubnav";

export const metadata: Metadata = {
  title: "Research | MOOX",
  description: "MoonX research surfaces for daily forecasts, technical structure, long-term modules, focused assets, and timeline.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ResearchIndexPage() {
  const cards = [
    {
      href: "/forecasts/daily",
      title: "Daily Forecasts",
      body: "四大核心市场每日版，会员提前查看，公开版按上海时间中午开放。",
    },
    {
      href: "/research/technical",
      title: "Technical Analysis",
      body: "查看结构化技术信号、验证统计与冲突情况。",
    },
    {
      href: "/research/long-term",
      title: "Long-term Research",
      body: "公开页展示模块清单；会员或预览用户可查看完整长期结论。",
    },
    {
      href: "/markets/watchlist",
      title: "Focused Assets",
      body: "公开页展示重点资产观察范围；会员可查看完整研究细节。",
    },
    {
      href: "/timeline",
      title: "Timeline",
      body: "时间线方式查看研究窗口、事件和验证进展。",
    },
  ];

  return (
    <main>
      <Section spacing="lg">
        <ResearchSubnav />
        <Heading as="h1" size="h2">
          Research
        </Heading>
        <Text variant="body" color="secondary" className="mt-3 max-w-3xl">
          公开页负责展示研究范围与方法，会员页负责展示可执行的完整内容。
        </Text>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.href} padding="lg" className="flex flex-col gap-3">
              <Text variant="body" weight="semibold">
                {card.title}
              </Text>
              <Text variant="body-sm" color="secondary">
                {card.body}
              </Text>
              <Link href={card.href} className="text-body-sm text-primary hover:underline">
                Open
              </Link>
            </Card>
          ))}
        </div>
      </Section>
    </main>
  );
}
