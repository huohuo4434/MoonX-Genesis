import { AdminNav } from "@/components/admin/AdminNav";
import { AdminForecastMatrixClient } from "@/components/admin/AdminForecastMatrixClient";
import { Heading, Text } from "@/components/ui";
import { buildAdminFullCycleSnapshot } from "@/lib/admin/full-cycle-control";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminForecastControlPage() {
  const snapshot = await buildAdminFullCycleSnapshot();

  return (
    <main className="mx-auto w-full max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <AdminNav current="/admin/forecast-control" />
      <Heading as="h1" size="h2" className="mb-2">
        管理员走势总控
      </Heading>
      <Text variant="body-sm" color="secondary" className="mb-6 max-w-4xl">
        核心市场可查看一周逐日、一个月逐周和一年逐月；重点关注资产查看本周与月内逐周。缺失预测会明确标出，不再隐藏。
      </Text>
      <AdminForecastMatrixClient initial={snapshot} />
    </main>
  );
}
