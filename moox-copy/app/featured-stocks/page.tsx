import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { ConvictionListClient } from "@/components/conviction/ConvictionListClient";
import { getConvictionListPagePayload } from "@/lib/data/conviction/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "MOOX Conviction List | 重点关注",
  description: "MOOX持续研究和验证的少数重点资产。公开基本面，会员查看完整预测。",
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
