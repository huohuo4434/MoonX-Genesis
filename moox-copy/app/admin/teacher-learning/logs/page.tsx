import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Card, Heading, Section, Text } from "@/components/ui";
import {
  getKnowledgeGrowthStats,
  listLearningLogs,
} from "@/lib/teacher-learning-center/store";

export const dynamic = "force-dynamic";

export default async function TeacherLearningLogsPage() {
  const [logs, stats] = await Promise.all([listLearningLogs(), getKnowledgeGrowthStats()]);

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/teacher-learning" />
        <Heading as="h1" size="h2">
          老师学习日志
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-4">
          课程学习与知识增长记录。
        </Text>
        <Link href="/admin/teacher-learning" className="mb-4 inline-block text-body-sm underline">
          ← 返回老师学习中心
        </Link>

        <Card padding="md" className="mb-6 grid gap-3 sm:grid-cols-5">
          <div>
            <Text variant="caption" color="tertiary">
              老师课程
            </Text>
            <Text variant="body" weight="semibold">
              {stats.lessonCount}节
            </Text>
          </div>
          <div>
            <Text variant="caption" color="tertiary">
              累计学习
            </Text>
            <Text variant="body" weight="semibold">
              {stats.learningHours}小时
            </Text>
          </div>
          <div>
            <Text variant="caption" color="tertiary">
              规则
            </Text>
            <Text variant="body" weight="semibold">
              {stats.ruleCount}条
            </Text>
          </div>
          <div>
            <Text variant="caption" color="tertiary">
              案例
            </Text>
            <Text variant="body" weight="semibold">
              {stats.caseCount}个
            </Text>
          </div>
          <div>
            <Text variant="caption" color="tertiary">
              经典原话
            </Text>
            <Text variant="body" weight="semibold">
              {stats.quoteCount}条
            </Text>
          </div>
        </Card>

        <div className="space-y-3">
          {logs.length === 0 ? (
            <Text variant="body-sm" color="secondary">
              暂无日志。加入知识库后会自动生成。
            </Text>
          ) : (
            logs.map((log) => (
              <Card key={log.id} padding="md">
                <Text variant="body-sm" weight="semibold">
                  {log.day} · 课程：{log.lessonTitle || "—"}
                </Text>
                <Text variant="body-sm" color="secondary" className="mt-1 block">
                  新增规则：{log.rulesAdded}条 · 新增案例：{log.casesAdded}个 · 修正规则：
                  {log.rulesRevised}条 · 等待审核：{log.pendingReview}条
                </Text>
              </Card>
            ))
          )}
        </div>
      </Section>
    </main>
  );
}
