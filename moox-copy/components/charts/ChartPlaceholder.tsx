import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/Text";
import { HTMLAttributes } from "react";

export interface ChartPlaceholderProps extends HTMLAttributes<HTMLDivElement> {
  /** e.g. "Line chart", "Candlestick chart" — shown as the placeholder caption. */
  label?: string;
}

/**
 * Drop-in body for `ChartContainer` until a real charting library is
 * wired up. Renders a subtle dotted grid so dashboards read as
 * data-dense even with pending series.
 */
export function ChartPlaceholder({ label = "Chart", className, ...props }: ChartPlaceholderProps) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-border/[0.1] bg-surface",
        className
      )}
      style={{
        backgroundImage: "radial-gradient(hsl(var(--border) / 0.12) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
      {...props}
    >
      <Text variant="caption" color="tertiary">
        {label} placeholder
      </Text>
    </div>
  );
}
