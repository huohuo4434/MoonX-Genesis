import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { Card, Heading, Section, Text } from "@/components/ui";
import { DailyAccuracyClient } from "@/components/verification/DailyAccuracyClient";
import { WeeklyAccuracySummary } from "@/components/verification/WeeklyAccuracySummary";
import { VerificationMethodDisclosure } from "@/components/verification/VerificationMethodDisclosure";
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
        <VerificationMethodDisclosure />
        {items.length === 0 && weekly.items.length === 0 ? (
          <Card padding="lg" className="mt-6">
            <Heading as="h2" size="h3">验证数据积累进度</Heading>
            <Text variant="body-sm" color="secondary" className="mt-3 block max-w-3xl">
              日度与周度预测都必须等观察周期结束并取得真实行情后才进入统计。发布版本会保持锁定，失败、部分命中和无法验证记录同样保留；当前尚无完成验证的样本。
            </Text>
          </Card>
        ) : (
          <>
            <WeeklyAccuracySummary items={weekly.items} stats={weekly.stats} />
            <DailyAccuracyClient items={items} stats={stats} />
          </>
        )}
      </Section>
    </main>
  );
}
