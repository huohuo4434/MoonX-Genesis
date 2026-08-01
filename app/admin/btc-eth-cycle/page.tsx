import { AdminNav } from "@/components/admin/AdminNav";
import { BtcEthCycleComparison } from "@/components/research/BtcEthCycleComparison";
import { getBtcEthCycleBundle } from "@/lib/data/crypto-cycle-comparison-20260801";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminBtcEthCyclePage() {
  const data = getBtcEthCycleBundle();
  return (
    <main className="mx-auto w-full max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <AdminNav current="/admin/btc-eth-cycle" />
      <BtcEthCycleComparison {...data} admin />
    </main>
  );
}
