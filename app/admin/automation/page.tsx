import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAutomationClient } from "@/components/admin/AdminAutomationClient";
import { Heading, Section, Text } from "@/components/ui";
import { getAutomationDashboard } from "@/lib/automation/cycle";
import { getAutomationSettings } from "@/lib/data/moonx-data-store";

export const dynamic = "force-dynamic";

export default async function AdminAutomationPage() {
  const [dashboard, settings] = await Promise.all([getAutomationDashboard(), getAutomationSettings()]);

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/automation" />
        <Heading as="h1" size="h2">
          自动化中心
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          每日自动预测、验证、复盘与学习。开关默认开启；不会伪造新卦。
        </Text>
        <AdminAutomationClient settings={settings} dashboard={dashboard} />
      </Section>
    </main>
  );
}
