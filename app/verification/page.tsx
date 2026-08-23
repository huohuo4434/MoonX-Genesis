import type { Metadata } from "next";
import { Suspense } from "react";
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

function VerificationDashboardFallback({ en }: { en: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-1 sm:px-2" aria-busy="true">
      <section className="rounded-3xl border border-border/70 bg-card/60 p-6 sm:p-8">
        <div className="mb-3 inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">MOOX TRACK RECORD</div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{en ? "Public verification center" : "公开历史验证"}</h1>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((index) => <div key={index} className="h-24 animate-pulse rounded-2xl border border-border/60 bg-background/35" />)}
        </div>
      </section>
    </div>
  );
}

function PipelineFallback() {
  return <div className="mx-auto mt-8 h-40 w-full max-w-[1280px] animate-pulse rounded-2xl border border-border/70 bg-card/40" aria-busy="true" />;
}

async function VerificationDashboard({ en }: { en: boolean }) {
  const { daily, weekly, pending, generatedAt } = await getCachedPublicVerificationSnapshot();
  return (
    <>
      <PublicVerificationCenter
        dailyItems={daily.items}
        dailyStats={daily.stats}
        weeklyItems={weekly.items}
        weeklyStats={weekly.stats}
        pendingCount={pending.length}
        generatedAt={generatedAt}
        en={en}
      />

      <div className="mx-auto mt-8 w-full max-w-[1280px]">
        <PendingVerificationSummary items={pending} en={en} />
      </div>
    </>
  );
}

async function PipelineSection({ en }: { en: boolean }) {
  const pipelineStatus = await getVerificationPipelineStatus();
  return <VerificationPipelineStatus status={pipelineStatus} en={en} />;
}

export default async function VerificationPage() {
  const en = (await getRequestLocale()) === "en";

  return (
    <main>
      <Section spacing="lg">
        <Suspense fallback={<VerificationDashboardFallback en={en} />}>
          <VerificationDashboard en={en} />
        </Suspense>

        <Suspense fallback={<PipelineFallback />}>
          <PipelineSection en={en} />
        </Suspense>

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
