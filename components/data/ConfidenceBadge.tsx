import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ConfidenceBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** 0–100 confidence score. Mapped to a level automatically unless `level` is provided. */
  score?: number;
  level?: ConfidenceLevel;
}

function levelFromScore(score: number): ConfidenceLevel {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

const levelConfig: Record<ConfidenceLevel, { text: string; classes: string }> = {
  high: { text: "High Confidence", classes: "bg-success/10 text-success border-success/20" },
  medium: { text: "Medium Confidence", classes: "bg-warning/10 text-warning border-warning/20" },
  low: { text: "Low Confidence", classes: "bg-danger/10 text-danger border-danger/20" },
};

/** Communicates model/forecast confidence without exposing a raw score to non-technical users. */
export function ConfidenceBadge({ score, level, className, ...props }: ConfidenceBadgeProps) {
  const resolvedLevel = level ?? (score !== undefined ? levelFromScore(score) : "medium");
  const { text, classes } = levelConfig[resolvedLevel];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption font-medium",
        classes,
        className
      )}
      {...props}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {text}
    </span>
  );
}
