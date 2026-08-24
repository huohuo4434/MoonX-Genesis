"use client";

import { useEffect, useState } from "react";
import { AiTradingDeskClient } from "@/components/member/AiTradingDeskClient";
import { Card, Text } from "@/components/ui";
import type { AiTradingDeskSnapshot } from "@/types/ai-trading-desk";

async function readSnapshot(signal: AbortSignal): Promise<AiTradingDeskSnapshot> {
  const response = await fetch("/api/member/ai-trading-desk", {
    cache: "no-store",
    signal,
    headers: { Accept: "application/json" },
  });
  const payload = (await response.json()) as AiTradingDeskSnapshot & { error?: string };
  if (!response.ok || payload.error) throw new Error(payload.error || "读取交易执行台失败");
  return payload;
}

export function MemberAiTradingDashboardLazy() {
  const [snapshot, setSnapshot] = useState<AiTradingDeskSnapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    readSnapshot(controller.signal)
      .then(setSnapshot)
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "读取失败");
      });
    return () => controller.abort();
  }, []);

  if (snapshot) return <AiTradingDeskClient initial={snapshot} />;
  return (
    <Card padding="lg" className="border-cyan-300/15 bg-cyan-300/[0.025]">
      <div className="h-1.5 w-28 animate-pulse rounded-full bg-cyan-300/40" />
      <Text variant="body-sm" color={error ? "secondary" : "tertiary"} className="mt-4 block">
        {error || "页面已打开，正在异步读取交易所、三周期策略和风控状态……"}
      </Text>
      {error ? <button type="button" className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70" onClick={() => window.location.reload()}>重新加载</button> : null}
    </Card>
  );
}
