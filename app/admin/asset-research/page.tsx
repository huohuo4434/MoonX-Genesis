import { AdminNav } from "@/components/admin/AdminNav";
import { AssetResearchUploadClient } from "@/components/admin/AssetResearchUploadClient";
import { Heading, Section, Text } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function AdminAssetResearchPage() {
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/asset-research" />
        <Heading as="h1" size="h2">
          单资产分析导入
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          上传单独币种、股票或指数的六爻、奇门、八字、周期和技术材料。材料先进入待整理区，复核后再进入重点关注与预测系统。
        </Text>
        <AssetResearchUploadClient />
      </Section>
    </main>
  );
}
