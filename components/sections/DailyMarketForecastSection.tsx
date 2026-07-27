import Link from "next/link";
import { Button, Card, Heading, Section, Text } from "@/components/ui";

const markets = [
  ["比特币", "BTC"],
  ["标普500", "SPX"],
  ["纳斯达克100", "NDX"],
  ["黄金", "XAU"],
] as const;

/** Deliberately empty until four manually curated forecasts are supplied. */
export function DailyMarketForecastSection() {
  return (
    <Section spacing="lg" id="daily-edition">
      <div className="mb-5 flex flex-col gap-2">
        <Text variant="label" color="secondary">DAILY MARKET FORECASTS</Text>
        <Heading as="h1" size="h2">今日四大市场预测</Heading>
        <Text variant="body" color="secondary">清晰展示比特币、标普500、纳斯达克100和黄金的方向、节奏与关键风险。</Text>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {markets.map(([asset, symbol]) => (
          <Card key={symbol} padding="md" className="flex min-h-40 flex-col gap-2">
            <Text variant="body" weight="semibold">{asset} <span className="font-mono text-foreground-tertiary">{symbol}</span></Text>
            <Text variant="label" color="tertiary">今日预测正在整理</Text>
            <Text variant="caption" color="secondary">会员预计提前24小时开放；普通用户将在北京时间12:00公开。</Text>
          </Card>
        ))}
      </div>
      <Button asChild variant="outline" size="sm" className="mt-4"><Link href="/forecasts/daily">查看每日预测</Link></Button>
    </Section>
  );
}
