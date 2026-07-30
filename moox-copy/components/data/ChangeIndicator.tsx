import { cn } from "@/lib/utils";
import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "@/components/icons";
import { HTMLAttributes } from "react";

export interface ChangeIndicatorProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Percentage points, e.g. `4.28` or `-1.5`. */
  value: number;
  decimals?: number;
  size?: "sm" | "md";
  showIcon?: boolean;
}

/** Icon + signed percentage, colored by direction. Use for price/forecast movement at a glance. */
export function ChangeIndicator({
  value,
  decimals = 2,
  size = "sm",
  showIcon = true,
  className,
  ...props
}: ChangeIndicatorProps) {
  const isFlat = value === 0;
  const isUp = value > 0;
  const Icon = isFlat ? MinusIcon : isUp ? TrendingUpIcon : TrendingDownIcon;
  const colorClass = isFlat ? "text-foreground-secondary" : isUp ? "text-success" : "text-danger";
  const iconSize = size === "sm" ? 12 : 14;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono tabular-figures",
        size === "sm" ? "text-caption" : "text-body-sm",
        colorClass,
        className
      )}
      {...props}
    >
      {showIcon && <Icon size={iconSize} />}
      {isUp && "+"}
      {value.toFixed(decimals)}%
    </span>
  );
}
