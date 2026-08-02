import { Badge, Card, Text } from "@/components/ui";
import type { AdminKnowledgeSource } from "@/lib/admin/iching-knowledge-safe";

export function KnowledgeSourceNotice({
  source,
  warning,
}: {
  source: AdminKnowledgeSource;
  warning: string | null;
}) {
  return (
    <Card padding="md" className="mb-5 border border-border/[0.08]">
      <div className="flex flex-wrap items-center gap-2">
        <Text variant="body-sm" weight="semibold">
          当前数据源
        </Text>
        <Badge variant={source === "PRIMARY_DATABASE" ? "default" : "outline"}>
          {source === "PRIMARY_DATABASE" ? "六爻主数据表" : "老师知识库兼容模式"}
        </Badge>
      </div>
      {warning ? (
        <Text variant="body-sm" color="secondary" className="mt-2 block">
          {warning}
        </Text>
      ) : (
        <Text variant="caption" color="tertiary" className="mt-2 block">
          页面已使用主数据表，查询正常。
        </Text>
      )}
    </Card>
  );
}
