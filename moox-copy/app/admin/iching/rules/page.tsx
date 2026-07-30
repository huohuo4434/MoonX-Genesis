import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Button, Heading, Section, Text } from "@/components/ui";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminIchingRulesPage() {
  if (!prisma) return <Text variant="body-sm">未配置数据库</Text>;

  const rules = await prisma.masterRule.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/iching/rules" />
        <Heading as="h1" size="h2">
          老师投资六爻规则
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          管理员可编辑规则库；不会删除已被引用的历史记录（当前实现为软禁用：仅更新状态为 ARCHIVED）。
        </Text>

        <div className="mb-4">
          <Link href="/admin/iching/rules/new">
            <Button>新增规则</Button>
          </Link>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/[0.08]">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border/[0.08] bg-surface/60">
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    规则
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    标题
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    类别 / 优先级
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    状态
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    更新
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    操作
                  </Text>
                </th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.ruleCode} className="border-b border-border/[0.06] last:border-0 hover:bg-surface/40">
                  <td className="p-lg align-top">
                    <Text variant="mono" className="font-mono text-foreground-secondary">
                      {r.ruleCode}
                    </Text>
                  </td>
                  <td className="p-lg align-top">
                    <Text variant="body-sm" weight="semibold">
                      {r.title}
                    </Text>
                  </td>
                  <td className="p-lg align-top">
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline">{r.category}</Badge>
                      <Text variant="caption" color="tertiary">
                        priority: {r.priority}
                      </Text>
                    </div>
                  </td>
                  <td className="p-lg align-top">
                    <Badge variant={r.status === "ACTIVE" ? "default" : "neutral"}>{r.status}</Badge>
                  </td>
                  <td className="p-lg align-top">
                    <Text variant="caption" color="tertiary">
                      {r.updatedAt.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
                    </Text>
                  </td>
                  <td className="p-lg align-top">
                    <Link href={`/admin/iching/rules/${encodeURIComponent(r.ruleCode)}`}>
                      <Button size="sm">编辑</Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {!rules.length ? (
                <tr>
                  <td colSpan={6} className="p-lg">
                    <Text variant="body-sm" color="secondary">
                      暂无规则数据。
                    </Text>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Section>
    </main>
  );
}

