"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Text } from "@/components/ui";
import type { StockAnalysisRecord } from "@/types/stocks";

export function AdminStocksClient({ stocks }: { stocks: StockAnalysisRecord[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function publish(id: string) {
    setLoading(true);
    const res = await fetch("/api/admin/stocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", id }),
    });
    setLoading(false);
    setMessage(res.ok ? "已正式发布" : "发布失败");
    router.refresh();
  }

  async function saveDraft() {
    setLoading(true);
    const id = `STK-${Date.now()}`;
    const res = await fetch("/api/admin/stocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert",
        record: {
          id,
          name: "示例个股（请编辑）",
          symbol: "TICKER",
          market: "CN",
          direction: "neutral",
          directionLabel: "震荡",
          validUntil: new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Shanghai",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date()),
          coreScenario: "内部草稿，未发布前不会出现在公开页。",
          keyLevels: ["支撑待定", "压力待定"],
          invalidation: "结构破坏失效",
          lastUpdatedAt: new Date().toISOString(),
          status: "draft",
          createdAt: new Date().toISOString(),
        },
      }),
    });
    setLoading(false);
    setMessage(res.ok ? "已创建草稿" : "创建失败");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Button size="sm" disabled={loading} onClick={saveDraft}>
        新建草稿
      </Button>
      {message && (
        <Text variant="caption" color="tertiary">
          {message}
        </Text>
      )}
      {stocks.map((s) => (
        <Card key={s.id} padding="md" className="space-y-2">
          <Text variant="body" weight="semibold">
            {s.name} · {s.symbol}
          </Text>
          <Text variant="caption" color="tertiary">
            状态：{s.status}
          </Text>
          <Text variant="body-sm" color="secondary">
            {s.coreScenario}
          </Text>
          {s.status !== "published" && (
            <Button size="sm" disabled={loading} onClick={() => publish(s.id)}>
              正式发布
            </Button>
          )}
        </Card>
      ))}
      {!stocks.length && (
        <Text variant="body-sm" color="secondary">
          暂无个股记录。创建草稿后需点击「正式发布」才会出现在 /stocks。
        </Text>
      )}
    </div>
  );
}
