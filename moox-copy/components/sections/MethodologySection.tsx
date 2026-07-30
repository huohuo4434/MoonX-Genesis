import { CheckIcon, FileTextIcon, GitBranchIcon, LayersIcon } from "@/components/icons";
import { Card, Heading, Section, Text } from "@/components/ui";
import { ReactNode } from "react";

interface Pillar {
  icon: ReactNode;
  title: string;
  description: string;
}

const pillars: Pillar[] = [
  {
    icon: <LayersIcon size={20} />,
    title: "Multi-framework analysis",
    description:
      "Every forecast is evaluated through several independent forecasting frameworks rather than a single model, then reconciled into one view.",
  },
  {
    icon: <FileTextIcon size={20} />,
    title: "Structured evidence",
    description:
      "Supporting evidence is organized and weighted by source reliability, recency, and independence — not just tallied by volume.",
  },
  {
    icon: <GitBranchIcon size={20} />,
    title: "Versioned forecasts",
    description:
      "Forecasts update as new evidence arrives, but every prior version stays intact — nothing is silently overwritten.",
  },
  {
    icon: <CheckIcon size={20} />,
    title: "Historical verification",
    description:
      "Each forecast carries a fixed verification date. Outcomes are recorded against the original claim, building an auditable track record.",
  },
];

export function MethodologySection() {
  return (
    <Section id="methodology" spacing="lg" className="border-t border-border/[0.06]">
      <div className="mb-12 flex flex-col gap-3">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          Prediction Methodology
        </Text>
        <Heading as="h2" size="h2" className="max-w-2xl">
          Four pillars behind every forecast
        </Heading>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map((pillar) => (
          <Card key={pillar.title} padding="lg" className="flex flex-col gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              {pillar.icon}
            </div>
            <Text variant="body" weight="semibold" className="text-foreground">
              {pillar.title}
            </Text>
            <Text variant="body-sm" color="secondary">
              {pillar.description}
            </Text>
          </Card>
        ))}
      </div>
    </Section>
  );
}
