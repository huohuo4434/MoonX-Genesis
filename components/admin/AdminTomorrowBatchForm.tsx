"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Text } from "@/components/ui";
import { DAILY_ACCURACY_ASSETS } from "@/types/daily-accuracy";
import { getBeijingTomorrowKey } from "@/lib/calendar/beijing-date";
import { getForecastDateOnOrAfter } from "@/lib/calendar/next-trading-day";
import type { DailyForecastMarket } from "@/types/daily-forecast";

const CORE_KEYS = ["BTC", "ETH", "SPX", "NDX", "SSE", "HSTECH", "GLD", "SILVER", "WTI"] as const;

function toLegacyMarket(market: (typeof DAILY_ACCURACY_ASSETS)[number]["market"]): DailyForecastMarket {
  if (market === "CRYPTO") return "crypto";
  if (market === "CN") return "cn";
  if (market === "HK") return "hk";
  if (market === "US_FUTURES") return "commodity";
  return "us";
}

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
      const targetDate = getForecastDateOnOrAfter(toLegacyMarket(asset.market), forecastDate);
      const res = await fetch("/api/admin/daily-forecasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          assetKey: key,
          forecastDate: targetDate,
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
      setMessage(`已建草稿 ${ok}/9。失败：${errors.join("；")}`);
    } else {
      setMessage(
        `已按各市场实际交易日创建 ${ok} 个草稿。请补全方向后调用「生成技术价位并发布」。`
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
          : `已按各市场实际交易日完成技术价位与锁定。`
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
        先创建草稿，再用真实K线生成支撑与压力区间。系统会按各市场实际交易日分别保存。
      </Text>
      <label className="block text-caption text-foreground-tertiary">
        基准日期（非交易日将自动顺延）
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
