import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminOrNotFound } from "@/lib/auth/require-admin-or-404";
import { Card, Heading, Section, Text } from "@/components/ui";
import { ResearchSubnav } from "@/components/research/ResearchSubnav";

export const metadata: Metadata = {
  title: "Research | MOOX",
  description: "Internal research surfaces.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResearchIndexPage() {
  await requireAdminOrNotFound();
  const cards = [
    { href: "/forecasts/daily", title: "Daily Forecasts", body: "四大核心市场每日版（仅管理员）。" },
    { href: "/research/technical", title: "Technical Analysis", body: "结构化技术信号（仅管理员）。" },
    { href: "/research/long-term", title: "Long-term Research", body: "长期研究模块（仅管理员）。" },
    { href: "/markets/watchlist", title: "Focused Assets", body: "观察名单内部版（仅管理员）。" },
    { href: "/timeline", title: "Timeline", body: "时间线（仅管理员）。" },
  ];

  return (
    <main>
      <Section spacing="lg">
        <ResearchSubnav />
        <Heading as="h1" size="h2">
          Research
        </Heading>
        <Text variant="body" color="secondary" className="mt-3 max-w-3xl">
          内部研究入口。不对公众与普通会员开放。
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
              <Link href={card.href} className="text-body-sm text-primary underline-offset-4 hover:underline">
                进入
              </Link>
            </Card>
          ))}
        </div>
      </Section>
    </main>
  );
}
