import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdminOrNotFound } from "@/lib/auth/require-admin-or-404";
import { ResearchLibraryExplorer } from "@/components/research/ResearchLibraryExplorer";
import { ResearchSubnav } from "@/components/research/ResearchSubnav";
import { Card, Heading, Section, Text } from "@/components/ui";
import {
  getSurfaceAccess,
  buildLongTermModuleInventory,
  selectLongTermResearchRecords,
  shapeLongTermModuleInventory,
} from "@/lib/access/research-surfaces";
import { listResearchRecords } from "@/lib/data/research-records";

export const metadata: Metadata = {
  title: "Long-term Research | MOOX",
  description: "Internal long-term research.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LongTermResearchPage() {
  noStore();
  await requireAdminOrNotFound();
  const [access, records] = await Promise.all([getSurfaceAccess(), listResearchRecords()]);
  const longTermRecords = selectLongTermResearchRecords(records);
  const inventory = shapeLongTermModuleInventory(buildLongTermModuleInventory(longTermRecords), access.unlocked);

  return (
    <main>
      <Section spacing="lg">
        <ResearchSubnav />
        <Heading as="h1" size="h2">
          Long-term Research
        </Heading>
        <Text variant="body" color="secondary" className="mt-3 max-w-3xl">
          公开页仅展示模块、覆盖资产、周期与更新时间；会员或预览用户可查看完整长期结论、目标、拐点窗口与验证条件。
        </Text>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {inventory.map((module) => (
            <Card key={module.id} padding="lg" className="flex flex-col gap-3">
              <Text variant="body" weight="semibold">
                {module.title.zhCN}
              </Text>
              <Text variant="body-sm" color="secondary">
                {module.description?.zhCN ?? "长期研究模块"}
              </Text>
              <Text variant="caption" color="tertiary">
                Covered Assets: {module.coveredAssets.join("、") || "—"}
              </Text>
              <Text variant="caption" color="tertiary">
                Period: {module.forecastStart ?? "—"} → {module.forecastEnd ?? "—"}
              </Text>
              <Text variant="caption" color="tertiary">
                Updated: {module.lastUpdated ?? module.publishedAt} · Records: {module.recordCount}
              </Text>
            </Card>
          ))}
        </div>

        {access.unlocked ? (
          <div className="mt-8">
            <ResearchLibraryExplorer records={longTermRecords} />
          </div>
        ) : (
          <Card padding="lg" className="mt-8">
            <Text variant="body" weight="semibold">
              完整长期结论仅对会员或预览用户开放
            </Text>
            <Text variant="body-sm" color="secondary" className="mt-2">
              公开页不展示目标价、精确推演路径、详细逻辑、验证条件和内部技术载荷。
            </Text>
          </Card>
        )}
      </Section>
    </main>
  );
}
