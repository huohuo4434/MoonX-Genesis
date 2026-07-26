import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-caption font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary border-primary/20",
        success: "bg-success/10 text-success border-success/20",
        warning: "bg-warning/10 text-warning border-warning/20",
        danger: "bg-danger/10 text-danger border-danger/20",
        info: "bg-info/10 text-info border-info/20",
        neutral: "bg-muted text-foreground-secondary border-transparent",
        outline: "bg-transparent text-foreground-secondary border-border/15",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant, children, ...props }, ref) => {
  return (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
});

Badge.displayName = "Badge";

export { Badge };
