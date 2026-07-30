import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import {
  getBenefitStock,
  getPublishedTodayForecast,
  getPublishedTomorrowForecast,
  getPublishedWeeklyAnalysis,
  listAllDailyForecasts,
  listAllWeeklyAnalyses,
  listStockVerifications,
  validateMemberStockDailyPublish,
  validateMemberStockWeeklyPublish,
} from "@/lib/data/member-stocks/store";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";

export default async function AdminStockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const stock = getBenefitStock(symbol);
  if (!stock) notFound();

  const [today, tomorrow, weekly, dailies, weeklies, verifications] = await Promise.all([
    getPublishedTodayForecast(symbol),
    getPublishedTomorrowForecast(symbol),
    getPublishedWeeklyAnalysis(symbol),
    listAllDailyForecasts(),
    listAllWeeklyAnalyses(),
    listStockVerifications(symbol),
  ]);

  const stockDailies = dailies.filter((d) => d.stockId === symbol);
  const stockWeeklies = weeklies.filter((w) => w.stockId === symbol);

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/stocks" />
        <Heading as="h1" size="h2">
          {stock.name}后台
        </Heading>
        <Text variant="caption" color="tertiary" className="mt-1 block font-mono">
          {stock.symbol} · 报价符号 {stock.quoteSymbol}
        </Text>
        <Text variant="caption" color="tertiary" className="mt-1 block">
          内部评级（不公开）：{stock.existingRating ?? "—"}
        </Text>
        <Link href={`/member/stocks/${stock.stockId}`} className="mt-2 inline-block text-body-sm text-primary underline">
          会员页预览
        </Link>

        <div className="mt-6 grid gap-3">
          <Card padding="md">
            <Text variant="body-sm" weight="semibold">
              今日预测
            </Text>
            {today ? (
              <>
                <Badge variant="outline" className="mt-2">
                  {today.direction}
                </Badge>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  {today.status} · {formatDateTimeChina(today.publishedAt)} · 置信度 {today.confidence}%
                </Text>
                <Text variant="caption" color="secondary" className="mt-1 block break-words">
                  {today.headline}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  sourceIds：{(today.sourceIds ?? []).join(", ") || "—"}
                </Text>
              </>
            ) : (
              <Text variant="caption" color="tertiary" className="mt-2 block">
                无 published 今日预测
              </Text>
            )}
          </Card>

          <Card padding="md">
            <Text variant="body-sm" weight="semibold">
              明日预测
            </Text>
            {tomorrow ? (
              <>
                <Badge variant="outline" className="mt-2">
                  {tomorrow.direction}
                </Badge>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  {tomorrow.forecastDate} · {tomorrow.status} · 置信度 {tomorrow.confidence}%
                </Text>
                <Text variant="caption" color="secondary" className="mt-1 block break-words">
                  {tomorrow.headline}
                </Text>
              </>
            ) : (
              <Text variant="caption" color="tertiary" className="mt-2 block">
                无 published 明日预测
              </Text>
            )}
          </Card>

          <Card padding="md">
            <Text variant="body-sm" weight="semibold">
              本周分析
            </Text>
            {weekly ? (
              <>
                <Badge variant="outline" className="mt-2">
                  {weekly.overallDirection}
                </Badge>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  {weekly.weekStart}–{weekly.weekEnd} · {weekly.status}
                </Text>
                <Text variant="caption" color="secondary" className="mt-1 block break-words">
                  {weekly.headline}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  sourceIds：{(weekly.sourceIds ?? []).join(", ") || "—"}
                </Text>
              </>
            ) : (
              <Text variant="caption" color="tertiary" className="mt-2 block">
                无 published 本周分析
              </Text>
            )}
          </Card>

          <Card padding="md">
            <Text variant="body-sm" weight="semibold">
              全部日度记录（含草稿）
            </Text>
            {stockDailies.map((d) => {
              const errs = validateMemberStockDailyPublish(d);
              return (
                <div key={d.id} className="mt-2">
                  <Text variant="caption" color="tertiary" className="block">
                    {d.id} · {d.role} · {d.forecastDate} · {d.direction} · {d.status}
                    {d.primaryDirection ? ` · 主要走势 ${d.primaryDirection}` : ""}
                    {d.closingBias ? ` · 收盘倾向 ${d.closingBias}` : ""}
                  </Text>
                  {errs.length ? (
                    <Text variant="caption" className="mt-0.5 block text-amber-600">
                      禁止发布：{errs.join("；")}
                    </Text>
                  ) : null}
                </div>
              );
            })}
          </Card>

          <Card padding="md">
            <Text variant="body-sm" weight="semibold">
              全部周度记录
            </Text>
            {stockWeeklies.map((w) => {
              const errs = validateMemberStockWeeklyPublish(w);
              return (
                <div key={w.id} className="mt-2">
                  <Text variant="caption" color="tertiary" className="block">
                    {w.id} · {w.weekStart} · {w.overallDirection} · {w.status}
                    {w.primaryDirection ? ` · 周内路径 ${w.primaryDirection}` : ""}
                    {w.closingBias ? ` · 周末倾向 ${w.closingBias}` : ""}
                  </Text>
                  {errs.length ? (
                    <Text variant="caption" className="mt-0.5 block text-amber-600">
                      禁止发布：{errs.join("；")}
                    </Text>
                  ) : null}
                </div>
              );
            })}
          </Card>

          <Card padding="md">
            <Text variant="body-sm" weight="semibold">
              历史验证 / 复盘
            </Text>
            {verifications.length ? (
              verifications.map((v) => (
                <Text key={v.forecastId} variant="caption" color="tertiary" className="mt-1 block break-words">
                  {v.forecastDate} · {v.verdictLabel} · {v.reviewSummary}
                </Text>
              ))
            ) : (
              <Text variant="caption" color="tertiary" className="mt-1 block">
                暂无验证记录
              </Text>
            )}
            <Link href="/admin/learning" className="mt-2 inline-block text-caption text-primary underline">
              打开复盘学习
            </Link>
          </Card>
        </div>
      </Section>
    </main>
  );
}
