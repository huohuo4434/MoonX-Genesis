import { AdminNav } from "@/components/admin/AdminNav";
import { KnowledgeBoardClient } from "@/components/admin/KnowledgeBoardClient";
import { Heading, Section, Text } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function AdminKnowledgeReasonPage() {
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/knowledge/reason" />
        <Heading as="h1" size="h2">Teacher Reasoning</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          Step1 MasterRule → Step2 MasterCase → Step3 Graph → Step4 历史案例 → Step5 带引用结论。
        </Text>
        <KnowledgeBoardClient view="reason" />
      </Section>
    </main>
  );
}
