import { AdminNav } from "@/components/admin/AdminNav";
import { TeacherLearningCenterClient } from "@/components/admin/TeacherLearningCenterClient";
import { Heading, Section, Text } from "@/components/ui";
import { getKnowledgeGrowthStats } from "@/lib/teacher-learning-center/store";

export const dynamic = "force-dynamic";

export default async function TeacherLearningCenterPage() {
  const stats = await getKnowledgeGrowthStats();

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/teacher-learning" />
        <Heading as="h1" size="h2">
          老师学习中心
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          上传老师课程，MoonX自动学习。
        </Text>
        <TeacherLearningCenterClient initialStats={stats} />
      </Section>
    </main>
  );
}
