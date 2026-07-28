import type { Metadata } from "next";
import { Section } from "@/components/ui";
import { DailyAccuracyClient } from "@/components/verification/DailyAccuracyClient";
import {
  listDailyForecastRecords,
  listDailyVerificationResults,
} from "@/lib/data/daily-accuracy-store";
import { computeVerificationDashboardStats } from "@/lib/verification/daily-rules";

export const metadata: Metadata = {
  title: "每日预测准确率 | MoonX",
  description: "日度方向预测在交易结束后使用真实收盘数据自动验证。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VerificationPage() {
  const [forecasts, results] = await Promise.all([
    listDailyForecastRecords(),
    listDailyVerificationResults(),
  ]);
  const stats = computeVerificationDashboardStats(forecasts, results);

  return (
    <main>
      <Section spacing="lg">
        <DailyAccuracyClient forecasts={forecasts} results={results} stats={stats} />
      </Section>
    </main>
  );
}
