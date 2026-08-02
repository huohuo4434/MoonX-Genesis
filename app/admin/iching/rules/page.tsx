import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { KnowledgeSourceNotice } from "@/components/admin/KnowledgeSourceNotice";
import { Badge, Button, Heading, Section, Text } from "@/components/ui";
import { loadAdminIChingRules } from "@/lib/admin/iching-knowledge-safe";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminIchingRulesPage() {
  const result = await loadAdminIChingRules();
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/iching/rules" />
        <Heading as="h1" size="h2">六爻规则</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-5 block">
          规则页优先读取六爻主规则表，缺表或迁移未完成时自动读取老师知识库规则。
        </Text>
        <KnowledgeSourceNotice source={result.source} warning={result.warning} />
        <div className="mb-4 flex flex-wrap gap-3">
          <Button asChild><Link href="/admin/iching/rules/new">新增六爻规则</Link></Button>
          <Button asChild variant="secondary"><Link href="/admin/teacher-knowledge/review">审核老师规则</Link></Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border/[0.08]">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead><tr className="border-b border-border/[0.08] bg-surface/60">
              {['规则代码','标题','分类／优先级','状态','更新时间','操作'].map((label) => <th key={label} className="p-4"><Text variant="label" color="tertiary">{label}</Text></th>)}
            </tr></thead>
            <tbody>
              {result.items.map((row) => (
                <tr key={row.id} className="border-b border-border/[0.06] last:border-0 hover:bg-surface/40">
                  <td className="p-4 align-top"><Text variant="mono" className="text-foreground-secondary">{row.ruleCode}</Text></td>
                  <td className="max-w-md p-4 align-top"><Text variant="body-sm" weight="semibold">{row.title}</Text></td>
                  <td className="p-4 align-top"><Badge variant="outline">{row.category}</Badge><Text variant="caption" color="tertiary" className="mt-1 block">优先级 {row.priority}</Text></td>
                  <td className="p-4 align-top"><Badge variant={row.status === 'ACTIVE' || row.status === 'APPROVED' ? 'default' : 'neutral'}>{row.status}</Badge></td>
                  <td className="p-4 align-top"><Text variant="caption" color="tertiary">{formatDateTimeChina(row.updatedAt)}</Text></td>
                  <td className="p-4 align-top"><Button asChild size="sm"><Link href={row.editHref}>打开</Link></Button></td>
                </tr>
              ))}
              {!result.items.length ? <tr><td colSpan={6} className="p-6"><Text variant="body-sm" color="secondary">暂无规则数据。</Text></td></tr> : null}
            </tbody>
          </table>
        </div>
      </Section>
    </main>
  );
}
