"use client";

import { useEffect, useState } from "react";
import { Button, Card, Text } from "@/components/ui";

type OpsStatus = {
  beijingNow: string;
  businessDate: string;
  nextDate: string;
  todayExists: boolean;
  todayCount: number;
  tomorrowExists: boolean;
  tomorrowCount: number;
  latestAutomation: {
    id: string;
    startedAt: string;
    finishedAt?: string;
    status: string;
    message: string | null;
  } | null;
  latestStoreDates: string[];
};

type OpsAction = "revalidate" | "check" | "generate-missing" | "verify-access";

const ACTION_LABEL: Record<OpsAction, string> = {
  check: "重新检查今日预测",
  "generate-missing": "补生成缺失预测",
  "verify-access": "重新验证权限状态",
  revalidate: "清除预测页面缓存",
};

export function AdminForecastOpsPanel() {
  const [status, setStatus] = useState<OpsStatus | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/forecast-ops", { cache: "no-store" });
    if (!res.ok) return;
    setStatus(await res.json());
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function run(action: OpsAction) {
    if (!window.confirm(`确认执行：${ACTION_LABEL[action]}？`)) {
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/forecast-ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, confirm: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "失败");
      setMsg(
        action === "generate-missing"
          ? `补生成已触发：${JSON.stringify(json.generateReport ?? {})}`
          : ACTION_LABEL[action] + "完成"
      );
      await refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card padding="md" className="mb-6 space-y-3 border-border/[0.08]">
      <Text variant="body" weight="semibold">
        预测故障兜底状态
      </Text>
      {status ? (
        <div className="grid gap-2 text-body-sm text-foreground-secondary sm:grid-cols-2">
          <p>北京时间：{status.beijingNow}</p>
          <p>业务日期：{status.businessDate}</p>
          <p>今日预测：{status.todayExists ? `存在（${status.todayCount}）` : "缺失"}</p>
          <p>
            明日预测（{status.nextDate}）：
            {status.tomorrowExists ? `存在（${status.tomorrowCount}）` : "缺失 / 尚未生成"}
          </p>
          <p className="sm:col-span-2">
            最近自动任务：
            {status.latestAutomation
              ? `${status.latestAutomation.status} · ${status.latestAutomation.startedAt}${
                  status.latestAutomation.message ? ` · ${status.latestAutomation.message}` : ""
                }`
              : "无记录"}
          </p>
          <p className="sm:col-span-2">
            存储库最近日期：{status.latestStoreDates.join(", ") || "空"}
          </p>
        </div>
      ) : (
        <Text variant="body-sm" color="secondary">
          加载中…
        </Text>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={() => run("check")}>
          重新检查今日预测
        </Button>
        <Button type="button" size="sm" disabled={busy} onClick={() => run("generate-missing")}>
          补生成缺失预测
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => run("verify-access")}>
          重新验证权限状态
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => run("revalidate")}>
          清除预测页面缓存
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => refresh()}>
          刷新状态
        </Button>
      </div>
      {msg ? (
        <Text variant="caption" color="tertiary">
          {msg}
        </Text>
      ) : null}
    </Card>
  );
}
