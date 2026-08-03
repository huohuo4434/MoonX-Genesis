"use client";

import { useState } from "react";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import type {
  StrategyExperimentSummary,
  StrategyPerformanceMetrics,
  StrategyValidationDashboard,
  StrategyValidationInvariant,
} from "@/types/strategy-validation";

function strategyLabel(type: StrategyPerformanceMetrics["strategyType"]): string {
  return type === "INTRADAY" ? "短线" : type === "SWING" ? "波段" : "中长期";
}

function metric(value: number | null, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value}${suffix}`;
}

function time(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("zh-CN", { hour12: false });
}

function invariantBadge(row: StrategyValidationInvariant) {
  if (row.ok) return <Badge variant="success">通过</Badge>;
  return <Badge variant={row.severity === "CRITICAL" ? "danger" : "warning"}>未通过</Badge>;
}

function experimentStats(experiment: StrategyExperimentSummary): string {
  const pf = experiment.profitFactor == null ? "—" : experiment.profitFactor >= 999 ? "∞" : experiment.profitFactor;
  return `开放${experiment.openTrials} / 已结束${experiment.closedTrials} / 胜率${metric(experiment.winRatePct, "%")} / 期望${metric(experiment.expectancyR, "R")} / PF ${pf}`;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export function StrategyValidationClient({ initial }: { initial: StrategyValidationDashboard }) {
  const [dashboard, setDashboard] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function post(body: Record<string, unknown>) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/bitget-demo/validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJson<{ error?: string; dashboard?: StrategyValidationDashboard; report?: { message?: string } }>(response);
      if (!response.ok || data.error || !data.dashboard) {
        throw new Error(data.error || "Phase 3操作失败");
      }
      setDashboard(data.dashboard);
      setMessage(data.report?.message || "Phase 3设置已更新。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Phase 3操作失败");
    } finally {
      setLoading(false);
    }
  }

  const gateVariant = dashboard.gateStatus === "DEMO_VALIDATED"
    ? "success"
    : dashboard.gateStatus === "BLOCKED"
      ? "danger"
      : "warning";

  return (
    <Card padding="lg" className="space-y-6 border-warning/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Heading size="h3">Phase 3 模拟验收中心</Heading>
          <Text variant="body-sm" color="secondary" className="mt-2 block max-w-4xl">
            自动归档Bitget Demo净收益、手续费、资金费和入场滑点；持续检查重复订单、孤儿仓位、保护单与服务器可用率；同时运行只读A/B影子实验。
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="danger">真钱永久锁定</Badge>
          <Badge variant={gateVariant}>{dashboard.gateLabel}</Badge>
        </div>
      </div>

      <div className="rounded-lg border border-danger/20 bg-danger/5 p-4">
        <Text variant="body-sm" className="text-danger">{dashboard.realTradingNotice}</Text>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border border-white/10 p-3">
          <Text variant="caption" color="tertiary">稳定运行</Text>
          <Text variant="body" weight="semibold" className="mt-1 block">{dashboard.stableDays}天 / 30天</Text>
        </div>
        <div className="rounded-lg border border-white/10 p-3">
          <Text variant="caption" color="tertiary">心跳可用率</Text>
          <Text variant="body" weight="semibold" className="mt-1 block">{metric(dashboard.heartbeatAvailabilityPct, "%")}</Text>
        </div>
        <div className="rounded-lg border border-white/10 p-3">
          <Text variant="caption" color="tertiary">账户最大回撤</Text>
          <Text variant="body" weight="semibold" className="mt-1 block">{metric(dashboard.maxAccountDrawdownPct, "%")}</Text>
        </div>
        <div className="rounded-lg border border-white/10 p-3">
          <Text variant="caption" color="tertiary">严重异常</Text>
          <Text variant="body" weight="semibold" className="mt-1 block">{dashboard.unresolvedCriticalEvents}</Text>
        </div>
        <div className="rounded-lg border border-white/10 p-3">
          <Text variant="caption" color="tertiary">权益快照</Text>
          <Text variant="body" weight="semibold" className="mt-1 block">{dashboard.snapshotCount}</Text>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Text variant="body-sm" weight="semibold">验收闸门</Text>
          <Button size="sm" variant="outline" isLoading={loading} onClick={() => void post({ action: "refresh" })}>
            立即运行一次验收
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-left text-xs text-white/70">
            <thead className="bg-white/[0.03] text-white/45">
              <tr>
                <th className="px-3 py-2">项目</th>
                <th className="px-3 py-2">状态</th>
                <th className="px-3 py-2">当前</th>
                <th className="px-3 py-2">要求</th>
                <th className="px-3 py-2">说明</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.invariants.map((row) => (
                <tr key={row.key} className="border-t border-white/10">
                  <td className="px-3 py-2 font-medium text-white/85">{row.label}</td>
                  <td className="px-3 py-2">{invariantBadge(row)}</td>
                  <td className="px-3 py-2">{row.current}</td>
                  <td className="px-3 py-2">{row.required}</td>
                  <td className="max-w-lg px-3 py-2">{row.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <Text variant="body-sm" weight="semibold">三套策略净绩效</Text>
        <div className="grid gap-4 xl:grid-cols-3">
          {dashboard.performance.map((row) => (
            <div key={row.strategyType} className="space-y-3 rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between gap-2">
                <Text variant="body" weight="semibold">{strategyLabel(row.strategyType)}</Text>
                <Badge variant={row.sampleReady ? "success" : "warning"}>{row.closedTrades}/30笔</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-white/65">
                <div>胜率：{metric(row.winRatePct, "%")}</div>
                <div>利润因子：{row.profitFactor == null ? "—" : row.profitFactor >= 999 ? "∞" : row.profitFactor}</div>
                <div>净收益：{metric(row.netPnlUsdt, " USDT")}</div>
                <div>期望：{metric(row.expectancyR, "R")}</div>
                <div>手续费：{metric(row.feesUsdt, " USDT")}</div>
                <div>资金费：{metric(row.fundingUsdt, " USDT")}</div>
                <div>策略回撤：{metric(row.maxDrawdownPct, "%")}</div>
                <div>入场滑点：{metric(row.averageEntrySlippageBps, " bps")}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Text variant="body-sm" weight="semibold">A/B影子实验</Text>
        <Text variant="caption" color="tertiary">
          实验只复用已生成的策略决策和价格路径，不会提交任何订单，也不会改写正式策略参数。
        </Text>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {dashboard.experiments.map((experiment) => (
            <div key={experiment.id} className="space-y-2 rounded-lg border border-white/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <Text variant="body-sm" weight="semibold">{experiment.name}</Text>
                <label className="flex items-center gap-2 text-xs text-white/65">
                  <input
                    type="checkbox"
                    checked={experiment.enabled}
                    disabled={loading}
                    onChange={(event) => void post({
                      action: "setExperiment",
                      experimentId: experiment.id,
                      enabled: event.target.checked,
                    })}
                  />
                  {experiment.enabled ? "运行" : "暂停"}
                </label>
              </div>
              <Text variant="caption" color="tertiary">{experiment.description}</Text>
              <Text variant="caption">门槛调整：{experiment.confidenceDelta > 0 ? "+" : ""}{experiment.confidenceDelta}；{experimentStats(experiment)}</Text>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Text variant="body-sm" weight="semibold">最近对账异常</Text>
        {dashboard.recentEvents.length ? (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-full text-left text-xs text-white/70">
              <thead className="bg-white/[0.03] text-white/45">
                <tr>
                  <th className="px-3 py-2">时间</th>
                  <th className="px-3 py-2">级别</th>
                  <th className="px-3 py-2">标的</th>
                  <th className="px-3 py-2">状态</th>
                  <th className="px-3 py-2">说明</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentEvents.map((event) => (
                  <tr key={event.id} className="border-t border-white/10">
                    <td className="whitespace-nowrap px-3 py-2">{time(event.createdAt)}</td>
                    <td className="px-3 py-2"><Badge variant={event.severity === "CRITICAL" ? "danger" : event.severity === "WARNING" ? "warning" : "info"}>{event.severity}</Badge></td>
                    <td className="px-3 py-2">{event.symbol || "—"}</td>
                    <td className="px-3 py-2">{event.resolved ? "已自动恢复" : "未解决"}</td>
                    <td className="max-w-xl px-3 py-2">{event.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Text variant="caption" color="tertiary">尚无对账异常记录。</Text>
        )}
      </div>

      <Text variant="caption" color="tertiary">
        最近验收：{time(dashboard.lastCycleAt)}；{dashboard.lastCycleMessage}
      </Text>
      {message ? <Text variant="body-sm" className={message.includes("失败") || message.includes("错误") ? "text-danger" : "text-success"}>{message}</Text> : null}
    </Card>
  );
}
