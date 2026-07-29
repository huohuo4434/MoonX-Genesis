/* eslint-disable @typescript-eslint/no-explicit-any */
import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Button, Heading, Section, Text } from "@/components/ui";
import Link from "next/link";
import { listIChingResearchForAdmin } from "@/lib/iching-research/store";
import { ICHING_ASSET_OPTIONS, ICHING_RESEARCH_STATUS_OPTIONS } from "@/lib/iching-research/asset-options";

export const dynamic = "force-dynamic";

export default async function AdminIchingLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const assetId = typeof sp.assetId === "string" ? sp.assetId : undefined;
  const sourceType = typeof sp.sourceType === "string" ? sp.sourceType : undefined;
  const researchStatus = typeof sp.researchStatus === "string" ? sp.researchStatus : undefined;
  const verified = typeof sp.verified === "string" ? sp.verified : undefined;
  const questionQuery = typeof sp.q === "string" ? sp.q : undefined;

  const data = await listIChingResearchForAdmin({
    assetId,
    sourceType: sourceType === "MASTER" || sourceType === "INTERNAL" ? (sourceType as any) : undefined,
    researchStatus: researchStatus ?? undefined,
    verified: verified === "YES" || verified === "NO" ? (verified as any) : undefined,
    questionQuery,
  });

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/iching/library" />
        <Heading as="h1" size="h2">
          六爻研究库
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-6">
          仅管理员可见：保存老师/内部原始起卦记录、逐爻数据、老师原文与内部分析；公开前台/会员 API 不会暴露这些字段。
        </Text>

        <div className="mb-4 rounded-lg border border-border/[0.08] bg-muted/10 p-4">
          <form className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4" action="/admin/iching/library" method="get">
            <label className="flex flex-col gap-1">
              <Text variant="caption" color="tertiary">
                资产
              </Text>
              <select name="assetId" defaultValue={assetId ?? ""} className="mt-1 rounded-md border border-input bg-surface px-3 py-2 text-body-sm">
                <option value="">全部</option>
                {ICHING_ASSET_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <Text variant="caption" color="tertiary">
                来源
              </Text>
              <select name="sourceType" defaultValue={sourceType ?? ""} className="mt-1 rounded-md border border-input bg-surface px-3 py-2 text-body-sm">
                <option value="">全部</option>
                <option value="MASTER">MASTER</option>
                <option value="INTERNAL">INTERNAL</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <Text variant="caption" color="tertiary">
                状态
              </Text>
              <select name="researchStatus" defaultValue={researchStatus ?? ""} className="mt-1 rounded-md border border-input bg-surface px-3 py-2 text-body-sm">
                <option value="">全部</option>
                {ICHING_RESEARCH_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <Text variant="caption" color="tertiary">
                验证
              </Text>
              <select name="verified" defaultValue={verified ?? ""} className="mt-1 rounded-md border border-input bg-surface px-3 py-2 text-body-sm">
                <option value="">全部</option>
                <option value="YES">已验证</option>
                <option value="NO">未验证</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 md:flex-1">
              <Text variant="caption" color="tertiary">
                全文搜索（问题/老师原文/内部分析/卦名）
              </Text>
              <input name="q" defaultValue={questionQuery ?? ""} placeholder="输入关键词..." className="mt-1 w-full rounded-md border border-input bg-surface px-3 py-2 text-body-sm" />
            </label>

            <Button type="submit">筛选</Button>
          </form>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/[0.08]">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border/[0.08] bg-surface/60">
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    资产
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    问题
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    预测周期
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    起卦时间
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    来源 / 采用
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    卦象
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    状态
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    验证状态
                  </Text>
                </th>
                <th className="p-lg">
                  <Text variant="label" color="tertiary">
                    版本
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
              {data.map((r) => {
                const verified = (r.validations?.[0]?.result ?? null) ? "已验证" : "未验证";
                return (
                  <tr key={r.id} className="border-b border-border/[0.06] last:border-0 hover:bg-surface/40">
                    <td className="p-lg align-top">
                      <Text variant="body-sm" weight="semibold">
                        {r.assetId}
                      </Text>
                    </td>
                    <td className="p-lg align-top max-w-xs">
                      <Text variant="body-sm" color="secondary" className="whitespace-pre-wrap">
                        {(r.question ?? "").slice(0, 110)}
                        {(r.question ?? "").length > 110 ? "…" : ""}
                      </Text>
                    </td>
                    <td className="p-lg align-top">
                      <Text variant="caption" color="tertiary" className="block">
                        {r.forecastType}
                      </Text>
                      <Text variant="body-sm" color="secondary">
                        {r.forecastStartAt} → {r.forecastEndAt}
                      </Text>
                    </td>
                    <td className="p-lg align-top">
                      <Text variant="caption" color="tertiary">
                        {r.castAt instanceof Date ? r.castAt.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) : String(r.castAt)}
                      </Text>
                    </td>
                    <td className="p-lg align-top">
                      <div className="flex flex-col gap-1">
                        <Badge variant={r.sourceType === "MASTER" ? "default" : "neutral"}>{r.sourceType}</Badge>
                        <Badge variant="outline">{r.adoptedSource}</Badge>
                      </div>
                    </td>
                    <td className="p-lg align-top">
                      <Text variant="body-sm" weight="semibold">
                        {r.hexagramName}
                      </Text>
                      {r.changedHexagramName ? (
                        <Text variant="caption" color="tertiary">
                          变卦：{r.changedHexagramName}
                        </Text>
                      ) : null}
                    </td>
                    <td className="p-lg align-top">
                      <Badge variant={r.researchStatus === "WAITING_MASTER" ? "outline" : "neutral"}>{r.researchStatus}</Badge>
                    </td>
                    <td className="p-lg align-top">
                      <Text variant="body-sm" color="secondary">
                        {verified}
                      </Text>
                    </td>
                    <td className="p-lg align-top">
                      <Text variant="body-sm" color="secondary">
                        V{r.version ?? 1}
                      </Text>
                    </td>
                    <td className="p-lg align-top">
                      <div className="flex flex-col gap-2">
                        <Link href={`/admin/iching/library/${encodeURIComponent(r.id)}`}>
                          <Button size="sm">编辑</Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!data.length ? (
                <tr>
                  <td colSpan={10} className="p-lg">
                    <Text variant="body-sm" color="secondary">
                      暂无六爻研究记录。
                    </Text>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <Link href="/admin/iching/library/new">
            <Button>新建六爻研究记录</Button>
          </Link>
        </div>
      </Section>
    </main>
  );
}

