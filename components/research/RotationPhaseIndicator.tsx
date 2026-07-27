"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n/LocaleProvider";
import type { MoonXRotationPhase } from "@/lib/moonx/types";
import { Text } from "@/components/ui";

const PHASES: MoonXRotationPhase[] = [
  "dormant",
  "early-leaders",
  "broadening",
  "acceleration",
  "distribution",
];

const PHASE_KEY: Record<MoonXRotationPhase, string> = {
  dormant: "altcoinRotation.phaseDormant",
  "early-leaders": "altcoinRotation.phaseEarlyLeaders",
  broadening: "altcoinRotation.phaseBroadening",
  acceleration: "altcoinRotation.phaseAcceleration",
  distribution: "altcoinRotation.phaseDistribution",
};

export function RotationPhaseIndicator({ currentPhase }: { currentPhase: MoonXRotationPhase }) {
  const t = useTranslations();
  const currentIndex = PHASES.indexOf(currentPhase);

  return (
    <div className="flex flex-col gap-2">
      <Text variant="label" color="tertiary" className="uppercase tracking-wide">
        {t("altcoinRotation.rotationPhase")}
      </Text>
      <div className="flex flex-wrap gap-1.5">
        {PHASES.map((phase, index) => {
          const isCurrent = phase === currentPhase;
          const isPast = index < currentIndex;
          return (
            <span
              key={phase}
              className={cn(
                "rounded-sm border px-2 py-1 text-caption font-medium transition-colors",
                isCurrent && "border-primary/40 bg-primary/10 text-primary",
                isPast && !isCurrent && "border-border/20 bg-muted/40 text-foreground-secondary",
                !isCurrent && !isPast && "border-border/[0.08] text-foreground-tertiary"
              )}
            >
              {t(PHASE_KEY[phase])}
            </span>
          );
        })}
      </div>
    </div>
  );
}
