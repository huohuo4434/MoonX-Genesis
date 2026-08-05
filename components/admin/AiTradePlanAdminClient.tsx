"use client";

import { useEffect, useState } from "react";
import { Button, Card, Text } from "@/components/ui";
import { AiTradeIntentBoard } from "@/components/trading/AiTradeIntentBoard";
import type { AiTradePlanDashboard } from "@/types/ai-trade-plan";

const EMPTY: AiTradePlanDashboard = {
  databaseReady: false,
  generatedAt: new Date(0).toISOString(),
  summary: { publishedToday: 0, watching: 0, armed: 0, submittedOrOpen: 0, closedToday: 0 },
  decisions: [],
  quotes: [],
  plans: [],
  notice: "正在读取AI交易计划。",
};

async function readDashboard(): Promise<AiTradePlanDashboard> {
  const response = await fetch("/api/admin/bitget-demo/plans", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const text = await response.text();
  const json = JSON.parse(text) as AiTradePlanDashboard & { error?: string };
  if (!response.ok || json.error) throw new Error(json.error || "读取失败");
  return {
    ...json,
    decisions: json.decisions ?? [],
    quotes: json.quotes ?? [],
    plans: json.plans ?? [],
  };
}

export function AiTradePlanAdminClient({
  initial,
  lazy = false,
}: {
  initial?: AiTradePlanDashboard;
  lazy?: boolean;
}) {
  const [dashboard, setDashboard] = useState(initial ?? EMPTY);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(!initial);

  async function refresh() {
    setLoading(true);
    setMessage("");
    try {
      setDashboard(await readDashboard());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "刷新失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initial && !lazy) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <AiTradeIntentBoard dashboard={dashboard} locale="zh" showHistory />
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <Text variant="caption" color="tertiary">
          {loading ? "正在读取最新计划…" : dashboard.notice}
        </Text>
        <Button size="sm" variant="secondary" onClick={() => void refresh()} disabled={loading}>
          {loading ? "刷新中…" : "刷新交易意图"}
        </Button>
      </div>
      {message ? (
        <Card padding="md" className="border-red-400/20 bg-red-400/[0.035]">
          <Text variant="body-sm" className="text-red-300">{message}</Text>
        </Card>
      ) : null}
    </div>
  );
}
