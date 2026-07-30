import { cn, clamp } from "@/lib/utils";
import { HTMLAttributes } from "react";
import { Text } from "./Text";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** 0–100 */
  value: number;
  /** Optional label rendered above the bar, with the percentage right-aligned. */
  label?: string;
}

/** Simple, accessible progress bar — used for framework/evidence scores. */
export function Progress({ value, label, className, ...props }: ProgressProps) {
  const clamped = clamp(value, 0, 100);

  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <Text variant="body-sm" color="secondary">
            {label}
          </Text>
          <Text variant="caption" className="font-mono tabular-figures text-foreground-secondary">
            {clamped}%
          </Text>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
