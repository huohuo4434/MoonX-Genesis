import Link from "next/link";
import { Badge, Card, Heading, Text } from "@/components/ui";
import type {
  PromotionReadinessSeverity,
  PromotionReadinessSummary,
} from "@/lib/admin/promotion-readiness";

function panelTone(status: PromotionReadinessSummary["status"]): string {
  if (status === "READY") return "border-emerald-400/30 bg-emerald-400/[0.06]";
  if (status === "PILOT") return "border-amber-300/30 bg-amber-300/[0.06]";
  return "border-rose-400/35 bg-rose-400/[0.07]";
}

function severityLabel(severity: PromotionReadinessSeverity): string {
  if (severity === "BLOCKER") return "阻断";
  if (severity === "ACTION") return "待办";
  return "提示";
}

function severityVariant(severity: PromotionReadinessSeverity): "danger" | "warning" | "outline" {
  if (severity === "BLOCKER") return "danger";
  if (severity === "ACTION") return "warning";
  return "outline";
}

export function PromotionReadinessPanel({ summary }: { summary: PromotionReadinessSummary }) {
  return (
    <Card padding="lg" className={`mt-5 border ${panelTone(summary.status)}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text variant="caption" color="tertiary" className="font-mono tracking-[0.14em]">
            PROMOTION READINESS
          </Text>
          <Heading as="h2" size="h3" className="mt-1">{summary.label}</Heading>
          <Text variant="body-sm" color="secondary" className="mt-2 block">{summary.note}</Text>
        </div>
        <div className="flex gap-2">
          <Badge variant={summary.blockerCount ? "danger" : "success"}>阻断 {summary.blockerCount}</Badge>
          <Badge variant={summary.actionCount ? "warning" : "outline"}>待办 {summary.actionCount}</Badge>
        </div>
      </div>

      {summary.actions.length ? (
        <div className="mt-5 grid gap-2 lg:grid-cols-2">
          {summary.actions.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="group flex items-start justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/15 p-3 transition hover:border-primary/35 hover:bg-black/25"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={severityVariant(item.severity)}>{severityLabel(item.severity)}</Badge>
                  <Text variant="body-sm" weight="semibold">{item.label}</Text>
                </div>
                <Text variant="caption" color="secondary" className="mt-2 block leading-5">{item.detail}</Text>
              </div>
              <span className="mt-1 text-primary transition group-hover:translate-x-0.5">→</span>
            </Link>
          ))}
        </div>
      ) : (
        <Text variant="body-sm" className="mt-4 block text-emerald-100">
          核心内容与会员站内服务均未发现待处理项。
        </Text>
      )}
    </Card>
  );
}
