import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { getCurrentWeeklyEdition } from "@/lib/data/weekly-edition";

export const metadata: Metadata = {
  title: "Weekly Forecasts",
  description: "MoonX weekly tactical edition for BTC, oil, SPX, and NDX.",
};

export default async function ForecastsPage() {
  const edition = await getCurrentWeeklyEdition();

  return (
    <main>
      <Section spacing="lg" id="weekly-edition">
        <div className="mb-6 flex flex-col gap-2">
          <Text variant="label" color="secondary">
            WEEKLY FORECASTS
          </Text>
          <Heading as="h1" size="h2">
            本周市场预测
          </Heading>
          <Text variant="body" color="secondary">
            {edition.periodStart} → {edition.periodEnd} · 每日节奏属于周度趋势拆解，不确定性高于周度判断。
          </Text>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {edition.cards.map((card) => (
            <Card key={card.assetId} padding="lg" className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Text variant="body" weight="semibold">
                    {card.nameZhCN}{" "}
                    <span className="font-mono text-foreground-tertiary">{card.symbol}</span>
                  </Text>
                  <Text variant="caption" color="tertiary">
                    {card.record.horizon.zhCN}
                  </Text>
                </div>
                <Badge variant="outline">{card.sourceArchiveLabelZhCN}</Badge>
              </div>

              <div>
                <Text variant="caption" color="tertiary">
                  本周总方向
                </Text>
                <Text variant="body-sm" color="secondary">
                  {card.record.moonxInterpretation?.zhCN ?? card.record.summary.zhCN}
                </Text>
              </div>

              {card.record.rawSource && (
                <div>
                  <Text variant="caption" color="tertiary">
                    原始摘要
                  </Text>
                  <Text variant="body-sm" color="secondary">
                    {card.record.rawSource.zhCN}
                  </Text>
                </div>
              )}

              <div>
                <Text variant="caption" color="tertiary">
                  MoonX周度解读
                </Text>
                <Text variant="body-sm" color="secondary">
                  {card.record.summary.zhCN}
                </Text>
              </div>

              {card.parentRecord && (
                <div>
                  <Text variant="caption" color="tertiary">
                    与更大周期
                  </Text>
                  <Text variant="body-sm" color="secondary">
                    {card.alignsWithHigherHorizon === true
                      ? "与更高周期方向大体一致"
                      : card.alignsWithHigherHorizon === false
                        ? "与更高周期存在节奏差异，保留原记录并继续验证"
                        : "更高周期对照待补充"}
                    ：{card.parentRecord.title.zhCN}
                  </Text>
                </div>
              )}

              <div>
                <Text variant="caption" color="tertiary">
                  本周可能节奏
                </Text>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-body-sm text-foreground-secondary">
                  {card.daySlots
                    .filter((day) => day.key !== "weekend")
                    .map((day) => (
                      <li key={day.key}>
                        {day.rhythmZhCN} — {day.conditionZhCN}
                      </li>
                    ))}
                </ul>
              </div>

              {card.technicalRecord && (
                <div>
                  <Text variant="caption" color="tertiary">
                    技术验证 / 失效条件
                  </Text>
                  <Text variant="body-sm" color="secondary">
                    {card.technicalRecord.summary.zhCN}
                  </Text>
                  {card.technicalRecord.invalidation && (
                    <Text variant="caption" color="tertiary" className="mt-1 block">
                      失效：{card.technicalRecord.invalidation.zhCN}
                    </Text>
                  )}
                </div>
              )}

              {!card.technicalRecord && card.record.invalidation && (
                <Text variant="caption" color="tertiary">
                  失效：{card.record.invalidation.zhCN}
                </Text>
              )}

              <Text variant="caption" color="tertiary">
                验证中 · {card.sourceArchiveLabelZhCN}
              </Text>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/forecasts/daily">查看每日拆解</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/research/library">研究库</Link>
          </Button>
        </div>
      </Section>
    </main>
  );
}
