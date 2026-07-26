import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
export type HeadingSize = "display" | "h1" | "h2" | "h3";

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Semantic tag rendered to the DOM. Decoupled from `size` on purpose —
   *  e.g. a page can have exactly one visual "display" heading rendered
   *  as an `<h1>` for SEO/accessibility while looking bigger than any
   *  other heading on the page. */
  as?: HeadingLevel;
  /** Visual scale from the typography system. */
  size?: HeadingSize;
  /** Apply the brand gradient text treatment. Use sparingly. */
  gradient?: boolean;
}

const sizeClasses: Record<HeadingSize, string> = {
  display: "text-display",
  h1: "text-h1",
  h2: "text-h2",
  h3: "text-h3",
};

const defaultElementForSize: Record<HeadingSize, HeadingLevel> = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
};

const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ as, size = "h2", gradient = false, className, children, ...props }, ref) => {
    const Component = as ?? defaultElementForSize[size];
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
