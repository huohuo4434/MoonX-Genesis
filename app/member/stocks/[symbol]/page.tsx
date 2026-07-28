import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import {
  MemberStockDetailView,
  MemberStockLockedView,
} from "@/components/member/MemberStockDetail";
import { getMemberStockDetailPayload } from "@/lib/data/member-stocks/access";
import { guardMemberForecastRoute } from "@/lib/route-feature-guards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "长鑫科技会员分析 | MoonX",
  description: "长鑫科技会员福利股：今日预测、明日预测与本周分析。",
};

export default async function MemberStockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  noStore();
  guardMemberForecastRoute();
  const { symbol } = await params;
  const payload = await getMemberStockDetailPayload(symbol);
  if (!payload) notFound();

  if (payload.mode === "locked") {
    return (
      <main>
        <MemberStockLockedView
          name={payload.card.name}
          symbol={payload.card.symbol}
          marketLabel={payload.card.marketLabel}
          tags={payload.card.tags}
          hasToday={payload.hasToday}
          hasTomorrow={payload.hasTomorrow}
          hasWeekly={payload.hasWeekly}
        />
      </main>
    );
  }

  return (
    <main>
      <MemberStockDetailView
        stock={payload.stock}
        today={payload.today}
        tomorrow={payload.tomorrow}
        weekly={payload.weekly}
        updatedAt={payload.updatedAt}
        riskLevel={payload.riskLevel}
        ipoHighVolWarning={payload.ipoHighVolWarning}
        isAdmin={payload.isAdmin}
        sourceIds={payload.sourceIds}
      />
    </main>
  );
}
