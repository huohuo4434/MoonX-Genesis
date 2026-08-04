"use client";

import { useCallback, useEffect, useState } from "react";
import { BitgetDemoClient, type BitgetAdminDashboard } from "@/components/admin/BitgetDemoClient";
import { Button, Card, Heading, Text } from "@/components/ui";

async function loadDashboard(signal: AbortSignal): Promise<BitgetAdminDashboard> {
  const response = await fetch("/api/admin/bitget-demo/status", {
    cache: "no-store",
    credentials: "include",
    signal,
  });
  const text = await response.text();
  let body: (BitgetAdminDashboard & { error?: string }) | null = null;
  try {
    body = JSON.parse(text) as BitgetAdminDashboard & { error?: string };
  } catch {
    throw new Error(`后台状态返回格式异常（HTTP ${response.status}）`);
  }
  if (!body) {
    throw new Error(`后台状态返回为空（HTTP ${response.status}）`);
  }
  if (!response.ok || body.error) {
    throw new Error(body.error || `后台状态读取失败（HTTP ${response.status}）`);
  }
  return body;
}

export function BitgetLiveConsoleLoader() {
  const [dashboard, setDashboard] = useState<BitgetAdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10_000);
    setLoading(true);
    setError(null);

    void loadDashboard(controller.signal)
      .then((value) => setDashboard(value))
      .catch((reason: unknown) => {
        if (controller.signal.aborted) {
          setError("后台状态读取超过10秒，页面已停止等待。可以重试，不会影响服务器交易任务。");
        } else {
          setError(reason instanceof Error ? reason.message : "后台状态读取失败");
        }
      })
      .finally(() => {
        window.clearTimeout(timer);
        setLoading(false);
      });

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [attempt]);

  if (dashboard) return <BitgetDemoClient initial={dashboard} />;

  return (
    <Card padding="lg" className="border-white/10">
      <Heading size="h3">实盘状态面板</Heading>
      <Text variant="body-sm" color="secondary" className="mt-2 block">
        {loading
          ? "页面框架已经打开，正在单独读取数据库快照。交易服务器不依赖本页面保持打开。"
          : "页面本身已正常打开，但状态快照暂时没有返回。"}
      </Text>
      {error ? <Text variant="body-sm" className="mt-3 block text-amber-300">{error}</Text> : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" onClick={reload} isLoading={loading}>重新读取状态</Button>
        <Button type="button" variant="outline" onClick={() => window.location.assign("/admin")}>返回管理首页</Button>
      </div>
    </Card>
  );
}
