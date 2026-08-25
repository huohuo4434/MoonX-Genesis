import { Badge, Card, Heading, Text } from "@/components/ui";
import { ConclusionFirstPanel, type ConclusionFirstFact } from "@/components/member/ConclusionFirstPanel";
import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import type { CryptoCycleAlignment } from "@/lib/data/crypto-cycle-comparison-20260801";
import { mooxDirectionArrow, mooxDirectionLabelZh } from "@/lib/forecasts/moox-direction-doctrine";

function ForecastCard({
  item,
  symbol,
}: {
  item: ConvictionPeriodForecast;
  symbol: "BTC" | "ETH";
}) {
  return (
    <Card padding="lg" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Text variant="body" weight="semibold">
            {symbol} · {item.forecastType}
          </Text>
          <Text variant="caption" color="tertiary" className="mt-1 block">
            {item.periodStart} 至 {item.periodEnd}
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{mooxDirectionArrow(item.direction)} {mooxDirectionLabelZh(item.direction)}</Badge>
          {item.consensusStars ? (
            <Badge variant="outline">{"★".repeat(item.consensusStars)}{"☆".repeat(5 - item.consensusStars)}</Badge>
          ) : null}
        </div>
      </div>
      <Text variant="body-sm" weight="semibold" className="block leading-relaxed text-white/90">
        本周期正式方向：{mooxDirectionLabelZh(item.direction)}
      </Text>
      <Text variant="caption" className="block leading-relaxed text-white/55">
        研究说明：{item.summary}
      </Text>
      <div className="rounded-lg border border-white/10 bg-black/15 p-3">
        <Text variant="caption" className="block text-white/55">
          路径
        </Text>
        <Text variant="body-sm" className="mt-1 block leading-relaxed text-white/75">
          {item.expectedPath}
        </Text>
      </div>
      <Text variant="caption" className="block text-white/45">
        六爻：{item.ichingEvidence.primaryHexagram}
        {item.ichingEvidence.changingHexagram
          ? ` → ${item.ichingEvidence.changingHexagram}`
          : ""}
      </Text>
      {item.consensusLabel ? (
        <Text variant="caption" className="block text-amber-200/80">
          交叉判断：{item.consensusLabel}
        </Text>
      ) : null}
    </Card>
  );
}

export function BtcEthCycleComparison({
  btc,
  eth,
  alignments,
  admin = false,
}: {
  btc: ConvictionPeriodForecast[];
  eth: ConvictionPeriodForecast[];
  alignments: CryptoCycleAlignment[];
  admin?: boolean;
}) {
  const hideSupersededBroadMonth = (rows: ConvictionPeriodForecast[]) => {
    const currentMonth = rows.find((item) => item.forecastType === "MONTH_1");
    return rows.filter((item) => !(
      currentMonth && item.forecastType === "MONTH_3" &&
      item.periodStart <= currentMonth.periodEnd && item.periodEnd >= currentMonth.periodStart &&
      item.publishedAt < currentMonth.publishedAt
    ));
  };
  const visibleTypes = ["WEEK", "WEEK_5", "WEEK_6", "WEEK_7", "WEEK_8", "WEEK_9", "MONTH_1", "YEAR_1", "YEAR_10"];
  const btcVisible = admin ? btc : hideSupersededBroadMonth(btc).filter((item) => visibleTypes.includes(item.forecastType));
  const ethVisible = admin ? eth : hideSupersededBroadMonth(eth).filter((item) => visibleTypes.includes(item.forecastType));
  const alignmentFacts: ConclusionFirstFact[] = alignments.map((item) => ({
    label: item.period,
    value: `${item.btcDirection} / ${item.ethDirection}`,
    tone: item.alignment === "高度一致" ? "positive" : item.alignment === "明显分化" ? "turn" : "neutral",
  }));
  const alignedCount = alignments.filter((item) => item.alignment === "高度一致").length;
  const divergentCount = alignments.filter((item) => item.alignment === "明显分化").length;

  return (
    <div className="space-y-8">
      <section>
        <Heading as="h1" size="h2" className="mb-2">
          BTC／ETH周期交叉验证
        </Heading>
        <Text variant="body-sm" color="secondary" className="max-w-4xl">
          两套卦独立起卦、分别判断。只有方向和路径同向时才记为交叉印证；出现分歧时改用相对强弱，不把相关性误写成共同结论。
        </Text>
      </section>

      <ConclusionFirstPanel
        title="BTC／ETH周期结论"
        conclusion={`当前可比周期中，同向 ${alignedCount} 项，分歧 ${divergentCount} 项。两者同向只形成板块节奏共振，ETH仍必须由自己的月卦与周卦独立确认。`}
        facts={alignmentFacts}
        actions={["同向只提高周期判断信心，不代表涨跌幅相同。", "分歧时分别按BTC、ETH自己的周月方向处理，不强行绑定。"]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        {alignments.map((item) => (
          <Card key={item.id} padding="lg" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Text variant="body" weight="semibold">
                {item.period}
              </Text>
              <Badge variant="outline">{item.alignment}</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-white/10 p-3">
                <Text variant="caption" className="block text-white/45">BTC</Text>
                <Text variant="body-sm" className="mt-1 block">{item.btcDirection}</Text>
              </div>
              <div className="rounded-md border border-white/10 p-3">
                <Text variant="caption" className="block text-white/45">ETH</Text>
                <Text variant="body-sm" className="mt-1 block">{item.ethDirection}</Text>
              </div>
            </div>
            <Text variant="body-sm" className="block leading-relaxed text-white/75">
              {item.conclusion}
            </Text>
            <Text variant="caption" className="block text-amber-200/75">
              交易含义：{item.tradingMeaning}
            </Text>
          </Card>
        ))}
      </section>

      <section>
        <Heading as="h2" size="h3" className="mb-4">BTC多周期研究</Heading>
        <div className="grid gap-4 xl:grid-cols-2">
          {btcVisible.map((item) => (
            <ForecastCard key={item.id} item={item} symbol="BTC" />
          ))}
        </div>
      </section>

      <section>
        <Heading as="h2" size="h3" className="mb-4">ETH多周期研究</Heading>
        <div className="grid gap-4 xl:grid-cols-2">
          {ethVisible.map((item) => (
            <ForecastCard key={item.id} item={item} symbol="ETH" />
          ))}
        </div>
      </section>

      <Card padding="lg" className="border-amber-500/20 bg-amber-500/[0.04]">
        <Text variant="body" weight="semibold">十年卦使用限制</Text>
        <Text variant="body-sm" className="mt-2 block leading-relaxed text-white/70">
          十年卦只能判断资产长期存续性、财富结构、制度化程度和牛熊循环性质，不能据此精确编排每一个年份，也不能直接替代短期入场、止损和仓位规则。
        </Text>
      </Card>
    </div>
  );
}
