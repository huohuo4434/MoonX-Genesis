import Link from "next/link";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Badge, Button, Card, Text } from "@/components/ui";
import { listPublicConvictionCards } from "@/lib/data/conviction/store";
import { assetVenue } from "@/lib/presentation/asset-catalog";

/** 首页只展示最新重点关注资产摘要；完整名单与周期研究进入详情页。 */
export async function HomeFeaturedAssets() {
  const assets = (await listPublicConvictionCards()).slice(0, 4);

  return (
    <section className="border-t border-border/[0.06] py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="重点关注"
          title="重点关注资产"
          subtitle="公开关注逻辑摘要，完整研究见详情页。"
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {assets.map((asset) => (
            <Card key={asset.id} padding="lg" className="flex flex-col gap-3 border-border/[0.08]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Text variant="body" weight="semibold">
                    {asset.nameZh}
                  </Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {assetVenue(asset.symbol)} · {asset.symbol}
                  </Text>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">评级 {asset.rating}</Badge>
                  <Badge variant="outline">风险 {asset.riskLevel}</Badge>
                </div>
              </div>
              <Text variant="body-sm" color="secondary">
                {asset.thesisZh[0] ?? asset.summaryZh}
              </Text>
              <div className="pt-1">
                <Button asChild variant="outline" size="sm">
                  <Link href={asset.detailHref}>查看研究</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/featured-stocks">查看全部重点资产</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
