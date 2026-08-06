import { AdminNav } from "@/components/admin/AdminNav";
import { AiCommitteeClient } from "@/components/admin/AiCommitteeClient";
import { Card, Heading, Section, Text } from "@/components/ui";
import { listCommitteeRuns } from "@/lib/ai-committee/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AiCommitteePage() {
  const recentRuns = await listCommitteeRuns(12);
  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/ai-committee" />
        <Heading as="h1" size="h2">
          MOOX AI研究委员会
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 max-w-4xl">
          五个独立Builder角色先分别判断，再由独立Reviewer审核证据、分歧、失效条件和发布标准。
        </Text>
        <Card padding="md" className="mt-4 border border-amber-500/40 bg-amber-500/10">
          <Text variant="body-sm">
            委员会结果仅供内部研究，不会直接触发Bitget实盘、自动改写已发布预测或替代硬风控。
          </Text>
        </Card>
        <Card padding="md" className="mt-3 border border-sky-500/30 bg-sky-500/10">
          <Text variant="body-sm">
            点击运行后，表单中的研究材料会发送给当前配置的OpenAI模型；只检查提示词时不会调用模型。
          </Text>
        </Card>
        <AiCommitteeClient initialRuns={recentRuns} />
      </Section>
    </main>
  );
}
