"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Text } from "@/components/ui";
import { DAILY_ACCURACY_ASSETS } from "@/types/daily-accuracy";
import { getBeijingTomorrowKey } from "@/lib/calendar/beijing-date";

const CORE_KEYS = ["BTC", "SPX", "NDX", "SSE", "HSTECH", "GLD", "WTI"] as const;

/**
 * Creates draft next-session rows only. Publish requires technical price validation.
 */
export function AdminTomorrowBatchForm() {
  const router = useRouter();
  const [forecastDate, setForecastDate] = useState(getBeijingTomorrowKey());
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createDraftBatch() {
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
          summary: `${asset.assetName}下一交易日草稿 — 发布前须通过技术价位结构校验，禁止放量/前一日高低点表述。`,
          source: "MOOX",
          action: "save_draft",
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
      setMessage(`已建草稿 ${ok}/7。失败：${errors.join("；")}`);
    } else {
      setMessage(
        `已创建 ${ok} 个市场草稿（${forecastDate}）。请补全方向后调用「生成技术价位并发布」；系统会自动发布，管理员仅作可选修正。`
      );
    }
    router.refresh();
  }

  async function lockWithTechnicalLevels() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/tomorrow-lock-levels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forecastDate }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      results?: Array<{ symbol: string; ok: boolean; error?: string }>;
    };
    setLoading(false);
    if (!res.ok || !json.ok) {
      setMessage(json.error ?? "技术价位锁定失败");
    } else {
      const fails = (json.results ?? []).filter((r) => !r.ok);
      setMessage(
        fails.length
          ? `部分失败：${fails.map((f) => `${f.symbol}:${f.error}`).join("；")}`
          : `已按技术结构引擎锁定 ${forecastDate} 批次（需通过发布校验）。`
      );
    }
    router.refresh();
  }

  return (
    <Card padding="md" className="mb-6 space-y-3 border-primary/20">
      <Text variant="body-sm" weight="semibold">
        下一交易日预测批次
      </Text>
      <Text variant="caption" color="tertiary" className="block">
        禁止直接发布空壳。必须先建草稿，再用真实K线生成支撑/压力区间；含「放量突破 / 前一日高低点」的内容禁止发布。
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
        <Button type="button" disabled={loading} onClick={createDraftBatch}>
          {loading ? "处理中…" : "创建草稿（不发布）"}
        </Button>
        <Button type="button" variant="outline" disabled={loading} onClick={lockWithTechnicalLevels}>
          生成技术价位并尝试锁定
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
