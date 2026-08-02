import { AdminNav } from "@/components/admin/AdminNav";
import { VibeEvidenceAdminClient } from "@/components/admin/VibeEvidenceAdminClient";
import { Heading, Section, Text } from "@/components/ui";
import { testVibeConnection } from "@/lib/data/vibe/client";
import { listVibeEvidence } from "@/lib/data/vibe/store";
import { countPendingPaymentOrders } from "@/lib/payments/payment-orders-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminVibeEvidencePage() {
  const [records, connection, pending] = await Promise.all([
    listVibeEvidence(),
    testVibeConnection(),
    countPendingPaymentOrders(),
  ]);

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/vibe-evidence" pendingCount={pending} />
        <Heading as="h1" size="h2">Vibe客观证据</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6 block max-w-4xl">
          读取Vibe-Research的行情、财务、估值、资金、公告和行业数据，标准化为MOOX证据分。缺失数据只降低完整度，不会被当作利空。
        </Text>
        <VibeEvidenceAdminClient initialRecords={records} initialConnection={connection} />
      </Section>
    </main>
  );
}
