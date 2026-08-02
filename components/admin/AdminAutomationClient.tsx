"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Text } from "@/components/ui";
import type { AutomationSettings } from "@/types/automation";

export function AdminAutomationClient({
  settings,
  dashboard,
}: {
  settings: AutomationSettings;
  dashboard: {
    flags: Record<string, boolean>;
    lastRun: { runKey: string; status: string; finishedAt: string; message?: string } | null;
    failed: Array<{ runKey: string; message?: string; finishedAt: string }>;
    counts: Record<string, number>;
    nextForecastWindow: string;
    nextVerifyWindow: string;
    publishSchedule?: {
      /** New unified schedule text used by the nine-market pipeline. */
      formal?: string;
      /** Legacy fields kept optional so older stored dashboard shapes remain readable. */
      asia?: string;
      us?: string;
      wti?: string;
      publicFlip: string;
    };
    assetStatus?: Array<{
      assetName: string;
      symbol: string;
      forecastDate: string;
      generated: boolean;
      published: boolean;
      verified: boolean;
      failReason?: string;
    }>;
  };
}) {
  const router = useRouter();
  const [local, setLocal] = useState(settings);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function saveSettings(patch: Partial<AutomationSettings>) {
    setLoading(true);
    const next = { ...local, ...patch };
    setLocal(next);
    const res = await fetch("/api/admin/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setLoading(false);
    setMessage(res.ok ? "开关已保存" : "保存失败");
    router.refresh();
  }

  async function run(action: string) {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = (await res.json()) as { error?: string; report?: unknown };
    setLoading(false);
    setMessage(res.ok ? `完成：${action}` : json.error ?? "失败");
    router.refresh();
  }

  const toggles: Array<{ key: keyof AutomationSettings; label: string }> = [
    { key: "autoForecastEnabled", label: "每日自动生成预测" },
    { key: "autoPublishEnabled", label: "自动发布明日预测" },
    { key: "autoVerifyEnabled", label: "自动回填行情" },
    { key: "autoReviewEnabled", label: "自动生成复盘" },
    { key: "autoLearningEnabled", label: "自动应用历史经验" },
  ];

  return (
    <div className="space-y-6">
      <Card padding="md" className="space-y-2">
        <Text variant="body-sm" weight="semibold">
          运行窗口
        </Text>
        <Text variant="caption" color="tertiary" className="block">
          {dashboard.nextForecastWindow}
        </Text>
        <Text variant="caption" color="tertiary" className="block">
          {dashboard.nextVerifyWindow}
        </Text>
        {dashboard.publishSchedule && (
          <Text variant="caption" color="tertiary" className="block">
            {dashboard.publishSchedule.formal
              ? `${dashboard.publishSchedule.formal} · 今日公开 ${dashboard.publishSchedule.publicFlip}`
              : `BTC／A股／港股 ${dashboard.publishSchedule.asia ?? "自动更新"} · 纳指／GLD ${dashboard.publishSchedule.us ?? "自动更新"} · 今日公开 ${dashboard.publishSchedule.publicFlip}`}
          </Text>
        )}
        <Text variant="caption" color="tertiary" className="block">
          最后运行：
          {dashboard.lastRun
            ? `${dashboard.lastRun.runKey} · ${dashboard.lastRun.status} · ${new Date(dashboard.lastRun.finishedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`
            : "尚无"}
        </Text>
        {dashboard.lastRun?.message && (
          <Text variant="caption" color="tertiary" className="block">
            结果：{dashboard.lastRun.message}
          </Text>
        )}
      </Card>

      <Card padding="md">
        <Text variant="body-sm" weight="semibold" className="mb-3">
          自动化开关
        </Text>
        <div className="flex flex-col gap-2">
          {toggles.map((t) => (
            <label key={t.key} className="flex items-center gap-2 text-body-sm">
              <input
                type="checkbox"
                checked={Boolean(local[t.key])}
                disabled={loading}
                onChange={(e) => saveSettings({ [t.key]: e.target.checked })}
              />
              {t.label}
            </label>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["预测记录", dashboard.counts.forecasts],
          ["验证结果", dashboard.counts.verifications],
          ["复盘", dashboard.counts.reviews],
          ["学习案例", dashboard.counts.cases],
        ].map(([label, value]) => (
          <Card key={String(label)} padding="md">
            <Text variant="caption" color="tertiary">
              {label}
            </Text>
            <Text variant="body" weight="semibold" className="mt-1">
              {String(value)}
            </Text>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={loading} onClick={() => run("generate_tomorrow")}>
          立即生成明日预测
        </Button>
        <Button size="sm" disabled={loading} onClick={() => run("verify_closed")}>
          立即验证已收盘市场
        </Button>
        <Button size="sm" disabled={loading} onClick={() => run("generate_reviews")}>
          立即生成复盘
        </Button>
        <Button size="sm" variant="outline" disabled={loading} onClick={() => run("retry_failed")}>
          重新处理失败任务
        </Button>
        <Button size="sm" variant="outline" disabled={loading} onClick={() => run("run_cycle")}>
          运行完整周期
        </Button>
      </div>

      {message && (
        <Text variant="caption" color="tertiary">
          {message}
        </Text>
      )}

      {dashboard.assetStatus && dashboard.assetStatus.length > 0 && (
        <Card padding="md">
          <Text variant="body-sm" weight="semibold" className="mb-2">
            资产状态
          </Text>
          {dashboard.assetStatus.map((a) => (
            <Text key={`${a.symbol}-${a.forecastDate}`} variant="caption" color="tertiary" className="block">
              {a.forecastDate} · {a.assetName} · 生成{a.generated ? "✓" : "—"} · 发布
              {a.published ? "✓" : "—"} · 验证{a.verified ? "✓" : "—"}
              {a.failReason ? ` · ${a.failReason}` : ""}
            </Text>
          ))}
        </Card>
      )}

      {dashboard.failed.length > 0 && (
        <Card padding="md">
          <Text variant="body-sm" weight="semibold" className="mb-2">
            失败任务
          </Text>
          {dashboard.failed.map((f) => (
            <Text key={f.runKey} variant="caption" color="tertiary" className="block">
              {f.runKey} · {f.message ?? "failed"} ·{" "}
              {new Date(f.finishedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
            </Text>
          ))}
        </Card>
      )}
    </div>
  );
}
