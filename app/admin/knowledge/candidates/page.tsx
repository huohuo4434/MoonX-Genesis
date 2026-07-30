import { AdminNav } from "@/components/admin/AdminNav";
import { KnowledgeCandidatesClient } from "@/components/admin/KnowledgeCandidatesClient";
import { Heading, Section, Text } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function AdminKnowledgeCandidatesPage() {
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/knowledge/candidates" />
        <Heading as="h1" size="h2">
          知识候选审核
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          AI 拆解默认 Draft。通过后写入正式 MasterRule / MasterCase。
        </Text>
        <KnowledgeCandidatesClient />
      </Section>
    </main>
  );
}
