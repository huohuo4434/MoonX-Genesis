import { AdminNav } from "@/components/admin/AdminNav";
import { TeacherVoiceLearningClient } from "@/components/admin/TeacherVoiceLearningClient";
import { Heading, Section, Text } from "@/components/ui";
import { listTeacherNotes } from "@/lib/teacher-voice-learning/store";

export const dynamic = "force-dynamic";

export default async function AdminTeacherVoiceLearningPage() {
  const notes = await listTeacherNotes();

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/iching/voice-learning" />
        <Heading as="h1" size="h2">
          六爻老师语音学习
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          上传语音 → Whisper 转写 → 按固定模板拆解老师理论 / 案例 / 可调用 JSON，写入 teacher_notes；分析卦象时优先检索老师历史案例。
        </Text>
        <TeacherVoiceLearningClient initialNotes={notes} />
      </Section>
    </main>
  );
}
