import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export interface PriceProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  value: number;
  currency?: string;
  decimals?: number;
  size?: "sm" | "md" | "lg";
}

const sizeClasses: Record<NonNullable<PriceProps["size"]>, string> = {
  sm: "text-body-sm",
  md: "text-body",
  lg: "text-h3",
};

/** Monospaced, tabular-figure price display so digits stay aligned in tables and stat grids. */
export function Price({ value, currency = "USD", decimals = 2, size = "md", className, ...props }: PriceProps) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return (
    <span
      className={cn("font-mono tabular-figures text-foreground", sizeClasses[size], className)}
      {...props}
    >
      {formatted}
    </span>
  );
}
