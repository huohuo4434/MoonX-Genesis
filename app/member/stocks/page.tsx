import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { getMemberStocksListPayload } from "@/lib/data/member-stocks/access";
import { guardMemberForecastRoute } from "@/lib/route-feature-guards";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "会员福利股 | MoonX",
  description: "MoonX会员福利股：今日预测、下一交易日预测与本周行情分析。",
};

export default async function MemberStocksPage() {
  guardMemberForecastRoute();
  const payload = await getMemberStocksListPayload();
  if (!payload.stocks.length) notFound();

  return (
    <main>
      <Section spacing="lg">
        <Heading as="h1" size="h2">
          会员福利股
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 max-w-2xl">
          MoonX选择少量重点股票持续跟踪，为会员提供今日预测、下一交易日预测和本周行情分析。
        </Text>

        <div className="mt-6 grid grid-cols-1 gap-3">
          {payload.mode === "locked"
            ? payload.stocks.map((s) => (
                <Card key={s.stockId} padding="md" className="min-w-0 overflow-hidden">
                  <Text variant="body" weight="semibold">
                    {s.name}
                  </Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block font-mono">
                    {s.symbol}
                  </Text>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {s.tags.map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <Text variant="caption" color="tertiary" className="mt-2 block">
                    分析已经上线 · 会员锁定
                  </Text>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href={`/member/stocks/${s.stockId}`}>查看锁定页</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/pricing">购买会员</Link>
                    </Button>
                  </div>
                </Card>
              ))
            : payload.stocks.map((row) => (
                <Card key={row.stock.stockId} padding="md" className="min-w-0 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2">
                    <Text variant="body" weight="semibold">
                      {row.stock.name}
                    </Text>
                    {row.todayDirection ? <Badge variant="outline">{row.todayDirection}</Badge> : null}
                  </div>
                  <Text variant="caption" color="tertiary" className="mt-1 block font-mono">
                    {row.stock.symbol}
                  </Text>
                  {row.todayHeadline ? (
                    <Text variant="body-sm" color="secondary" className="mt-2 block break-words">
                      {row.todayHeadline}
                    </Text>
                  ) : null}
                  {row.updatedAt ? (
                    <Text variant="caption" color="tertiary" className="mt-1 block">
                      最后更新：{formatDateTimeChina(row.updatedAt)}
                    </Text>
                  ) : null}
                  <Button asChild size="sm" className="mt-3 w-fit">
                    <Link href={`/member/stocks/${row.stock.stockId}`}>查看长鑫分析</Link>
                  </Button>
                </Card>
              ))}
        </div>
      </Section>
    </main>
  );
}
