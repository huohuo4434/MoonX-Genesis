import { cn } from "@/lib/utils";
import { Card, CardProps } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { HTMLAttributes, ReactNode } from "react";

export interface ChartContainerProps extends Pick<CardProps, "padding" | "className"> {
  title?: string;
  subtitle?: string;
  /** Rendered top-right — typically a `Tabs`/`Select` for range switching. */
  action?: ReactNode;
  /** Rendered below the chart body — series names/colors. */
  legend?: ReactNode;
  height?: number | string;
  /** The chart itself. Until a charting library is wired up, pass a `ChartPlaceholder`. */
  children: ReactNode;
  bodyProps?: HTMLAttributes<HTMLDivElement>;
}

/**
 * Chrome wrapper that gives every chart on the platform identical framing:
 * title/subtitle, an action slot, a fixed-height body, and a legend slot.
 * Intentionally has zero dependency on a charting library — it only lays
 * out whatever is passed as `children`.
 */
export function ChartContainer({
  title,
  subtitle,
  action,
  legend,
  height = 280,
  children,
  padding = "lg",
  className,
  bodyProps,
}: ChartContainerProps) {
  return (
    <Card padding={padding} className={cn("flex flex-col gap-4", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            {title && (
              <Text as="h3" variant="body" weight="semibold" className="text-foreground">
                {title}
              </Text>
            )}
            {subtitle && (
              <Text variant="caption" color="tertiary">
                {subtitle}
              </Text>
            )}
          </div>
          {action}
        </div>
      )}

      <div style={{ height }} className="w-full" {...bodyProps}>
        {children}
      </div>

      {legend && <div className="flex flex-wrap items-center gap-4">{legend}</div>}
    </Card>
  );
}
