import { Fragment } from "react";
import { ArrowRightIcon, ChevronDownIcon } from "@/components/icons";
import { Card, Text } from "@/components/ui";
import type { ResearchPipelineStage } from "@/lib/data/research-intelligence";

export interface PipelineFlowProps {
  stages: ResearchPipelineStage[];
}

/** Horizontal (desktop) / vertical (mobile) flow diagram for the research pipeline. */
export function PipelineFlow({ stages }: PipelineFlowProps) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-3">
      {stages.map((stage, index) => (
        <Fragment key={stage.id}>
          <Card padding="lg" className="flex flex-1 flex-col gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 font-mono text-caption text-primary">
              {String(stage.order).padStart(2, "0")}
            </span>
            <Text variant="body" weight="semibold" className="text-foreground">
              {stage.title}
            </Text>
            <Text variant="body-sm" color="secondary">
              {stage.description}
            </Text>
          </Card>

          {index < stages.length - 1 && (
            <div className="flex items-center justify-center py-1 lg:py-0">
              <ChevronDownIcon size={18} className="shrink-0 text-foreground-tertiary lg:hidden" aria-hidden="true" />
              <ArrowRightIcon
                size={18}
                className="hidden shrink-0 text-foreground-tertiary lg:block"
                aria-hidden="true"
              />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}
