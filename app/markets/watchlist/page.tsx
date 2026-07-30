import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdminOrNotFound } from "@/lib/auth/require-admin-or-404";
import { WatchlistCard } from "@/components/research/WatchlistCard";
import { ResearchSubnav } from "@/components/research/ResearchSubnav";
import { Card, Heading, Section, Text } from "@/components/ui";
import { getSurfaceAccess, shapeWatchlistEntries } from "@/lib/access/research-surfaces";
import { listResearchRecords } from "@/lib/data/research-records";
import { listWatchlistEntries } from "@/lib/data/strategic-watchlist";

export const metadata: Metadata = {
  title: "Focused Assets | MOOX",
  description: "Internal watchlist.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WatchlistPage() {
  noStore();
  await requireAdminOrNotFound();
  const [access, entries, records] = await Promise.all([
    getSurfaceAccess(),
    listWatchlistEntries(),
    listResearchRecords(),
  ]);

  const shaped = shapeWatchlistEntries(entries, access.unlocked);
  const items = shaped.map((entry) => ({
    entry,
    researchCount: records.filter((record) => record.assetId === entry.researchAssetId).length,
  }));

  return (
    <main>
      <Section spacing="lg">
        <ResearchSubnav />
        <Heading as="h1" size="h2">
          Focused Assets
        </Heading>
        <Text variant="body" color="secondary" className="mt-3 max-w-3xl">
          公开页展示资产身份、类别、周期、更新时间与锁定状态；会员或预览用户可查看完整趋势、催化剂、风险与研究覆盖。
        </Text>

        {access.unlocked ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(({ entry, researchCount }) => (
              <WatchlistCard key={entry.id} entry={entry} researchCount={researchCount} />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(({ entry, researchCount }) => (
              <Card key={entry.id} padding="lg" className="flex flex-col gap-3">
                <Text variant="body" weight="semibold">
                  {entry.assetName.zhCN}
                </Text>
                <Text variant="caption" color="tertiary">
                  {entry.symbol}
                </Text>
                <Text variant="body-sm" color="secondary">
                  周期：{entry.horizon.zhCN}
                </Text>
                <Text variant="body-sm" color="secondary">
                  更新时间：{entry.nextEventDate ?? "—"}
                </Text>
                <Text variant="body-sm" color="secondary">
                  Research Coverage：{researchCount}
                </Text>
                <Text variant="caption" color="tertiary">
                  Locked: YES
                </Text>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </main>
  );
}
