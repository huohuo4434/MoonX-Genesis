import type { Metadata } from "next";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { unstable_noStore as noStore } from "next/cache";
import { ConvictionListClient } from "@/components/conviction/ConvictionListClient";
import { getConvictionListPagePayload } from "@/lib/data/conviction/access";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/featured-stocks",
    titleZh: "重点关注资产",
    titleEn: "Research Watchlist",
    descriptionZh: "MOOX持续研究和验证的重点资产。公开基本面，会员查看完整周期研究。",
    descriptionEn: "Priority assets under continuous MOOX research, including public fundamentals, catalysts, risks and member-only cycle analysis.",
  });
}


export const dynamic = "force-dynamic";
export const revalidate = 0;


export default async function FeaturedStocksPage() {
  noStore();
  const payload = await getConvictionListPagePayload();
  return (
    <main>
      <ConvictionListClient payload={payload} riskAsOf={new Date().toISOString()} />
    </main>
  );
}
