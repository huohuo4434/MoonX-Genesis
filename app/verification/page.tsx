import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { Section } from "@/components/ui";
import { DailyAccuracyClient } from "@/components/verification/DailyAccuracyClient";
import { getPublicAccuracyHistory } from "@/lib/accuracy/get-public-history";

export const metadata: Metadata = {
  title: "历史准确率 | MoonX",
  description: "仅统计已经完成市场验证的历史预测；今日和未来预测不会在此提前公开。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VerificationPage() {
  noStore();
  const { items, stats } = await getPublicAccuracyHistory();

  return (
    <main>
      <Section spacing="lg">
        <DailyAccuracyClient items={items} stats={stats} />
      </Section>
    </main>
  );
}
