import { cn } from "@/lib/utils";
import { AlertTriangleIcon, ShieldIcon } from "@/components/icons";
import { HTMLAttributes } from "react";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  level: RiskLevel;
  label?: string;
}

const riskConfig: Record<RiskLevel, { text: string; classes: string; icon: typeof ShieldIcon }> = {
  low: { text: "Low Risk", classes: "bg-success/10 text-success border-success/20", icon: ShieldIcon },
  medium: { text: "Medium Risk", classes: "bg-warning/10 text-warning border-warning/20", icon: ShieldIcon },
  high: { text: "High Risk", classes: "bg-danger/10 text-danger border-danger/20", icon: AlertTriangleIcon },
  critical: {
    text: "Critical Risk",
    classes: "bg-danger/20 text-danger border-danger/30",
    icon: AlertTriangleIcon,
  },
};

/** Risk-level indicator for forecasts, positions, or assets. */
export function RiskBadge({ level, label, className, ...props }: RiskBadgeProps) {
  const { text, classes, icon: Icon } = riskConfig[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-caption font-medium",
        classes,
        className
      )}
      {...props}
    >
      <Icon size={11} />
      {label ?? text}
    </span>
  );
}
