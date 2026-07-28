import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { getMemberStockHistoryPayload } from "@/lib/data/member-stocks/access";
import { guardMemberForecastRoute } from "@/lib/route-feature-guards";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "长鑫科技历史验证 | MoonX",
  description: "长鑫科技会员福利股历史验证。",
};

export default async function MemberStockHistoryPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  guardMemberForecastRoute();
  const { symbol } = await params;
  const payload = await getMemberStockHistoryPayload(symbol);
  if (!payload) notFound();

  if (payload.mode === "locked") {
    return (
      <main>
        <Section spacing="lg">
          <Heading as="h1" size="h2">
            {payload.card.name}历史验证
          </Heading>
          <Text variant="body-sm" color="secondary" className="mt-2">
            会员锁定
          </Text>
          <Button asChild size="sm" className="mt-4 w-fit">
            <Link href="/pricing">购买会员</Link>
          </Button>
        </Section>
      </main>
    );
  }

  return (
    <main>
      <Section spacing="lg">
        <Heading as="h1" size="h2">
          {payload.stock.name}历史验证
        </Heading>
        <Text variant="caption" color="tertiary" className="mt-1 block font-mono">
          {payload.stock.symbol}
        </Text>
        {payload.sampleNote ? (
          <Text variant="body-sm" color="secondary" className="mt-3">
            {payload.sampleNote}
          </Text>
        ) : payload.hitRate != null ? (
          <Text variant="body-sm" color="secondary" className="mt-3">
            方向命中率：{(payload.hitRate * 100).toFixed(1)}%
          </Text>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          {payload.results.length ? (
            payload.results.map((r) => (
              <Card key={r.forecastId} padding="md" className="min-w-0 overflow-hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <Text variant="body-sm" weight="semibold">
                    {r.forecastDate}
                  </Text>
                  <Badge variant="outline">{r.predictedDirection}</Badge>
                  <Badge variant={r.verdict === "hit" ? "success" : r.verdict === "miss" ? "danger" : "neutral"}>
                    {r.verdictLabel}
                  </Badge>
                </div>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  实际涨跌幅：{r.actualReturnPct.toFixed(2)}% · 收盘价：{r.actualClose || "—"}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  发布时间：{formatDateTimeChina(r.publishedAt)}
                </Text>
                <Text variant="body-sm" color="secondary" className="mt-2 block break-words">
                  {r.reviewSummary}
                </Text>
              </Card>
            ))
          ) : (
            <Text variant="body-sm" color="secondary">
              暂无已验证记录。不补造上市前预测。
            </Text>
          )}
        </div>
        <Button asChild size="sm" variant="outline" className="mt-4 w-fit">
          <Link href={`/member/stocks/${payload.stock.stockId}`}>返回分析</Link>
        </Button>
      </Section>
    </main>
  );
}
