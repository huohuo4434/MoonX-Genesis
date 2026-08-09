import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { listPublishedStocks } from "@/lib/data/stocks-store";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const stocks = await listPublishedStocks();
  const s = stocks.find((x) => x.id === id);
  if (!s) return { title: "未找到" };
  return { title: `${s.name} | 个股分析 | MOOX` };
}

export default async function StockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stocks = await listPublishedStocks();
  const s = stocks.find((x) => x.id === id);
  if (!s) notFound();

  return (
    <main>
      <Section spacing="lg">
        <Link href="/stocks" className="text-body-sm text-primary underline-offset-4 hover:underline">
          返回个股列表
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Heading as="h1" size="h2">
            {s.name}
          </Heading>
          <Badge variant="outline">{s.directionLabel}</Badge>
        </div>
        <Text variant="caption" color="tertiary" className="mt-2 block font-mono">
          {s.symbol} · {s.market}
        </Text>
        <Card padding="md" className="mt-6 space-y-3">
          <Text variant="body-sm">有效期限：{s.validUntil}</Text>
          <Text variant="body">核心情景：{s.coreScenario}</Text>
          <div>
            <Text variant="body-sm" weight="semibold">
              关键价位
            </Text>
            <ul className="mt-1 list-disc pl-5 text-body-sm text-foreground-secondary">
              {s.keyLevels.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
          <Text variant="body-sm">技术风控参考：{s.invalidation}</Text>
          {s.verificationSummary && <Text variant="body-sm">历史验证：{s.verificationSummary}</Text>}
          <Text variant="caption" color="tertiary">
            最后更新：{new Date(s.lastUpdatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
          </Text>
        </Card>
      </Section>
    </main>
  );
}
