import type { Metadata } from "next";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { unstable_noStore as noStore } from "next/cache";
import { Section } from "@/components/ui";
import { DailyAccuracyClient } from "@/components/verification/DailyAccuracyClient";
import { WeeklyAccuracySummary } from "@/components/verification/WeeklyAccuracySummary";
import { VerificationMethodDisclosure } from "@/components/verification/VerificationMethodDisclosure";
import { VerificationEmptyState } from "@/components/verification/VerificationEmptyState";
import { getPublicAccuracyHistory } from "@/lib/accuracy/get-public-history";
import { getWeeklyAccuracyHistory } from "@/lib/accuracy/get-weekly-history";
import { getPendingVerificationRecords } from "@/lib/accuracy/get-pending-verification";
import { PendingVerificationSummary } from "@/components/verification/PendingVerificationSummary";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/verification",
    titleZh: "历史准确率",
    titleEn: "Public Verification",
    descriptionZh: "日度与周度分别统计，仅展示已经完成市场验证的历史预测。",
    descriptionEn: "Review locked daily and weekly forecasts after their observation windows, including hits, misses, partial hits and non-verifiable records.",
  });
}



export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VerificationPage() {
  noStore();
  const [{ items, stats }, weekly, pending, locale] = await Promise.all([
    getPublicAccuracyHistory(),
    getWeeklyAccuracyHistory(),
    getPendingVerificationRecords(),
    getRequestLocale(),
  ]);
  const en = locale === "en";

  return (
    <main>
      <Section spacing="lg">
        <VerificationMethodDisclosure />
        <PendingVerificationSummary items={pending} en={en} />
        {items.length === 0 && weekly.items.length === 0 ? (
          <VerificationEmptyState />
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
