import { cn } from "@/lib/utils";
import { HTMLAttributes, ReactNode } from "react";
import { Text } from "./Text";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  /** Typically a 20–24px icon from `components/icons`. */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** A `Button` or other call-to-action rendered below the description. */
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/[0.12] px-lg py-3xl text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground-tertiary">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <Text variant="body" weight="medium" className="text-foreground">
          {title}
        </Text>
        {description && (
          <Text variant="body-sm" color="secondary" className="max-w-sm">
            {description}
          </Text>
        )}
      </div>
      {action}
    </div>
  );
}
