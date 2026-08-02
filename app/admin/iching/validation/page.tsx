import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { KnowledgeSourceNotice } from "@/components/admin/KnowledgeSourceNotice";
import { Badge, Button, Heading, Section, Text } from "@/components/ui";
import { loadAdminIChingValidations } from "@/lib/admin/iching-knowledge-safe";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminIchingValidationPage() {
  const result = await loadAdminIChingValidations();
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/iching/validation" />
        <Heading as="h1" size="h2">六爻验证</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-5 block">
          展示已完成的六爻研究验证；主验证表不可用时从老师案例验证状态生成兼容视图。
        </Text>
        <KnowledgeSourceNotice source={result.source} warning={result.warning} />
        <div className="mb-4 flex flex-wrap gap-3">
          <Button asChild><Link href="/admin/iching/validation/new">新增验证结果</Link></Button>
          <Button asChild variant="secondary"><Link href="/verification">查看公开验证</Link></Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border/[0.08]">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead><tr className="border-b border-border/[0.08] bg-surface/60">
              {['研究／案例ID','结果','实际方向','实际路径','分数','验证时间','操作'].map((label) => <th key={label} className="p-4"><Text variant="label" color="tertiary">{label}</Text></th>)}
            </tr></thead>
            <tbody>
              {result.items.map((row) => (
                <tr key={row.id} className="border-b border-border/[0.06] last:border-0 hover:bg-surface/40">
                  <td className="p-4 align-top"><Text variant="mono" className="text-foreground-secondary">{row.researchId}</Text></td>
                  <td className="p-4 align-top"><Badge variant={row.result === 'HIT' || row.result === 'FULL_HIT' ? 'default' : 'neutral'}>{row.result}</Badge></td>
                  <td className="p-4 align-top"><Text variant="body-sm" color="secondary">{row.actualDirection ?? '—'}</Text></td>
                  <td className="max-w-md p-4 align-top"><Text variant="body-sm" color="secondary" className="whitespace-pre-wrap">{row.actualPath ?? '—'}</Text></td>
                  <td className="p-4 align-top"><Text variant="caption" color="tertiary">总分 {row.totalScore ?? '—'} · 方向 {row.directionScore ?? '—'} · 时机 {row.timingScore ?? '—'}</Text></td>
                  <td className="p-4 align-top"><Text variant="caption" color="tertiary">{formatDateTimeChina(row.verifiedAt)}</Text></td>
                  <td className="p-4 align-top">{row.editHref ? <Button asChild size="sm"><Link href={row.editHref}>打开</Link></Button> : <Text variant="caption" color="tertiary">只读</Text>}</td>
                </tr>
              ))}
              {!result.items.length ? <tr><td colSpan={7} className="p-6"><Text variant="body-sm" color="secondary">暂无已完成验证记录。</Text></td></tr> : null}
            </tbody>
          </table>
        </div>
      </Section>
    </main>
  );
}
