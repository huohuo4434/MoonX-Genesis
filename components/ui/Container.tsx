import { cn } from "@/lib/utils";
import { HTMLAttributes, ElementType } from "react";

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** Render as a different element while keeping container styling. */
  as?: ElementType;
  /** Cap the container at a narrower width than the default max-width. */
  size?: "sm" | "md" | "lg" | "full";
}

const sizeClasses: Record<NonNullable<ContainerProps["size"]>, string> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-container",
  full: "max-w-none",
};

export function Container({
  children,
  className,
  as: Component = "div",
  size = "lg",
  ...props
}: ContainerProps) {
  return (
    <Component
      className={cn("mx-auto w-full px-6 lg:px-8", sizeClasses[size], className)}
      {...props}
    >
      {children}
    </Component>
  );
}
