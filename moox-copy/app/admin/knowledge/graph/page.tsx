import { AdminNav } from "@/components/admin/AdminNav";
import { KnowledgeBoardClient } from "@/components/admin/KnowledgeBoardClient";
import { Heading, Section, Text } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function AdminKnowledgeGraphPage() {
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/knowledge/graph" />
        <Heading as="h1" size="h2">知识图谱</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          课程拆解与种子规则自动连接的节点与边。
        </Text>
        <KnowledgeBoardClient view="graph" />
      </Section>
    </main>
  );
}
