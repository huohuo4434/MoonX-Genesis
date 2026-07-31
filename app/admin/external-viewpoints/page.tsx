import { AdminNav } from "@/components/admin/AdminNav";
import { Card, Heading, Text, Badge } from "@/components/ui";
import { externalViewpoints20260801 } from "@/lib/data/external-viewpoints-20260801";
import { policyForTags } from "@/lib/research/external-source-policy";

export const dynamic = "force-dynamic";

export default function AdminExternalViewpointsPage() {
  return (
    <main className="mx-auto w-full max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <AdminNav current="/admin/external-viewpoints" />
      <Heading as="h1" size="h2" className="mb-2">
        外部观点与波浪资料库
      </Heading>
      <Text variant="body-sm" color="secondary" className="mb-6 max-w-4xl">
        已整理用户上传的25张波浪图和61张博主观点截图。外部来源先作为低权重研究证据；没有事前时间、失效条件或可验证路径的内容只归档，不进入正式预测。
      </Text>

      <div className="grid gap-4 xl:grid-cols-2">
        {externalViewpoints20260801.map((record) => {
          const policy = policyForTags(record.tags);
          return (
            <Card key={record.id} padding="lg" className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Text variant="body" weight="semibold">
                    {record.assetName.zhCN} · {record.symbol ?? record.assetId}
                  </Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {record.title.zhCN}
                  </Text>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">基础权重 {policy.baseWeight}%</Badge>
                  <Badge variant="outline">上限 {policy.maxWeight}%</Badge>
                </div>
              </div>
              <Text variant="body-sm" className="block leading-relaxed text-white/75">
                {record.summary.zhCN}
              </Text>
              <div className="rounded-lg border border-white/10 bg-black/15 p-3">
                <Text variant="caption" className="block text-amber-200">
                  采用规则：{policy.rule}
                </Text>
                <Text variant="caption" className="mt-2 block text-white/45">
                  有效期：{record.publishedAt} 至 {record.expiresAt?.slice(0, 10) ?? "长期归档"}
                  {" · "}
                  自动进入共识：{policy.automaticConsensus ? "是" : "否，需管理员或正式样本确认"}
                </Text>
              </div>
              <Text variant="caption" className="block text-white/35">
                内部来源：{record.internalSourceRef ?? "用户上传材料"}
              </Text>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
