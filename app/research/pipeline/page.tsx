import type { Metadata } from "next";
import { PipelineFlow } from "@/components/research";
import { Badge, Heading, Section, Text } from "@/components/ui";
import { listResearchPipelineStages } from "@/lib/data/research-intelligence";

export const metadata: Metadata = {
  title: "Research Pipeline",
  description: "How MoonX turns external signals into a structured, internally reconciled forecast.",
};

export default async function ResearchPipelinePage() {
  const stages = await listResearchPipelineStages();

  return (
    <main>
      <Section spacing="lg">
        <div className="flex flex-col gap-4">
          <Badge variant="neutral" className="self-start">
            Research Pipeline
          </Badge>
          <Heading as="h1" size="display" className="max-w-3xl text-h1 lg:text-display">
            From external signal to MoonX forecast
          </Heading>
          <Text variant="body" color="secondary" className="max-w-2xl">
            Every MoonX forecast passes through the same five-stage pipeline before publication —
            no forecast skips a stage or bypasses framework weighting.
          </Text>
        </div>
      </Section>

      <Section spacing="lg" className="border-t border-border/[0.06]">
        <PipelineFlow stages={stages} />
      </Section>
    </main>
  );
}
