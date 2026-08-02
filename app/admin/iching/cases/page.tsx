import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { KnowledgeSourceNotice } from "@/components/admin/KnowledgeSourceNotice";
import { Badge, Button, Heading, Section, Text } from "@/components/ui";
import { loadAdminIChingCases } from "@/lib/admin/iching-knowledge-safe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminIchingCasesPage() {
  const result = await loadAdminIChingCases();
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/iching/cases" />
        <Heading as="h1" size="h2">六爻历史案例</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-5 block">
          统一展示旧六爻案例与老师知识库案例，主表异常时自动降级。
        </Text>
        <KnowledgeSourceNotice source={result.source} warning={result.warning} />
        <div className="mb-4 flex flex-wrap gap-3">
          <Button asChild><Link href="/admin/iching/cases/new">新增案例</Link></Button>
          <Button asChild variant="secondary"><Link href="/admin/teacher-knowledge/search">搜索老师案例</Link></Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border/[0.08]">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead><tr className="border-b border-border/[0.08] bg-surface/60">
              {['资产','案例','预测周期','验证','关联／代码','操作'].map((label) => <th key={label} className="p-4"><Text variant="label" color="tertiary">{label}</Text></th>)}
            </tr></thead>
            <tbody>
              {result.items.map((row) => (
                <tr key={row.id} className="border-b border-border/[0.06] last:border-0 hover:bg-surface/40">
                  <td className="p-4 align-top"><Text variant="body-sm" weight="semibold">{row.assetId}</Text><Text variant="caption" color="tertiary" className="mt-1 block">{row.id}</Text></td>
                  <td className="max-w-md p-4 align-top"><Text variant="body-sm" color="secondary">{row.title}</Text></td>
                  <td className="p-4 align-top"><Text variant="body-sm" color="secondary">{row.forecastStartAt} → {row.forecastEndAt}</Text></td>
                  <td className="p-4 align-top"><Badge variant={row.validationStatus === 'HIT' || row.validationStatus === 'FULL_HIT' ? 'default' : 'neutral'}>{row.validationStatus}</Badge>{row.validationScore != null ? <Text variant="caption" color="tertiary" className="mt-1 block">分数 {row.validationScore}</Text> : null}</td>
                  <td className="p-4 align-top"><Text variant="caption" color="tertiary">{row.relationLabel}</Text></td>
                  <td className="p-4 align-top">{row.editHref ? <Button asChild size="sm"><Link href={row.editHref}>打开</Link></Button> : <Text variant="caption" color="tertiary">只读</Text>}</td>
                </tr>
              ))}
              {!result.items.length ? <tr><td colSpan={6} className="p-6"><Text variant="body-sm" color="secondary">暂无案例。</Text></td></tr> : null}
            </tbody>
          </table>
        </div>
      </Section>
    </main>
  );
}
