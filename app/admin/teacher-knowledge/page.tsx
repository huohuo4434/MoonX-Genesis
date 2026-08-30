import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button, Card, Heading, Section, Text } from "@/components/ui";
import { listLessons, listRules, listCases } from "@/lib/teacher-knowledge/store";

export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function TeacherKnowledgeHomePage() {
  const [lessons, rules, cases] = await Promise.all([
    listLessons(),
    listRules(),
    listCases(),
  ]);
  const approvedRules = rules.filter((r) => r.status === "APPROVED").length;
  const draftRules = rules.filter((r) => r.status === "DRAFT").length;

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/teacher-knowledge" />
        <Heading as="h1" size="h2">
          老师知识库
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          Teacher Knowledge — 粘贴转写文字 → AI 候选 → 人工审核 → 正式知识库。音视频上传已停用。
        </Text>

        <Card padding="md" className="mb-6 grid gap-3 sm:grid-cols-4">
          <Stat label="课程" value={String(lessons.length)} />
          <Stat label="正式规则" value={String(approvedRules)} />
          <Stat label="草稿规则" value={String(draftRules)} />
          <Stat label="案例" value={String(cases.length)} />
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/admin/teacher-knowledge/lessons/new">录入老师课程</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/admin/teacher-knowledge/review">审核候选知识</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/admin/teacher-knowledge/search">知识库搜索</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/admin/teacher-knowledge/import">导入</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/api/admin/teacher-knowledge/import-export?kind=full">导出完整备份</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/api/admin/teacher-knowledge/import-export?kind=ai&format=md">
              导出AI知识包 MD
            </Link>
          </Button>
        </div>

        <div className="mt-8 space-y-3">
          <Text variant="body" weight="semibold">
            最近课程
          </Text>
          {lessons.slice(0, 12).map((l) => (
            <Card key={l.id} padding="md" className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Text variant="body-sm" weight="semibold">
                  {l.lessonCode} · {l.title}
                </Text>
                <Text variant="caption" color="tertiary" className="block">
                  {l.teacherName || "—"} · {l.status} · v{l.version}
                </Text>
                {(l.automationAttemptCount ?? 0) > 0 ? (
                  <Text variant="caption" color="secondary" className="mt-1 block">
                    {(l.automationAttemptCount ?? 0) >= 3
                      ? `自动补偿已停止，待手动重试 · ${l.automationLastError || "失败原因待查看"}`
                      : `自动补偿重试 ${l.automationAttemptCount}/3 · 下次 ${l.automationNextRetryAt || "待调度"} · ${l.automationLastError || ""}`}
                  </Text>
                ) : null}
              </div>
              <Link
                href={`/admin/teacher-knowledge/lessons/${l.id}`}
                className="text-body-sm underline underline-offset-2"
              >
                打开
              </Link>
            </Card>
          ))}
        </div>
      </Section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text variant="caption" color="tertiary">
        {label}
      </Text>
      <Text variant="body" weight="semibold">
        {value}
      </Text>
    </div>
  );
}
