import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { Section } from "@/components/ui";
import { DailyAccuracyClient } from "@/components/verification/DailyAccuracyClient";
import { WeeklyAccuracySummary } from "@/components/verification/WeeklyAccuracySummary";
import { getPublicAccuracyHistory } from "@/lib/accuracy/get-public-history";
import { getWeeklyAccuracyHistory } from "@/lib/accuracy/get-weekly-history";

export const metadata: Metadata = {
  title: "历史准确率",
  description: "日度与周度分别统计，仅展示已经完成市场验证的历史预测。",
  alternates: { canonical: "/verification" },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VerificationPage() {
  noStore();
  const [{ items, stats }, weekly] = await Promise.all([
    getPublicAccuracyHistory(),
    getWeeklyAccuracyHistory(),
  ]);

  return (
    <main>
      <Section spacing="lg">
        <WeeklyAccuracySummary items={weekly.items} stats={weekly.stats} />
        <DailyAccuracyClient items={items} stats={stats} />
      </Section>
    </main>
  );
}
