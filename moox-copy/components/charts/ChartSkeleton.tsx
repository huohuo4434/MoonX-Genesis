import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export type ChartSkeletonProps = HTMLAttributes<HTMLDivElement>;

/** Loading state for a `ChartContainer` body while data is being fetched. */
export function ChartSkeleton({ className, ...props }: ChartSkeletonProps) {
  return (
    <div className={cn("flex h-full w-full items-end gap-2", className)} {...props}>
      {[40, 65, 45, 80, 55, 70, 50, 90, 60, 75].map((height, index) => (
        <Skeleton key={index} className="flex-1 rounded-t-sm" style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}
