import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { DailyMarketForecastEditionClient } from "@/components/forecasts/DailyMarketForecastEditionClient";
import { getDailyMarketForecastEditionPayload } from "@/lib/data/daily-market-editions";

export const metadata: Metadata = {
  title: "Daily Forecasts | 每日核心市场预测",
  description: "MoonX 四大核心市场每日版：会员提前查看，公开版按上海时间中午开放。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DailyForecastsPage() {
  noStore();
  const payload = await getDailyMarketForecastEditionPayload();
  return (
    <main>
      <DailyMarketForecastEditionClient payload={payload} />
    </main>
  );
}
