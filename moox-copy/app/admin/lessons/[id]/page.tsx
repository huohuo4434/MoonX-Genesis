import { AdminNav } from "@/components/admin/AdminNav";
import { LessonDetailClient } from "@/components/admin/LessonDetailClient";
import { Heading, Section, Text } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminLessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/lessons" />
        <Heading as="h1" size="h2">
          课程详情
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          Raw 永久保留；Clean 仅做口头语与标点整理；知识拆解进入 Draft 候选。
        </Text>
        <LessonDetailClient id={id} />
      </Section>
    </main>
  );
}
