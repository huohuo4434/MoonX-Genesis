import { AdminNav } from "@/components/admin/AdminNav";
import { KnowledgeBoardClient } from "@/components/admin/KnowledgeBoardClient";
import { Heading, Section, Text } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function AdminKnowledgeConflictsPage() {
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/knowledge/conflicts" />
        <Heading as="h1" size="h2">冲突引擎</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          自动检测老师规则在不同课程中的方向冲突，等待管理员确认。
        </Text>
        <KnowledgeBoardClient view="conflicts" />
      </Section>
    </main>
  );
}
