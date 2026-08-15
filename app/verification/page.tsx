import type { Metadata } from "next";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { Section } from "@/components/ui";
import { VerificationMethodDisclosure } from "@/components/verification/VerificationMethodDisclosure";
import { PendingVerificationSummary } from "@/components/verification/PendingVerificationSummary";
import { PublicVerificationCenter } from "@/components/verification/PublicVerificationCenter";
import { VerificationPipelineStatus } from "@/components/verification/VerificationPipelineStatus";
import { getCachedPublicVerificationSnapshot } from "@/lib/accuracy/public-verification-snapshot";
import { getVerificationPipelineStatus } from "@/lib/accuracy/verification-pipeline-status";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/verification",
    titleZh: "公开验证中心",
    titleEn: "Public Track Record",
    descriptionZh: "以锁定周预测为主准确率口径，发布即锁定、失败不删除；日度记录作为周路径辅助复盘。",
    descriptionEn: "A version-locked weekly-first public track record; daily records remain supporting path reviews and misses are retained.",
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VerificationPage() {
  const [{ daily, weekly, pending, generatedAt }, pipelineStatus, locale] = await Promise.all([
    getCachedPublicVerificationSnapshot(),
    getVerificationPipelineStatus(),
    getRequestLocale(),
  ]);
  const en = locale === "en";

  return (
    <main>
      <Section spacing="lg">
        <PublicVerificationCenter
          dailyItems={daily.items}
          dailyStats={daily.stats}
          weeklyItems={weekly.items}
          weeklyStats={weekly.stats}
          pendingCount={pending.length}
          generatedAt={generatedAt}
          en={en}
        />

        <VerificationPipelineStatus status={pipelineStatus} en={en} />

        <div className="mx-auto mt-8 w-full max-w-[1280px]">
          <PendingVerificationSummary items={pending} en={en} />
        </div>

        <div className="mx-auto mt-8 w-full max-w-[1280px]">
          <details className="rounded-2xl border border-border/70 bg-card/60 p-5 open:bg-card/80">
            <summary className="cursor-pointer select-none text-base font-semibold text-foreground">
              {en ? "Verification rules & methodology" : "验证规则与方法说明"}
            </summary>
            <div className="mt-5">
              <VerificationMethodDisclosure />
            </div>
          </details>
        </div>
      </Section>
    </main>
  );
}
