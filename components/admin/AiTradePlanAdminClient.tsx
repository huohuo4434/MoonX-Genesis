"use client";

import { useState } from "react";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import type { AiTradePlan, AiTradePlanDashboard } from "@/types/ai-trade-plan";

function time(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
}

function number(value: number | null, digits = 4): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function badge(plan: AiTradePlan) {
  if (["OPEN", "REDUCED", "CLOSED"].includes(plan.status)) return "success" as const;
  if (["ARMED", "ORDER_SUBMITTED", "PARTIALLY_FILLED"].includes(plan.status)) return "warning" as const;
  if (["EXECUTION_ERROR", "INVALIDATED", "CANCELLED"].includes(plan.status)) return "danger" as const;
  return "outline" as const;
}

async function readDashboard(): Promise<AiTradePlanDashboard> {
  const response = await fetch("/api/admin/bitget-demo/plans", { cache: "no-store" });
  const text = await response.text();
  const json = JSON.parse(text) as AiTradePlanDashboard & { error?: string };
  if (!response.ok || json.error) throw new Error(json.error || "读取失败");
  return json;
}

export function AiTradePlanAdminClient({ initial }: { initial: AiTradePlanDashboard }) {
  const [dashboard, setDashboard] = useState(initial);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <Card padding="lg" className="space-y-6 border-primary/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Heading size="h3">AI事前计划与版本审计</Heading>
          <Text variant="body-sm" color="secondary" className="mt-2 block max-w-4xl">
            计划先发布并锁定，再等待技术触发和Bitget Demo执行。核心内容发生实质变化时保留V1并创建V2，不能覆盖历史。
          </Text>
        </div>
        <Button size="sm" variant="secondary" onClick={() => void refresh()} disabled={loading}>
          {loading ? "刷新中…" : "刷新计划"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">今日发布</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{dashboard.summary.publishedToday}</Text></div>
        <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">观察中</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{dashboard.summary.watching}</Text></div>
        <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">即将触发</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{dashboard.summary.armed}</Text></div>
        <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">委托或持仓</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{dashboard.summary.submittedOrOpen}</Text></div>
        <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">今日结束</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{dashboard.summary.closedToday}</Text></div>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/10 p-4">
        <Text variant="body-sm">{dashboard.notice}</Text>
        <Text variant="caption" color="tertiary" className="mt-2 block">
          本阶段不增加长期WebSocket Worker，也不启用真钱；继续由Vercel服务器Cron完成计划扫描、Bitget Demo执行和REST对账。
        </Text>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="min-w-full text-left text-xs text-white/70">
          <thead className="bg-white/[0.03] text-white/45">
            <tr>
              <th className="px-3 py-2">发布时间</th>
              <th className="px-3 py-2">计划</th>
              <th className="px-3 py-2">版本</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2">入场区</th>
              <th className="px-3 py-2">止损 / 目标2</th>
              <th className="px-3 py-2">进度</th>
              <th className="px-3 py-2">Bitget</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.plans.slice(0, 30).map((plan) => (
              <tr key={plan.id} className="border-t border-white/10">
                <td className="whitespace-nowrap px-3 py-2">{time(plan.publishedAt)}</td>
                <td className="px-3 py-2">{plan.symbol} · {plan.strategyLabel} · {plan.direction}</td>
                <td className="px-3 py-2">V{plan.version}<br/><span className="text-white/40">{plan.contentHash.slice(0, 10)}</span></td>
                <td className="px-3 py-2"><Badge variant={badge(plan)}>{plan.status}</Badge></td>
                <td className="whitespace-nowrap px-3 py-2">{number(plan.entryZoneLow)}—{number(plan.entryZoneHigh)}</td>
                <td className="whitespace-nowrap px-3 py-2">{number(plan.protectiveStop)} / {number(plan.target2)}</td>
                <td className="px-3 py-2">{plan.conditionsMet}/{plan.conditionsTotal}</td>
                <td className="max-w-xs px-3 py-2">{plan.bitgetOrderId ?? "尚未提交"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!dashboard.plans.length ? <Text variant="body-sm" color="secondary">暂无达到计划发布门槛的记录。</Text> : null}
      {message ? <Text variant="body-sm" className="text-red-300">{message}</Text> : null}
    </Card>
  );
}
