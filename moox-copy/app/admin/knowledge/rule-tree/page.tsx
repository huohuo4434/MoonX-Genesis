import { AdminNav } from "@/components/admin/AdminNav";
import { KnowledgeBoardClient } from "@/components/admin/KnowledgeBoardClient";
import { Heading, Section, Text } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function AdminKnowledgeRuleTreePage() {
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/knowledge/rule-tree" />
        <Heading as="h1" size="h2">规则树</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          AI 分析必须走规则树条件分支，而非自由回答。
        </Text>
        <KnowledgeBoardClient view="rule-tree" />
      </Section>
    </main>
  );
}
