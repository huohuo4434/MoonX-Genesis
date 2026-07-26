import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  /** Render a text/element label centered on the line (horizontal only). */
  label?: React.ReactNode;
}

export function Divider({ orientation = "horizontal", label, className, ...props }: DividerProps) {
  if (orientation === "vertical") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn("w-px self-stretch bg-border/[0.08]", className)}
        {...props}
      />
    );
  }

  if (label) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={cn("flex items-center gap-3", className)}
        {...props}
      >
        <span className="h-px flex-1 bg-border/[0.08]" />
        <span className="text-caption text-foreground-tertiary">{label}</span>
        <span className="h-px flex-1 bg-border/[0.08]" />
      </div>
    );
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn("h-px w-full bg-border/[0.08]", className)}
      {...props}
    />
  );
}
