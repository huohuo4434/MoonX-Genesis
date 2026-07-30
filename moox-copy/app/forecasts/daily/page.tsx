import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdminOrNotFound } from "@/lib/auth/require-admin-or-404";
import { DailyMarketForecastEditionClient } from "@/components/forecasts/DailyMarketForecastEditionClient";
import { getDailyMarketForecastEditionPayload } from "@/lib/data/daily-market-editions";

export const metadata: Metadata = {
  title: "Daily Forecasts | 每日核心市场预测",
  description: "内部每日预测版本页。",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DailyForecastsPage() {
  noStore();
  await requireAdminOrNotFound();
  const payload = await getDailyMarketForecastEditionPayload();
  return (
    <main>
      <DailyMarketForecastEditionClient payload={payload} />
    </main>
  );
}
