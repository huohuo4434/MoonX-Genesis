import type { Metadata } from "next";
import { PageHeaderIntl } from "@/components/layout/PageHeaderIntl";
import { VerificationSection } from "@/components/sections";
import { listResearchRecords } from "@/lib/data/research-records";

export const metadata: Metadata = {
  title: "预测验证 | MoonX",
  description: "MoonX 预测从发布到结果验证的完整追踪记录。",
};

export default async function VerificationPage() {
  const records = await listResearchRecords();
  const stagedRecords = records.filter((record) => (record.verificationStages?.length ?? 0) > 0);

  return (
    <main>
      <PageHeaderIntl
        titleKey="verification.title"
        subtitleKey="verification.subtitle"
        badgeKey="nav.verification"
      />
      <VerificationSection stagedRecords={stagedRecords} />
    </main>
  );
}
