import { AdminNav } from "@/components/admin/AdminNav";
import { AdminSupportResistanceClient } from "@/components/admin/AdminSupportResistanceClient";
import { Heading, Text } from "@/components/ui";
import { buildAdminFullCycleSnapshot } from "@/lib/admin/full-cycle-control";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminSupportResistancePage() {
  const snapshot = await buildAdminFullCycleSnapshot();

  return (
    <main className="mx-auto w-full max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <AdminNav current="/admin/support-resistance" />
      <Heading as="h1" size="h2" className="mb-2">
        支撑压力录入与突破复核
      </Heading>
      <Text variant="body-sm" color="secondary" className="mb-6 max-w-4xl">
        为七大市场和全部重点关注资产录入4小时、日线或周线支撑压力区，并在确认突破后检查六爻、奇门等研究方向是否一致。
      </Text>
      <AdminSupportResistanceClient initial={snapshot} />
    </main>
  );
}
