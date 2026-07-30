import { AdminNav } from "@/components/admin/AdminNav";
import { LessonCenterClient } from "@/components/admin/LessonCenterClient";
import { Heading, Section, Text } from "@/components/ui";
import { listLessons } from "@/lib/master-intelligence/store";

export const dynamic = "force-dynamic";

export default async function AdminLessonsPage() {
  const lessons = await listLessons();

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/lessons" />
        <Heading as="h1" size="h2">
          Lesson Center
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          Research → Lessons。老师每一节课自动学习、拆知识、建立规则/案例/图谱。AI 提炼默认 Draft，审核后才进入正式 MasterRule。
        </Text>
        <LessonCenterClient initialLessons={lessons} />
      </Section>
    </main>
  );
}
