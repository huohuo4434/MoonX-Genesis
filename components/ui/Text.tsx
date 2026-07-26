import { cn } from "@/lib/utils";
import { ElementType, HTMLAttributes, forwardRef } from "react";

export type TextVariant = "body" | "body-sm" | "caption" | "label" | "mono";
export type TextColor = "primary" | "secondary" | "tertiary" | "disabled" | "inherit";

export interface TextProps extends HTMLAttributes<HTMLElement> {
  /** Typography variant — see docs/DESIGN_SYSTEM.md for when to use each. */
  variant?: TextVariant;
  /** Semantic element to render. Defaults follow the variant (e.g. `label` → `<span>`). */
  as?: ElementType;
  /** Text color token. Defaults to the primary foreground color. */
  color?: TextColor;
  /** Apply `font-weight: 600`. Ignored for `label`, which is already semibold. */
  weight?: "normal" | "medium" | "semibold";
}

const variantClasses: Record<TextVariant, string> = {
  body: "text-body",
  "body-sm": "text-body-sm",
  caption: "text-caption uppercase tracking-wide",
  label: "text-label",
  mono: "font-mono text-body-sm tabular-figures",
};

const defaultElement: Record<TextVariant, ElementType> = {
  body: "p",
  "body-sm": "p",
  caption: "span",
  label: "span",
  mono: "span",
};

const colorClasses: Record<TextColor, string> = {
  primary: "text-foreground",
  secondary: "text-foreground-secondary",
  tertiary: "text-foreground-tertiary",
  disabled: "text-foreground-disabled",
  inherit: "text-inherit",
};

const weightClasses: Record<NonNullable<TextProps["weight"]>, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
};

const Text = forwardRef<HTMLElement, TextProps>(
  ({ as, variant = "body", color = "primary", weight, className, children, ...props }, ref) => {
    const Component = as ?? defaultElement[variant];
    return (
      <Component
        ref={ref}
        className={cn(
          variantClasses[variant],
          colorClasses[color],
          weight && weightClasses[weight],
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Text.displayName = "Text";

export { Text };
