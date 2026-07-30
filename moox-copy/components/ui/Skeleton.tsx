import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/** Placeholder block for content that is still loading. Respects reduced-motion via the global media query. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
