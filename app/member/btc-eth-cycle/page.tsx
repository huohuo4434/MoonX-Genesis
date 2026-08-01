import { redirect } from "next/navigation";
import { BtcEthCycleComparison } from "@/components/research/BtcEthCycleComparison";
import { requireMember } from "@/lib/auth/permissions";
import { getBtcEthCycleBundle } from "@/lib/data/crypto-cycle-comparison-20260801";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "BTC／ETH周期交叉验证 | MOOX Intelligence",
  description: "BTC与ETH多周期六爻研究和相对强弱交叉验证。",
};

export default async function MemberBtcEthCyclePage() {
  const user = await requireMember();
  if (!user) redirect("/login?next=/member/btc-eth-cycle");
  return (
    <main className="mx-auto w-full max-w-container px-4 py-10 sm:px-6 lg:px-8">
      <BtcEthCycleComparison {...getBtcEthCycleBundle()} />
    </main>
  );
}
