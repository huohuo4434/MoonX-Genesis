"use client";

import { useState } from "react";

import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import type { ResearchStoreHealth } from "@/lib/research/research-store-health-core";

const stateLabel: Record<ResearchStoreHealth["state"], string> = {
  READY: "正常",
  MISSING: "待初始化",
  INVALID: "结构异常",
  UNCONFIGURED: "未配置",
  ERROR: "读取失败",
};

function countText(counts: Record<string, number>): string {
  const labels: Record<string, string> = {
    lessons: "课程",
    extractions: "解析",
    candidates: "候选",
    rules: "规则",
    cases: "案例",
    methods: "方法",
    conflicts: "冲突",
  };
  const rows = Object.entries(counts);
  return rows.length ? rows.map(([key, value]) => `${labels[key] ?? key} ${value}`).join(" · ") : "尚无可读计数";
}

export function ResearchStoreHealthClient({ initialStores }: { initialStores: ResearchStoreHealth[] }) {
  const [stores, setStores] = useState(initialStores);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const hasMissing = stores.some((item) => item.state === "MISSING");

  async function initializeMissing() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/research-stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "INITIALIZE_MISSING" }),
      });
      const payload = await response.json() as { error?: string; stores?: ResearchStoreHealth[] };
      if (payload.stores) setStores(payload.stores);
      if (!response.ok) throw new Error(payload.error || "初始化失败");
      setMessage("缺失对象已安全初始化；已有对象保持原样。没有改动任何预测、权重或交易设置。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "初始化失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card padding="lg" className="mt-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading as="h2" size="h3">研究知识库存储</Heading>
          <Text variant="caption" color="tertiary" className="mt-1 block">
            只检查对象是否存在、结构是否完整和统计数量；不显示原文、密钥或内部路径。
          </Text>
        </div>
        {hasMissing ? (
          <Button type="button" size="sm" disabled={busy} onClick={initializeMissing}>
            {busy ? "初始化中…" : "只初始化缺失对象"}
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {stores.map((item) => (
          <div key={item.id} className="rounded-lg border border-border/[0.1] p-4">
            <div className="flex items-center justify-between gap-3">
              <Text variant="body-sm" weight="semibold">{item.label}</Text>
              <Badge variant={item.state === "READY" ? "success" : item.state === "MISSING" ? "warning" : "outline"}>
                {stateLabel[item.state]}
              </Badge>
            </div>
            <Text variant="caption" color="secondary" className="mt-2 block">{countText(item.counts)}</Text>
            <Text variant="caption" color="tertiary" className="mt-1 block">
              {item.backend} · {item.detail}{item.updatedAt ? ` · 更新 ${item.updatedAt}` : ""}
            </Text>
          </div>
        ))}
      </div>
      {message ? <Text variant="body-sm" color="secondary">{message}</Text> : null}
      <Text variant="caption" color="tertiary">
        若对象已存在但结构异常，系统会失败关闭并拒绝覆盖；初始化采用不可覆盖写入，重复点击也不会重置知识库。
      </Text>
    </Card>
  );
}
