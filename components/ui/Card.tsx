import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Lift the card and add a glow border on hover. */
  hover?: boolean;
  /** Apply the frosted-glass background treatment. */
  glass?: boolean;
  /** Internal padding scale. */
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, glass = true, padding = "md", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border border-border/[0.08] text-card-foreground",
          glass ? "glass-card" : "bg-card",
          paddingClasses[padding],
          hover &&
            "transition-all duration-300 hover:border-border/[0.12] hover:shadow-glow-sm hover:-translate-y-0.5",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export { Card };
