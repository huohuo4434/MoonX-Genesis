import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { KnowledgeSourceNotice } from "@/components/admin/KnowledgeSourceNotice";
import { Badge, Button, Heading, Section, Text } from "@/components/ui";
import { loadAdminIChingLibrary } from "@/lib/admin/iching-knowledge-safe";
import {
  ICHING_ASSET_OPTIONS,
  ICHING_RESEARCH_STATUS_OPTIONS,
} from "@/lib/iching-research/asset-options";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminIchingLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const assetId = typeof sp.assetId === "string" ? sp.assetId : undefined;
  const sourceType = typeof sp.sourceType === "string" ? sp.sourceType : undefined;
  const researchStatus =
    typeof sp.researchStatus === "string" ? sp.researchStatus : undefined;
  const verified = typeof sp.verified === "string" ? sp.verified : undefined;
  const questionQuery = typeof sp.q === "string" ? sp.q : undefined;

  const result = await loadAdminIChingLibrary({
    assetId,
    sourceType:
      sourceType === "MASTER" || sourceType === "INTERNAL"
        ? sourceType
        : undefined,
    researchStatus,
    verified: verified === "YES" || verified === "NO" ? verified : undefined,
    questionQuery,
  });

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/iching/library" />
        <Heading as="h1" size="h2">
          六爻研究库
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-5 block">
          统一浏览六爻原始研究和老师知识库资料。主数据表不可用时自动降级，不再整页加载失败。
        </Text>

        <KnowledgeSourceNotice source={result.source} warning={result.warning} />

        <form
          className="mb-5 grid gap-3 rounded-lg border border-border/[0.08] bg-muted/10 p-4 md:grid-cols-6"
          action="/admin/iching/library"
          method="get"
        >
          <label className="flex flex-col gap-1">
            <Text variant="caption" color="tertiary">资产</Text>
            <select name="assetId" defaultValue={assetId ?? ""} className="min-h-11 rounded-md border border-input bg-surface px-3 py-2 text-body-sm">
              <option value="">全部</option>
              {ICHING_ASSET_OPTIONS.map((asset) => (
                <option key={asset} value={asset}>{asset}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <Text variant="caption" color="tertiary">来源</Text>
            <select name="sourceType" defaultValue={sourceType ?? ""} className="min-h-11 rounded-md border border-input bg-surface px-3 py-2 text-body-sm">
              <option value="">全部</option>
              <option value="MASTER">老师</option>
              <option value="INTERNAL">内部</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <Text variant="caption" color="tertiary">状态</Text>
            <select name="researchStatus" defaultValue={researchStatus ?? ""} className="min-h-11 rounded-md border border-input bg-surface px-3 py-2 text-body-sm">
              <option value="">全部</option>
              {ICHING_RESEARCH_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <Text variant="caption" color="tertiary">验证</Text>
            <select name="verified" defaultValue={verified ?? ""} className="min-h-11 rounded-md border border-input bg-surface px-3 py-2 text-body-sm">
              <option value="">全部</option>
              <option value="YES">已验证</option>
              <option value="NO">未验证</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <Text variant="caption" color="tertiary">全文搜索</Text>
            <div className="flex gap-2">
              <input
                name="q"
                defaultValue={questionQuery ?? ""}
                placeholder="问题、原文、分析、卦名"
                className="min-h-11 min-w-0 flex-1 rounded-md border border-input bg-surface px-3 py-2 text-body-sm"
              />
              <Button type="submit" className="min-h-11">筛选</Button>
            </div>
          </label>
        </form>

        <div className="overflow-x-auto rounded-lg border border-border/[0.08]">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border/[0.08] bg-surface/60">
                {[
                  "资产",
                  "研究问题／资料",
                  "周期",
                  "时间",
                  "来源",
                  "卦象／类型",
                  "状态",
                  "验证",
                  "版本",
                  "操作",
                ].map((label) => (
                  <th key={label} className="p-4"><Text variant="label" color="tertiary">{label}</Text></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.items.map((row) => (
                <tr key={row.id} className="border-b border-border/[0.06] last:border-0 hover:bg-surface/40">
                  <td className="p-4 align-top"><Text variant="body-sm" weight="semibold">{row.assetId}</Text></td>
                  <td className="max-w-sm p-4 align-top"><Text variant="body-sm" color="secondary" className="whitespace-pre-wrap">{row.question}</Text></td>
                  <td className="p-4 align-top"><Text variant="caption" color="tertiary">{row.forecastType}</Text><Text variant="body-sm" color="secondary" className="mt-1 block">{row.forecastStartAt} → {row.forecastEndAt}</Text></td>
                  <td className="p-4 align-top"><Text variant="caption" color="tertiary">{formatDateTimeChina(row.castAt)}</Text></td>
                  <td className="p-4 align-top"><div className="flex flex-col gap-1"><Badge variant="outline">{row.sourceType}</Badge><Badge variant="neutral">{row.adoptedSource}</Badge></div></td>
                  <td className="p-4 align-top"><Text variant="body-sm" weight="semibold">{row.hexagramName}</Text>{row.changedHexagramName ? <Text variant="caption" color="tertiary" className="mt-1 block">变卦：{row.changedHexagramName}</Text> : null}</td>
                  <td className="p-4 align-top"><Badge variant="neutral">{row.researchStatus}</Badge></td>
                  <td className="p-4 align-top"><Text variant="body-sm" color="secondary">{row.verifiedLabel}</Text></td>
                  <td className="p-4 align-top"><Text variant="body-sm" color="secondary">V{row.version}</Text></td>
                  <td className="p-4 align-top"><Button asChild size="sm"><Link href={row.editHref}>打开</Link></Button></td>
                </tr>
              ))}
              {!result.items.length ? (
                <tr><td colSpan={10} className="p-6"><Text variant="body-sm" color="secondary">没有符合条件的资料。</Text></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Section>
    </main>
  );
}
