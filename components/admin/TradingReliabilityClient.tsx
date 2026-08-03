"use client";

import { useState } from "react";
import { Badge, Button, Card, Text } from "@/components/ui";
import type {
  TradingReliabilityDashboard,
  TradingReliabilityMode,
} from "@/types/trading-reliability";

function time(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("zh-CN", { hour12: false });
}

function seconds(value: number | null): string {
  return value == null ? "—" : `${value}秒`;
}

function modeVariant(mode: TradingReliabilityMode): "success" | "warning" | "danger" | "info" {
  if (mode === "RUNNING") return "success";
  if (mode === "RECOVERING" || mode === "OPENING_DISABLED") return "warning";
  if (mode === "MANAGE_ONLY" || mode === "PAUSED" || mode === "EMERGENCY_CLOSE_ONLY") return "danger";
  return "info";
}

export function TradingReliabilityClient({ initial }: { initial: TradingReliabilityDashboard }) {
  const [dashboard, setDashboard] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function post(body: Record<string, unknown>) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/bitget-demo/reliability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as {
        error?: string;
        dashboard?: TradingReliabilityDashboard;
      };
      if (!response.ok || payload.error) throw new Error(payload.error || "操作失败");
      if (payload.dashboard) setDashboard(payload.dashboard);
      setMessage("操作已完成，可靠性状态已刷新。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-6 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="body" weight="semibold">Phase 4 交易可靠性与故障恢复</Text>
            <Badge variant="danger">真钱永久锁定</Badge>
            <Badge variant="info">UTA V3 Demo</Badge>
            <Badge variant={modeVariant(dashboard.mode)}>{dashboard.modeLabel}</Badge>
          </div>
          <Text variant="caption" color="tertiary" className="mt-2 block max-w-4xl">
            {dashboard.modeReason}。暂停只阻止新开仓，系统仍继续管理已有Demo仓位、保护单和订单对账。
          </Text>
        </div>
        <Button size="sm" variant="outline" isLoading={loading} onClick={() => void post({ action: "refresh" })}>
          立即运行看门狗
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <div className="rounded-lg border border-white/10 p-3">
          <Text variant="caption" color="tertiary">新开仓</Text>
          <Text variant="body-sm" weight="semibold" className="mt-1 block">{dashboard.openingAllowed ? "允许" : "已拦截"}</Text>
        </div>
        <div className="rounded-lg border border-white/10 p-3">
          <Text variant="caption" color="tertiary">已有仓位管理</Text>
          <Text variant="body-sm" weight="semibold" className="mt-1 block">{dashboard.managementAllowed ? "继续运行" : "异常"}</Text>
        </div>
        <div className="rounded-lg border border-white/10 p-3">
          <Text variant="caption" color="tertiary">服务器时间差</Text>
          <Text variant="body-sm" weight="semibold" className="mt-1 block">{dashboard.serverTimeOffsetMs == null ? "—" : `${dashboard.serverTimeOffsetMs}ms`}</Text>
        </div>
        <div className="rounded-lg border border-white/10 p-3">
          <Text variant="caption" color="tertiary">交易心跳年龄</Text>
          <Text variant="body-sm" weight="semibold" className="mt-1 block">{seconds(dashboard.heartbeatAgeSeconds)}</Text>
        </div>
        <div className="rounded-lg border border-white/10 p-3">
          <Text variant="caption" color="tertiary">行情年龄</Text>
          <Text variant="body-sm" weight="semibold" className="mt-1 block">{seconds(dashboard.marketAgeSeconds)}</Text>
        </div>
        <div className="rounded-lg border border-white/10 p-3">
          <Text variant="caption" color="tertiary">连续健康检查</Text>
          <Text variant="body-sm" weight="semibold" className="mt-1 block">{dashboard.consecutiveHealthyRuns}/3</Text>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2 rounded-xl border border-white/10 p-4">
          <Text variant="body-sm" weight="semibold">执行发件箱</Text>
          <div className="grid grid-cols-2 gap-2 text-xs text-white/65">
            <div>等待：{dashboard.pendingOutbox}</div>
            <div>处理中：{dashboard.processingOutbox}</div>
            <div>已ACK：{dashboard.acknowledgedOutbox}</div>
            <div>失败：{dashboard.failedOutbox}</div>
            <div>卡住：{dashboard.stuckOutbox}</div>
          </div>
          <Button size="sm" variant="outline" isLoading={loading} onClick={() => void post({ action: "retryOutbox" })}>
            重试失败任务
          </Button>
        </div>
        <div className="space-y-2 rounded-xl border border-white/10 p-4">
          <Text variant="body-sm" weight="semibold">仓位与保护</Text>
          <div className="grid grid-cols-2 gap-2 text-xs text-white/65">
            <div>无保护仓位：{dashboard.unprotectedPositions}</div>
            <div>孤儿仓位：{dashboard.orphanPositions}</div>
            <div>未知保护单：{dashboard.unknownProtectionOrders}</div>
          </div>
          <Text variant="caption" color="tertiary">
            无保护仓位连续两轮出现后才尝试补挂Demo保护单；孤儿仓位只报警，不自动全部平仓。
          </Text>
        </div>
        <div className="space-y-2 rounded-xl border border-white/10 p-4">
          <Text variant="body-sm" weight="semibold">运行控制</Text>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" isLoading={loading} onClick={() => void post({ action: "setMode", mode: "MANAGE_ONLY" })}>
              只管理已有仓位
            </Button>
            <Button size="sm" variant="outline" isLoading={loading} onClick={() => void post({ action: "clearOverride" })}>
              申请恢复运行
            </Button>
            <Button size="sm" variant="danger" isLoading={loading} onClick={() => void post({ action: "setMode", mode: "PAUSED" })}>
              暂停新开仓
            </Button>
          </div>
          <Text variant="caption" color="tertiary">
            “申请恢复”不会立即开仓，必须再连续通过3轮健康检查。这里没有危险的“一键全部平仓”按钮。
          </Text>
        </div>
      </div>

      <div className="space-y-2">
        <Text variant="body-sm" weight="semibold">最近可靠性异常</Text>
        {dashboard.recentIncidents.length ? (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-full text-left text-xs text-white/70">
              <thead className="bg-white/[0.03] text-white/45">
                <tr>
                  <th className="px-3 py-2">最近出现</th>
                  <th className="px-3 py-2">级别</th>
                  <th className="px-3 py-2">代码</th>
                  <th className="px-3 py-2">标的</th>
                  <th className="px-3 py-2">次数</th>
                  <th className="px-3 py-2">状态</th>
                  <th className="px-3 py-2">说明</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentIncidents.map((incident) => (
                  <tr key={incident.id} className="border-t border-white/10">
                    <td className="whitespace-nowrap px-3 py-2">{time(incident.lastSeenAt)}</td>
                    <td className="px-3 py-2"><Badge variant={incident.severity === "CRITICAL" ? "danger" : incident.severity === "WARNING" ? "warning" : "info"}>{incident.severity}</Badge></td>
                    <td className="px-3 py-2">{incident.code}</td>
                    <td className="px-3 py-2">{incident.symbol || "—"}</td>
                    <td className="px-3 py-2">{incident.occurrenceCount}</td>
                    <td className="px-3 py-2">{incident.resolved ? "已恢复" : "未解决"}</td>
                    <td className="max-w-xl px-3 py-2">{incident.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Text variant="caption" color="tertiary">尚无可靠性异常记录。</Text>
        )}
      </div>

      <div className="space-y-1 text-xs text-white/50">
        <div>最近看门狗：{time(dashboard.lastWatchdogAt)}</div>
        <div>最近健康：{time(dashboard.lastHealthyAt)}</div>
        <div>最近时间同步：{time(dashboard.lastServerTimeSyncAt)}</div>
      </div>
      {message ? <Text variant="body-sm" className={message.includes("失败") || message.includes("错误") ? "text-danger" : "text-success"}>{message}</Text> : null}
    </Card>
  );
}
