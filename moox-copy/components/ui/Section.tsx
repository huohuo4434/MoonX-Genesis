import { cn } from "@/lib/utils";
import { HTMLAttributes, ElementType } from "react";
import { Container, ContainerProps } from "./Container";

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  /** Render as a different element (defaults to a semantic `<section>`). */
  as?: ElementType;
  /** Vertical rhythm applied to the section. */
  spacing?: "none" | "sm" | "md" | "lg";
  /** Wrap children in a `Container`. Set to `false` for full-bleed sections. */
  container?: boolean;
  /** Forwarded to the inner `Container` when `container` is true. */
  containerSize?: ContainerProps["size"];
}

const spacingClasses: Record<NonNullable<SectionProps["spacing"]>, string> = {
  none: "",
  sm: "py-10 lg:py-14",
  md: "py-16 lg:py-20",
  lg: "py-20 lg:py-28",
};

export function Section({
  children,
  className,
  as: Component = "section",
  spacing = "lg",
  container = true,
  containerSize = "lg",
  ...props
}: SectionProps) {
  return (
    <Component className={cn(spacingClasses[spacing], className)} {...props}>
      {container ? <Container size={containerSize}>{children}</Container> : children}
    </Component>
  );
}
