import { AdminNav } from "@/components/admin/AdminNav";
import { AdminWavePanel } from "@/components/admin/AdminWavePanel";
import { Heading, Section, Text } from "@/components/ui";
import { requireAdminOrRedirect } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "波浪分析 | 管理后台",
};

export default async function AdminWavePage() {
  await requireAdminOrRedirect("/admin/wave");

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/wave" />
        <Heading as="h1" size="h2">
          波浪分析
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          录入波浪观点并验证结果。初始权重 5%，根据已验证样本动态调整，最高 22%。
        </Text>
        <AdminWavePanel />
      </Section>
    </main>
  );
}
