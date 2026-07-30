import { cn } from "@/lib/utils";
import { HTMLAttributes, ReactNode } from "react";
import { Card, CardProps } from "./Card";
import { Text } from "./Text";

export interface StatCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title">, Pick<CardProps, "padding"> {
  label: string;
  value: ReactNode;
  /** Small supporting element rendered next to the value — typically a `ChangeIndicator`. */
  delta?: ReactNode;
  icon?: ReactNode;
  description?: string;
}

/** Compact metric surface for dashboards — label, a large value, and an optional trend/delta. */
export function StatCard({ label, value, delta, icon, description, padding = "lg", className, ...props }: StatCardProps) {
  return (
    <Card padding={padding} className={cn("flex flex-col gap-2", className)} {...props}>
      <div className="flex items-center justify-between">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          {label}
        </Text>
        {icon && <span className="text-foreground-tertiary">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-h2 tabular-figures text-foreground">{value}</span>
        {delta}
      </div>
      {description && (
        <Text variant="caption" color="tertiary">
          {description}
        </Text>
      )}
    </Card>
  );
}
