"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Text } from "@/components/ui";
import { DAILY_ACCURACY_ASSETS } from "@/types/daily-accuracy";
import { getBeijingTomorrowKey } from "@/lib/calendar/beijing-date";

const CORE_KEYS = ["BTC", "SPX", "NDX", "SSE", "HSTECH", "GLD", "WTI"] as const;

/**
 * Creates / locks a next-session forecast batch for the 7 core markets.
 * Writes through the existing daily-forecasts admin API — not Wave tables.
 */
export function AdminTomorrowBatchForm() {
  const router = useRouter();
  const [forecastDate, setForecastDate] = useState(getBeijingTomorrowKey());
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function publishBatch() {
    setLoading(true);
    setMessage(null);
    const errors: string[] = [];
    let ok = 0;
    for (const key of CORE_KEYS) {
      const asset = DAILY_ACCURACY_ASSETS.find((a) => a.key === key);
      if (!asset) continue;
      const res = await fetch("/api/admin/daily-forecasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          assetKey: key,
          forecastDate,
          direction: "FLAT",
          probability: 40,
          summary: `${asset.assetName}下一交易日预测草稿 — 请在发布前补全方向、概率、路径与价位。`,
          source: "MoonX",
          action: "publish",
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        errors.push(`${key}: ${json.error ?? res.status}`);
      } else {
        ok += 1;
      }
    }
    setLoading(false);
    if (errors.length) {
      setMessage(`已发布 ${ok}/7。失败：${errors.join("；")}`);
    } else {
      setMessage(`已发布并锁定 ${ok} 个市场的下一交易日预测批次（${forecastDate}）。请逐条完善路径与价位。`);
    }
    router.refresh();
  }

  return (
    <Card padding="md" className="mb-6 space-y-3 border-primary/20">
      <Text variant="body-sm" weight="semibold">
        下一交易日预测批次
      </Text>
      <Text variant="caption" color="tertiary" className="block">
        一次创建 BTC / SPX / NDX / SHCOMP / HSTECH / GLD / WTI 七个市场。不会写入 Wave
        表。发布后历史版本不可覆盖，需调整请新建更高版本。
      </Text>
      <label className="block text-caption text-foreground-tertiary">
        预测日期（下一交易日）
        <input
          type="date"
          value={forecastDate}
          onChange={(e) => setForecastDate(e.target.value)}
          className="mt-1 h-10 w-full max-w-xs rounded-md border border-border bg-surface px-3 text-body-sm"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={loading} onClick={publishBatch}>
          {loading ? "发布中…" : "创建并发布锁定下一交易日预测"}
        </Button>
      </div>
      {message ? (
        <Text variant="caption" color="secondary" className="block">
          {message}
        </Text>
      ) : null}
    </Card>
  );
}
