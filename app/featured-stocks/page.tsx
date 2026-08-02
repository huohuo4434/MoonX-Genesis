import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { ConvictionListClient } from "@/components/conviction/ConvictionListClient";
import { getConvictionListPagePayload } from "@/lib/data/conviction/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "重点关注资产",
  description: "MOOX持续研究和验证的重点资产。公开基本面，会员查看完整周期研究。",
  alternates: { canonical: "/featured-stocks" },
};

export default async function FeaturedStocksPage() {
  noStore();
  const payload = await getConvictionListPagePayload();
  return (
    <main>
      <ConvictionListClient payload={payload} />
    </main>
  );
}
