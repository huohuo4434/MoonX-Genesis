import { cn } from "@/lib/utils";
import { SpinnerIcon } from "@/components/icons";
import { HTMLAttributes } from "react";

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number;
}

/** Accessible loading indicator. Use inside buttons, cards, or empty states. */
export function Spinner({ size = 16, className, ...props }: SpinnerProps) {
  return (
    <span role="status" aria-label="Loading" className={cn("inline-flex", className)} {...props}>
      <SpinnerIcon size={size} className="animate-spin text-current" />
      <span className="sr-only">Loading…</span>
    </span>
  );
}
