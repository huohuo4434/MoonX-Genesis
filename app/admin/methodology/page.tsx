import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminMethodologyClient } from "@/components/admin/AdminMethodologyClient";
import { Heading, Section, Text } from "@/components/ui";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { MOOX_DAILY_ANALYSIS_POLICY, MOOX_LOCK_POLICY, MOOX_PREDICTION_LAYERS, MOOX_TOP5_POLICY } from "@/lib/forecasts/prediction-governance";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "预测方法配置 | 管理后台" };

export default async function AdminMethodologyPage() {
  const access = await getAccessUser();
  if (!access.isAdmin) redirect("/admin/login");

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/methodology" />
        <Heading as="h1" size="h2">
          预测方法配置
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 max-w-2xl">
          管理公开「/methodology」页展示的分析模块、简介与权重说明。核心预测治理规则由源码锁定，不能在这里改成多模型随意投票。
        </Text>
        <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-5">
          <Heading as="h2" size="h3">核心规则（源码锁定）</Heading>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {MOOX_PREDICTION_LAYERS.map((layer) => (
              <div key={layer.id} className="rounded-lg border border-border/[0.08] p-3">
                <Text variant="body-sm" weight="semibold">{layer.order}. {layer.nameZh}</Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">{layer.authorityZh}</Text>
              </div>
            ))}
          </div>
          <Text variant="body-sm" color="secondary" className="mt-4 block">{MOOX_DAILY_ANALYSIS_POLICY.ruleZh}</Text>
          <Text variant="body-sm" color="secondary" className="mt-2 block">{MOOX_TOP5_POLICY.ruleZh}</Text>
          <Text variant="body-sm" color="secondary" className="mt-2 block">{MOOX_LOCK_POLICY.ruleZh}</Text>
        </div>
        <div className="mt-6">
          <AdminMethodologyClient />
        </div>
      </Section>
    </main>
  );
}
