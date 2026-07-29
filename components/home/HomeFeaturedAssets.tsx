import Link from "next/link";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Button, Card, Text } from "@/components/ui";
import { listFeaturedStocks, starsDisplay } from "@/lib/data/featured-stocks";

const PUBLIC_HREF: Record<string, string> = {
  "changxin-688825": "/featured-stocks/cxmt",
  asteroid: "/featured-stocks/asteroid",
};

const RISK_LABEL: Record<string, string> = {
  "changxin-688825": "中高风险",
  asteroid: "高风险",
};

/** Homepage module 4: two compact featured-asset cards only. */
export function HomeFeaturedAssets() {
  const stocks = listFeaturedStocks().slice(0, 2);

  return (
    <section className="border-t border-border/[0.06] py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="重点关注" title="重点关注资产" subtitle="公开关注逻辑摘要，完整研究见详情页。" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {stocks.map((stock) => (
            <Card key={stock.id} padding="lg" className="flex flex-col gap-3 border-border/[0.08]">
              <div>
                <Text variant="body" weight="semibold">
                  {stock.name}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  {stock.marketLabel} · {stock.symbol}
                </Text>
              </div>
              <Text variant="body-sm" color="secondary">
                评级 {stock.longTermRating} · {starsDisplay(stock.convictionStars)} ·{" "}
                {RISK_LABEL[stock.id] ?? "风险关注"}
              </Text>
              <Text variant="body-sm" color="secondary">
                {stock.whyWatch[0] ?? stock.ratingNote}
              </Text>
              <div className="pt-1">
                <Button asChild variant="outline" size="sm">
                  <Link href={PUBLIC_HREF[stock.id] ?? "/featured-stocks"}>查看研究</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
