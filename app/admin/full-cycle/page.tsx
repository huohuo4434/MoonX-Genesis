import { AdminNav } from "@/components/admin/AdminNav";
import { AdminFullCycleControlClient } from "@/components/admin/AdminFullCycleControlClient";
import { Heading, Text } from "@/components/ui";
import { buildAdminFullCycleSnapshot } from "@/lib/admin/full-cycle-control";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminFullCyclePage() {
  const snapshot = await buildAdminFullCycleSnapshot();
  return (
    <main className="mx-auto w-full max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <AdminNav current="/admin/full-cycle" />
      <Heading as="h1" size="h2" className="mb-2">
        全周期预测与关键日控制台
      </Heading>
      <Text variant="body-sm" color="secondary" className="mb-6 max-w-4xl">
        管理员可查看周内逐日、月内逐周、年度逐月研究，并录入关键日期、支撑压力区与突破确认。正式预测原版本不会被覆盖，突破只生成未来修订候选。
      </Text>
      <AdminFullCycleControlClient initial={snapshot} />
    </main>
  );
}
