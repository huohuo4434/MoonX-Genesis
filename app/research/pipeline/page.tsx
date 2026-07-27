import type { Metadata } from "next";
import { PipelineFlow } from "@/components/research";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { listResearchPipelineStages, listSixYaoFinancialRules } from "@/lib/data/research-intelligence";

export const metadata: Metadata = {
  title: "研究流水线",
  description: "MoonX 如何将外部信号转化为结构化、可验证的分层预测，以及六爻金融研究规则。",
};

export default async function ResearchPipelinePage() {
  const [stages, sixYaoRules] = await Promise.all([
    listResearchPipelineStages(),
    listSixYaoFinancialRules(),
  ]);

  return (
    <main>
      <Section spacing="lg">
        <div className="flex flex-col gap-4">
          <Badge variant="neutral" className="self-start">
            研究流水线
          </Badge>
          <Heading as="h1" size="display" className="max-w-3xl text-h1 lg:text-display">
            从外部信号到 MoonX 预测
          </Heading>
          <Text variant="body" color="secondary" className="max-w-2xl">
            每一条 MoonX 预测在发布前都经过同一套五阶段流水线 — 不允许跳过阶段，也不允许绕过人工审核。
          </Text>
        </div>
      </Section>

      <Section spacing="lg" className="border-t border-border/[0.06]">
        <PipelineFlow stages={stages} />
      </Section>

      <Section spacing="lg" className="border-t border-border/[0.06]">
        <details className="group rounded-lg border border-border/[0.08] bg-card p-5">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-col gap-2">
              <Badge variant="neutral" className="self-start">
                方法论
              </Badge>
              <Heading as="h2" size="h2">
                六爻金融研究规则
              </Heading>
              <Text variant="body-sm" color="secondary" className="max-w-2xl">
                展开查看用神选择、信号权重与解释边界。点击折叠/展开。
              </Text>
            </div>
          </summary>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {sixYaoRules.map((rule) => (
              <Card key={rule.id} padding="md" className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/30 font-mono text-caption text-primary">
                  {String(rule.order).padStart(2, "0")}
                </span>
                <Text variant="body-sm" color="secondary">
                  {rule.text}
                </Text>
              </Card>
            ))}
          </div>
        </details>
      </Section>
    </main>
  );
}
