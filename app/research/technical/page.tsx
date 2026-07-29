import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { ResearchSubnav } from "@/components/research/ResearchSubnav";
import { TechnicalSignalCenter } from "@/components/research/TechnicalSignalCenter";
import { TechnicalSignalsPreviewClient } from "@/components/research/TechnicalSignalsPreviewClient";
import { Heading, Section, Text, Card } from "@/components/ui";
import { getTechnicalSignalsSurfacePayload } from "@/lib/access/research-surfaces";

export const metadata: Metadata = {
  title: "Technical Analysis | MOOX",
  description: "Technical signals and verification with public-safe previews and member-aware detail.",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TechnicalResearchPage() {
  noStore();
  const payload = await getTechnicalSignalsSurfacePayload();

  return (
    <main>
      <Section spacing="lg">
        <ResearchSubnav />
        <Heading as="h1" size="h2">
          Technical Analysis
        </Heading>
        <Text variant="body" color="secondary" className="mt-3 max-w-3xl">
          公开页只展示技术结构概览；会员或预览用户可查看完整确认条件、失效条件与验证统计。
        </Text>

        {payload.access.unlocked ? (
          <div className="mt-8">
            <TechnicalSignalCenter
              signals={payload.allSignals}
              stats={payload.stats}
              conflictCount={payload.conflictCount}
              totalSignalCount={payload.allSignals.length}
              isMember={payload.access.unlocked}
            />
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card padding="md">
                <Text variant="caption" color="tertiary">
                  当前收录
                </Text>
                <Text variant="body" weight="semibold" className="mt-1">
                  {payload.allSignals.length}
                </Text>
              </Card>
              <Card padding="md">
                <Text variant="caption" color="tertiary">
                  已完成验证
                </Text>
                <Text variant="body" weight="semibold" className="mt-1">
                  {payload.stats.completedVerifications}
                </Text>
              </Card>
              <Card padding="md">
                <Text variant="caption" color="tertiary">
                  当前分歧
                </Text>
                <Text variant="body" weight="semibold" className="mt-1">
                  {payload.conflictCount}
                </Text>
              </Card>
              <Card padding="md">
                <Text variant="caption" color="tertiary">
                  公开说明
                </Text>
                <Text variant="body-sm" color="secondary" className="mt-1">
                  不展示确认条件、失效条件与完整技术载荷
                </Text>
              </Card>
            </div>
            <TechnicalSignalsPreviewClient signals={payload.publicSignals} />
          </div>
        )}
      </Section>
    </main>
  );
}
