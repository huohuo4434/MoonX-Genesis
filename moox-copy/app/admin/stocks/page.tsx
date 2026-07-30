import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import {
  getPublishedTodayForecast,
  getPublishedTomorrowForecast,
  getPublishedWeeklyAnalysis,
  lastUpdatedIso,
  listBenefitStocks,
  listStockVerifications,
} from "@/lib/data/member-stocks/store";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";

export default async function AdminStocksPage() {
  const stocks = listBenefitStocks();
  const rows = [];
  for (const s of stocks) {
    const [today, tomorrow, weekly, verifications] = await Promise.all([
      getPublishedTodayForecast(s.stockId),
      getPublishedTomorrowForecast(s.stockId),
      getPublishedWeeklyAnalysis(s.stockId),
      listStockVerifications(s.stockId),
    ]);
    const pendingVerify = verifications.filter(
      (v) => v.verdict === "manual_review"
    ).length;
    rows.push({
      stock: s,
      today,
      tomorrow,
      weekly,
      updatedAt: lastUpdatedIso(today, tomorrow, weekly),
      pendingVerify,
    });
  }

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/stocks" />
        <Heading as="h1" size="h2">
          重点资产管理
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          股票与加密资产统一管理。只有 published 内容对会员可见。
        </Text>
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <Card key={row.stock.stockId} padding="md">
              <div className="flex flex-wrap items-center gap-2">
                <Text variant="body" weight="semibold">
                  {row.stock.name}
                </Text>
                <Badge variant="success">已上线</Badge>
                <Text variant="caption" color="tertiary" className="font-mono">
                  {row.stock.symbol}
                </Text>
              </div>
              <Text variant="caption" color="tertiary" className="mt-2 block">
                今日：{row.today ? `${row.today.direction}（${row.today.status}）` : "无"}
              </Text>
              <Text variant="caption" color="tertiary" className="mt-1 block">
                明日：{row.tomorrow ? `${row.tomorrow.direction}（${row.tomorrow.status}）` : "无"}
              </Text>
              <Text variant="caption" color="tertiary" className="mt-1 block">
                本周：{row.weekly ? `${row.weekly.overallDirection}（${row.weekly.status}）` : "无"}
              </Text>
              <Text variant="caption" color="tertiary" className="mt-1 block">
                待验证／人工复核：{row.pendingVerify}
              </Text>
              {row.updatedAt ? (
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  最后更新：{formatDateTimeChina(row.updatedAt)}
                </Text>
              ) : null}
              <Link
                href={`/admin/stocks/${row.stock.stockId}`}
                className="mt-3 inline-block text-body-sm text-primary underline-offset-4 hover:underline"
              >
                打开详情后台
              </Link>
            </Card>
          ))}
        </div>
      </Section>
    </main>
  );
}
