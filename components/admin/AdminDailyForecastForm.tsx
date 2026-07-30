"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Text } from "@/components/ui";
import { DAILY_ACCURACY_ASSETS, type DailyForecastRecord } from "@/types/daily-accuracy";

function beijingTodayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function AdminDailyForecastForm({ initial }: { initial?: DailyForecastRecord | null }) {
  const router = useRouter();
  const [assetKey, setAssetKey] = useState<(typeof DAILY_ACCURACY_ASSETS)[number]["key"]>("BTC");
  const [forecastDate, setForecastDate] = useState(initial?.forecastDate ?? beijingTodayKey());
  const [direction, setDirection] = useState<"UP" | "DOWN" | "FLAT">(initial?.direction ?? "UP");
  const [probability, setProbability] = useState(String(initial?.probability ?? 60));
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [source, setSource] = useState(initial?.source ?? "MOOX");
  const [publishedAt, setPublishedAt] = useState(
    initial?.publishedAt ? initial.publishedAt.slice(0, 16) : ""
  );
  const [cutoffAt, setCutoffAt] = useState(initial?.cutoffAt ? initial.cutoffAt.slice(0, 16) : "");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(action: "save_draft" | "publish" | "withdraw") {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/daily-forecasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: initial?.id,
        assetKey,
        forecastDate,
        direction,
        probability: Number(probability) || undefined,
        summary: summary.trim() || undefined,
        source: source.trim() || "MOOX",
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
        cutoffAt: cutoffAt ? new Date(cutoffAt).toISOString() : undefined,
        action,
      }),
    });
    const json = (await res.json()) as { error?: string; note?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(json.error ?? "操作失败");
      return;
    }
    setMessage(json.note ?? (action === "publish" ? "已发布" : action === "withdraw" ? "已撤回" : "草稿已保存"));
    router.refresh();
  }

  return (
    <Card padding="md" className="mb-6 space-y-3">
      <Text variant="body-sm" weight="semibold">
        新建每日预测
      </Text>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-caption text-foreground-tertiary">
          预测日期
          <input
            type="date"
            value={forecastDate}
            onChange={(e) => setForecastDate(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
          />
        </label>
        <label className="text-caption text-foreground-tertiary">
          资产
          <select
            value={assetKey}
            onChange={(e) => setAssetKey(e.target.value as typeof assetKey)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
          >
            {DAILY_ACCURACY_ASSETS.map((a) => (
              <option key={a.key} value={a.key}>
                {a.assetName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-caption text-foreground-tertiary">
          方向
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as typeof direction)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
          >
            <option value="UP">上涨</option>
            <option value="DOWN">下跌</option>
            <option value="FLAT">震荡</option>
          </select>
        </label>
        <label className="text-caption text-foreground-tertiary">
          概率
          <input
            type="number"
            min={0}
            max={100}
            value={probability}
            onChange={(e) => setProbability(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
          />
        </label>
        <label className="text-caption text-foreground-tertiary sm:col-span-2">
          简要说明
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm"
          />
        </label>
        <label className="text-caption text-foreground-tertiary">
          来源
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
          />
        </label>
        <label className="text-caption text-foreground-tertiary">
          发布时间（可选）
          <input
            type="datetime-local"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
          />
        </label>
        <label className="text-caption text-foreground-tertiary">
          截止时间（可选）
          <input
            type="datetime-local"
            value={cutoffAt}
            onChange={(e) => setCutoffAt(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={loading} onClick={() => submit("save_draft")}>
          保存草稿
        </Button>
        <Button size="sm" disabled={loading} onClick={() => submit("publish")}>
          审核发布
        </Button>
        {initial && (
          <Button size="sm" variant="outline" disabled={loading} onClick={() => submit("withdraw")}>
            撤回
          </Button>
        )}
      </div>
      {message && (
        <Text variant="caption" color="tertiary">
          {message}
        </Text>
      )}
    </Card>
  );
}

export function AdminRunDailyVerifyButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(forceIds?: string[]) {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/verification/run-daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forceIds?.length ? { forceRefetchForecastIds: forceIds } : {}),
    });
    const json = (await res.json()) as { error?: string; report?: Record<string, number> };
    setLoading(false);
    if (!res.ok) {
      setMessage(json.error ?? "验证失败");
      return;
    }
    const r = json.report;
    setMessage(
      r
        ? `完成：扫描${r.scanned} · 新验证${r.verified} · 跳过${r.skippedExisting} · 休市/无效${r.voided} · 人工核对${r.manualReview} · 未到期${r.notReady}`
        : "已执行"
    );
    router.refresh();
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Button size="sm" disabled={loading} onClick={() => run()}>
        {loading ? "验证中…" : "立即验证"}
      </Button>
      {message && (
        <Text variant="caption" color="tertiary">
          {message}
        </Text>
      )}
    </div>
  );
}

export function AdminRefetchResultButton({ forecastId }: { forecastId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await fetch("/api/verification/run-daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forceRefetchForecastIds: [forecastId] }),
        });
        setLoading(false);
        router.refresh();
      }}
    >
      重新获取行情
    </Button>
  );
}
