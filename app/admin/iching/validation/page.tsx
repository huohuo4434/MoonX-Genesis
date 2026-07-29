import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Button, Heading, Section, Text } from "@/components/ui";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminIchingValidationPage() {
  if (!prisma) return <Text variant="body-sm">未配置数据库</Text>;

  const validations = await prisma.iChingValidation.findMany({
    orderBy: { verifiedAt: "desc" },
    take: 200,
  });

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/iching/validation" />
        <Heading as="h1" size="h2">
          六爻验证
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          保存六爻研究的验证结果（仅管理员可见）。
        </Text>
        <div className="mb-4">
          <Link href="/admin/iching/validation/new">
            <Button>新增验证结果</Button>
          </Link>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/[0.08]">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border/[0.08] bg-surface/60">
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    researchId
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    actualDirection / result
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    actualPath
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    分数
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    verifiedAt
                  </Text>
                </th>
              </tr>
            </thead>
            <tbody>
              {validations.map((v) => (
                <tr key={v.id} className="border-b border-border/[0.06] last:border-0 hover:bg-surface/40">
                  <td className="p-lg align-top">
                    <Text variant="mono" className="text-foreground-secondary">
                      {v.researchId}
                    </Text>
                  </td>
                  <td className="p-lg align-top">
                    <div className="flex flex-col gap-1">
                      <Badge variant={v.result === "HIT" ? "default" : "neutral"}>{v.result ?? "UNVERIFIABLE"}</Badge>
                      <Text variant="caption" color="tertiary">
                        actualDirection: {v.actualDirection ?? "-"}
                      </Text>
                    </div>
                  </td>
                  <td className="p-lg align-top max-w-md">
                    <Text variant="body-sm" color="secondary" className="whitespace-pre-wrap">
                      {v.actualPath ?? "-"}
                    </Text>
                  </td>
                  <td className="p-lg align-top">
                    <Text variant="caption" color="tertiary">
                      total: {v.totalScore ?? "-"} · direction: {v.directionScore ?? "-"} · timing: {v.timingScore ?? "-"}
                    </Text>
                  </td>
                  <td className="p-lg align-top">
                    <Text variant="caption" color="tertiary">
                      {v.verifiedAt ? v.verifiedAt.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) : "-"}
                    </Text>
                  </td>
                </tr>
              ))}
              {!validations.length ? (
                <tr>
                  <td colSpan={5} className="p-lg">
                    <Text variant="body-sm" color="secondary">
                      暂无验证记录。
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

