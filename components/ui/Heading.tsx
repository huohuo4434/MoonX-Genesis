import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
type HeadingSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Semantic tag rendered to the DOM. Decoupled from `size` on purpose. */
  as?: HeadingLevel;
  /** Visual scale — pick this independently of the semantic level. */
  size?: HeadingSize;
  /** Apply the brand gradient text treatment. */
  gradient?: boolean;
}

const sizeClasses: Record<HeadingSize, string> = {
  xs: "text-heading-sm",
  sm: "text-heading-md",
  md: "text-heading-lg",
  lg: "text-display-sm",
  xl: "text-display-md",
  "2xl": "text-display-lg",
};

const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ as: Component = "h2", size = "md", gradient = false, className, children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          "text-foreground tracking-tight",
          sizeClasses[size],
          gradient && "gradient-text",
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Heading.displayName = "Heading";

export { Heading };
