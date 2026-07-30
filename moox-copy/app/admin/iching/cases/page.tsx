import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Button, Heading, Section, Text } from "@/components/ui";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminIchingCasesPage() {
  if (!prisma) return <Text variant="body-sm">未配置数据库</Text>;

  const cases = await prisma.masterCase.findMany({
    orderBy: { forecastStartAt: "desc" },
    take: 200,
  });

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/iching/cases" />
        <Heading as="h1" size="h2">
          六爻历史案例
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          用于把 IChingResearch 与实际行情结果做对应与复盘（仅管理员可见）。
        </Text>
        <div className="mb-4">
          <Link href="/admin/iching/cases/new">
            <Button>新增案例</Button>
          </Link>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/[0.08]">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border/[0.08] bg-surface/60">
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    assetId
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    caseTitle
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    预测周期
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    validation
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
              {cases.map((c) => (
                <tr key={c.id} className="border-b border-border/[0.06] last:border-0 hover:bg-surface/40">
                  <td className="p-lg align-top">
                    <Text variant="body-sm" weight="semibold">
                      {c.assetId}
                    </Text>
                    <Text variant="caption" color="tertiary" className="block mt-1">
                      {c.id}
                    </Text>
                  </td>
                  <td className="p-lg align-top max-w-md">
                    <Text variant="body-sm" color="secondary" className="whitespace-pre-wrap">
                      {c.caseTitle}
                    </Text>
                  </td>
                  <td className="p-lg align-top">
                    <Text variant="body-sm" color="secondary">
                      {c.forecastStartAt} → {c.forecastEndAt}
                    </Text>
                  </td>
                  <td className="p-lg align-top">
                    <div className="flex flex-col gap-1">
                      <Badge variant={c.validationStatus === "HIT" ? "default" : "neutral"}>{c.validationStatus ?? "UNVERIFIED"}</Badge>
                      <Text variant="caption" color="tertiary">
                        score: {c.validationScore ?? "-"}
                      </Text>
                    </div>
                  </td>
                  <td className="p-lg align-top">
                    <Text variant="caption" color="tertiary">
                      关联 researchId: {c.researchId}
                    </Text>
                  </td>
                </tr>
              ))}
              {!cases.length ? (
                <tr>
                  <td colSpan={5} className="p-lg">
                    <Text variant="body-sm" color="secondary">
                      暂无案例。
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

