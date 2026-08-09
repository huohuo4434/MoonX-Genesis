"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import type {
  BitgetFailedOrderAuditReport,
  BitgetRuntimeState,
  BitgetSmokeTestReport,
} from "@/types/bitget-demo-runtime";

const inputClass =
  "min-h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-primary/60";

const LIVE_ASSET_LABELS: Record<string, string> = {
  BTCUSDT: "比特币",
  ETHUSDT: "以太坊",
  HYPEUSDT: "HYPE",
  MUUSDT: "美光",
  QQQUSDT: "纳指QQQ",
  XAUTUSDT: "黄金",
  XAGUSDT: "白银",
  GOOGLUSDT: "谷歌",
  CLUSDT: "WTI原油",
  SPYUSDT: "标普",
};

function signed(value: number | null | undefined, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}${suffix}`;
}

export type BitgetAdminDashboard = {
  environment: {
    mode: "DEMO" | "LIVE_EXPERIMENT";
    configured: boolean;
    executionAllowed: boolean;
    testOrderAllowed: boolean;
    apiKeyMasked: string;
    leverage: number;
    liveConfirmationAccepted: boolean;
    liveInitialCapitalUsdt: number;
    liveDurationDays: number;
    liveMaxDrawdownUsdt: number;
    liveDailyLossUsdt: number;
    liveMaxPositionNotionalUsdt: number;
    liveMaxGrossNotionalPct: number;
    liveMaxConcurrentPositions: number;
    liveMaxTradesPerDay: number;
    liveAllowedSymbols: string[];
    requireIpWhitelist: boolean;
    allowNoIpWhitelist: boolean;
  };
  settings: {
    enabled: boolean;
    startedAt: string | null;
    updatedAt: string;
  };
  runtime: BitgetRuntimeState;
  logs: Array<{
    id: string;
    symbol: string;
    bitgetSymbol: string;
    action: string;
    side: string;
    quantity: number;
    bitgetSize: string | null;
    status: "SUCCESS" | "ERROR" | "SKIPPED";
    bitgetOrderId: string | null;
    message: string;
    attempts: number;
    updatedAt: string;
  }>;
};


type SecurityResult = {
  permissions: string[];
  ipWhitelist: string[];
  withdrawalPermission: boolean;
  tradingPermission: boolean;
  managementPermission: boolean;
  safeForLiveExperiment: boolean;
  message: string;
};

type TestResult = {
  availableUsdt: number;
  equityUsdt: number;
  bonusUsdt?: number;
  demoFundsUsdt?: number;
  detectedUsdt?: number;
  fundingAvailableUsdt?: number;
  fundingBalanceUsdt?: number;
  balanceSource?: string;
  balanceNote?: string;
  apiMode: "UTA_V3";
  accountMode: string;
  accountLevel: string;
  holdMode: string;
  symbols: Array<{
    symbol: string;
    available: boolean;
    minTradeNum: number;
    sizeMultiplier: number;
    symbolStatus: string;
  }>;
};

async function parseJson<T>(res: Response, label: string): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${label}返回格式异常（HTTP ${res.status}）`);
  }
}

function time(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("zh-CN");
}

function seconds(value: number | null): string {
  if (value == null) return "—";
  if (value < 60) return `${value}秒`;
  return `${Math.floor(value / 60)}分${value % 60}秒`;
}

function runtimeBadge(runtime: BitgetRuntimeState): {
  label: string;
  variant: "success" | "warning" | "danger" | "outline";
} {
  if (runtime.paused) return { label: "已暂停", variant: "danger" };
  if (runtime.serverHealthy) return { label: "服务器运行正常", variant: "success" };
  if (runtime.running) return { label: "正在执行", variant: "warning" };
  return { label: "等待正常心跳", variant: "warning" };
}

export function BitgetDemoClient({ initial }: { initial: BitgetAdminDashboard }) {
  const [dashboard, setDashboard] = useState(initial);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [securityResult, setSecurityResult] = useState<SecurityResult | null>(null);
  const [smokeResult, setSmokeResult] = useState<BitgetSmokeTestReport | null>(null);
  const [failureAudit, setFailureAudit] = useState<BitgetFailedOrderAuditReport | null>(null);
  const [smokeConfirmation, setSmokeConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const busyRef = useRef(false);

  async function refresh(silent = false) {
    try {
      const res = await fetch("/api/admin/bitget-demo/status", { cache: "no-store" });
      const json = await parseJson<BitgetAdminDashboard & { error?: string }>(res, "Bitget状态");
      if (!res.ok || json.error) throw new Error(json.error || "读取失败");
      setDashboard(json);
    } catch (error) {
      if (!silent) throw error;
    }
  }

  async function testConnection() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/bitget-demo/test", { method: "POST" });
      const json = await parseJson<{ error?: string; connection?: TestResult; security?: SecurityResult | null }>(
        res,
        "连接测试"
      );
      if (!res.ok || json.error || !json.connection) {
        throw new Error(json.error || "连接测试失败");
      }
      setTestResult(json.connection);
      setSecurityResult(json.security ?? null);
      const detected =
        json.connection.detectedUsdt ??
        json.connection.demoFundsUsdt ??
        json.connection.availableUsdt ??
        0;
      const liveMode = dashboard.environment.mode === "LIVE_EXPERIMENT";
      setMessage(
        detected > 0
          ? `Bitget ${liveMode ? "实盘" : "Demo"}连接成功，检测到${detected.toLocaleString("en-US")} USDT${liveMode ? "账户权益" : "模拟资金"}；本次没有下单。`
          : `Bitget ${liveMode ? "实盘" : "Demo"}连接成功，但没有检测到${liveMode ? "可用权益" : "模拟资金"}；本次没有下单。`
      );
      await refresh(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "连接测试失败");
    } finally {
      setLoading(false);
    }
  }

  async function setEnabled(enabled: boolean) {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/bitget-demo/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const json = await parseJson<{ error?: string }>(res, "镜像设置");
      if (!res.ok || json.error) throw new Error(json.error || "设置失败");
      await refresh();
      setMessage(
        enabled
          ? "Bitget Demo镜像已开启；真正执行由Vercel服务器Cron负责，不依赖本页面一直打开。"
          : "Bitget Demo镜像已停止。"
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  async function syncNow() {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/bitget-demo/sync", { method: "POST" });
      const json = await parseJson<{
        error?: string;
        result?: {
          processed: number;
          success: number;
          skipped: number;
          errors: number;
        };
        dashboard?: BitgetAdminDashboard;
      }>(res, "订单同步");
      if (!res.ok || json.error || !json.result) {
        throw new Error(json.error || "同步失败");
      }
      if (json.dashboard) setDashboard(json.dashboard);
      setMessage(
        `处理${json.result.processed}笔：成功${json.result.success}，跳过${json.result.skipped}，失败${json.result.errors}`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "同步失败");
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }

  async function runtimeAction(action: "RUN_NOW" | "PAUSE" | "RESUME") {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/bitget-demo/runtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: action === "PAUSE" ? "管理员从后台手动暂停" : undefined,
        }),
      });
      const json = await parseJson<{
        error?: string;
        state?: BitgetRuntimeState;
        report?: { message?: string };
      }>(res, "服务器执行操作");
      if (!res.ok || json.error) throw new Error(json.error || "操作失败");
      if (json.state) setDashboard((current) => ({ ...current, runtime: json.state! }));
      await refresh(true);
      setMessage(
        action === "RUN_NOW"
          ? json.report?.message || "服务器执行链路已手动运行一次。"
          : action === "PAUSE"
            ? "服务器新订单执行已暂停，行情和账户对账仍会继续。"
            : "服务器执行已恢复。"
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  async function verifyFailedOrders() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/bitget-demo/verify-failed-orders", { method: "POST" });
      const json = await parseJson<{ error?: string; report?: BitgetFailedOrderAuditReport }>(res, "失败订单核对");
      if (!res.ok || json.error || !json.report) throw new Error(json.error || "失败订单核对失败");
      setFailureAudit(json.report);
      setMessage(json.report.summary);
      await refresh(true);
    } catch (error) {
      setFailureAudit(null);
      setMessage(error instanceof Error ? error.message : "失败订单核对失败");
    } finally {
      setLoading(false);
    }
  }

  async function runSmokeTest() {
    setLoading(true);
    setMessage("");
    setSmokeResult(null);
    try {
      const res = await fetch("/api/admin/bitget-demo/smoke-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: smokeConfirmation,
          symbol: "BTCUSDT",
        }),
      });
      const json = await parseJson<{
        error?: string;
        report?: BitgetSmokeTestReport;
      }>(res, "受控测试订单");
      if (!res.ok || json.error || !json.report) {
        throw new Error(json.error || "受控测试失败");
      }
      setSmokeResult(json.report);
      setMessage("Bitget Demo受控测试已完成：最小仓位开仓后立即平仓，最终持仓为0。");
      setSmokeConfirmation("");
      await refresh(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "受控测试失败");
      await refresh(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(true), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const runtimeStatus = runtimeBadge(dashboard.runtime);
  const stats = dashboard.runtime.decisionStatsToday;
  const live = dashboard.environment.mode === "LIVE_EXPERIMENT";

  if (live) {
    const experiment = dashboard.runtime.liveExperiment;
    const statusLabel = experiment?.status === "ACTIVE"
      ? "运行中"
      : experiment?.status === "COMPLETED"
        ? "已结束"
        : experiment?.status === "STOPPED"
          ? "已停止"
          : "待启动";
    const securitySafe = securityResult?.safeForLiveExperiment ?? Boolean(experiment?.securityMessage && !experiment.stopReason);
    const autoOrderPaused = dashboard.runtime.paused && dashboard.runtime.pauseSource === "AUTO_ORDER";
    const autoApiPaused = dashboard.runtime.paused && (dashboard.runtime.pauseSource === "AUTO_API" || dashboard.runtime.pauseSource === "AUTO");
    const canRunNow = !dashboard.runtime.paused;
    const canResume = dashboard.runtime.paused && !autoApiPaused && (!autoOrderPaused || Boolean(failureAudit?.safeToConsiderResume));
    return (
      <div className="space-y-6">
        {message ? (
          <Card padding="md" className="border-primary/25 bg-primary/[0.04]">
            <Text variant="body-sm">{message}</Text>
          </Card>
        ) : null}

        <Card padding="lg" className="space-y-5 border-red-400/25 bg-red-400/[0.025]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Heading size="h3">实盘实验运行状态</Heading>
              <Text variant="body-sm" color="secondary" className="mt-2 block max-w-4xl">
                30天实验由Vercel服务器定时运行；关闭电脑不会停止。10个USDT合约品种全部自动分析，逐仓杠杆不超过2倍；每天最多新开10笔、最多同时持有10个仓位，但不会强行凑单。
              </Text>
            </div>
            <Badge variant={experiment?.status === "ACTIVE" ? "success" : experiment?.status === "STOPPED" ? "danger" : "warning"}>{statusLabel}</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">今日盈亏</Text><Text variant="body" weight="semibold" className={`mt-1 block ${(experiment?.dailyPnlUsdt ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(experiment?.dailyPnlUsdt, " USDT")} · {signed(experiment?.dailyPnlPct, "%")}</Text></div>
            <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">累计盈亏</Text><Text variant="body" weight="semibold" className={`mt-1 block ${(experiment?.pnlUsdt ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(experiment?.pnlUsdt, " USDT")} · {signed(experiment?.pnlPct, "%")}</Text></div>
            <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">当前权益</Text><Text variant="body" weight="semibold" className="mt-1 block">{experiment?.currentEquityUsdt?.toFixed(2) ?? "—"} USDT</Text></div>
            <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">初始本金</Text><Text variant="body" weight="semibold" className="mt-1 block">{experiment?.initialEquityUsdt?.toFixed(2) ?? dashboard.environment.liveInitialCapitalUsdt.toFixed(2)} USDT</Text></div>
            <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">最大回撤</Text><Text variant="body" weight="semibold" className="mt-1 block text-red-300">{signed(experiment?.maxDrawdownUsdt, " USDT")} · {signed(experiment?.maxDrawdownPct, "%")}</Text></div>
            <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">结束时间</Text><Text variant="body-sm" className="mt-1 block">{time(experiment?.endsAt ?? null)}</Text></div>
          </div>

          {dashboard.runtime.paused ? (
            <div className="rounded-lg border border-red-400/25 bg-red-400/[0.05] p-4 space-y-2">
              <Text variant="body-sm" className="text-red-200">已暂停：{dashboard.runtime.pauseReason || "等待服务器健康检查"}</Text>
              {dashboard.runtime.pauseSource === "AUTO_API" || dashboard.runtime.pauseSource === "AUTO" ? (
                <Text variant="caption" className="block text-amber-100/80">临时接口异常会继续重试；连续2轮行情和账户恢复正常后自动解除，无需手动点击恢复。</Text>
              ) : dashboard.runtime.pauseSource === "AUTO_ORDER" ? (
                <Text variant="caption" className="block text-red-100/80">这是订单写入错误保护。先使用下方“核对失败订单（只读、不下单）”确认 clientOid、订单、持仓和策略单；核对完成前不提供恢复按钮。</Text>
              ) : null}
            </div>
          ) : null}
          {experiment?.stopReason ? <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.04] p-4"><Text variant="body-sm" className="text-amber-200">{experiment.stopReason}</Text></div> : null}
          {dashboard.runtime.lastError ? (
            <div className="rounded-lg border border-red-400/20 bg-red-400/[0.035] p-4 space-y-1">
              <Text variant="caption" className="block text-red-100/75">最近交易/执行错误</Text>
              <Text variant="body-sm" className="block text-red-200 break-words">{dashboard.runtime.lastError}</Text>
              <Text variant="caption" className="block text-white/45">只有真实远端下单写入失败才累计“订单错误”；规格、最小金额、风险预算等下单前拦截不会触发自动暂停。</Text>
            </div>
          ) : null}
          {dashboard.runtime.recentExecutionFailures?.length ? (
            <div className="rounded-lg border border-red-400/20 bg-red-400/[0.025] p-4 space-y-3">
              <div>
                <Text variant="caption" className="block text-red-100/75">最近失败订单 / 执行发件箱</Text>
                <Text variant="caption" className="mt-1 block text-white/45">独立于最近事件20条，不会因为普通心跳把根因冲掉。仅显示脱敏字段。</Text>
              </div>
              <div className="space-y-2">
                {dashboard.runtime.recentExecutionFailures.slice(0, 10).map((item) => (
                  <div key={item.outboxId} className="rounded-md border border-white/10 bg-black/20 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={item.stage === "REMOTE_ORDER_WRITE" ? "danger" : item.stage === "AMBIGUOUS_WRITE" ? "warning" : "outline"}>{item.stage}</Badge>
                      <Text variant="body-sm" weight="semibold">{item.symbol} · {item.action}</Text>
                      <Text variant="caption" color="tertiary">attempt {item.attemptCount}</Text>
                    </div>
                    <Text variant="caption" className="mt-2 block text-white/60 break-words">clientOid {item.clientOid || "—"} · code {item.bitgetCode || "—"} · HTTP {item.httpStatus ?? "—"}</Text>
                    <Text variant="caption" className="mt-1 block text-red-100/75 break-words">{item.lastError || "—"}</Text>
                    <Text variant="caption" color="tertiary" className="mt-1 block">{time(item.updatedAt)}</Text>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {dashboard.runtime.lastMarketError || dashboard.runtime.lastAccountError ? (
            <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.03] p-4 space-y-1">
              {dashboard.runtime.lastMarketError ? <Text variant="caption" className="block text-amber-100/80">行情接口：{dashboard.runtime.lastMarketError}</Text> : null}
              {dashboard.runtime.lastAccountError ? <Text variant="caption" className="block text-amber-100/80">账户接口：{dashboard.runtime.lastAccountError}</Text> : null}
            </div>
          ) : null}
          {typeof dashboard.runtime.lastReport?.message === "string" ? (
            <div className="rounded-lg border border-primary/20 bg-primary/[0.035] p-4">
              <Text variant="caption" color="tertiary" className="block">最近一轮自动判断</Text>
              <Text variant="body-sm" className="mt-1 block">{String(dashboard.runtime.lastReport.message)}</Text>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">服务器心跳</Text><Text variant="body-sm" className="mt-1 block">{time(dashboard.runtime.lastHeartbeatAt)}</Text><Text variant="caption" color="tertiary" className="mt-1 block">距今 {seconds(dashboard.runtime.heartbeatAgeSeconds)}</Text></div>
            <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">行情</Text><Text variant="body-sm" className="mt-1 block">{time(dashboard.runtime.lastMarketAt)}</Text><Text variant="caption" color="tertiary" className="mt-1 block">接口延迟 {seconds(dashboard.runtime.quoteAgeSeconds)} · 新鲜报价 {dashboard.runtime.freshQuotesCount ?? 0}/{dashboard.runtime.totalSymbols ?? 0}</Text></div>
            <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">账户连接</Text><Text variant="body-sm" className="mt-1 block">{dashboard.runtime.account.connected ? "正常" : "未正常连接"}</Text></div>
            <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">当前持仓</Text><Text variant="body-sm" className="mt-1 block">{dashboard.runtime.account.positionsCount} 个</Text></div>
            <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">API密钥</Text><Text variant="body-sm" className="mt-1 block">{dashboard.environment.configured ? dashboard.environment.apiKeyMasked : "未配置"}</Text></div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={testConnection} isLoading={loading}>检查账户与API权限（不下单）</Button>
            {dashboard.runtime.paused && dashboard.runtime.pauseSource === "AUTO_ORDER" ? (
              <Button type="button" variant="outline" onClick={verifyFailedOrders} isLoading={loading}>核对失败订单（只读、不下单）</Button>
            ) : null}
            {canRunNow ? (
              <Button type="button" variant="outline" onClick={() => void runtimeAction("RUN_NOW")} isLoading={loading}>立即运行一次</Button>
            ) : null}
            {canResume ? (
              <Button type="button" variant="primary" onClick={() => void runtimeAction("RESUME")} isLoading={loading}>恢复运行</Button>
            ) : !dashboard.runtime.paused ? (
              <Button type="button" variant="danger" onClick={() => void runtimeAction("PAUSE")} isLoading={loading}>紧急暂停新开仓</Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => void refresh(false)} isLoading={loading}>刷新状态</Button>
          </div>
          {failureAudit ? (
            <div className={`rounded-lg border p-4 ${failureAudit.safeToConsiderResume ? "border-emerald-400/25 bg-emerald-400/[0.035]" : "border-amber-400/25 bg-amber-400/[0.035]"}`}>
              <Text variant="body-sm" weight="semibold">失败订单只读核对：{failureAudit.safeToConsiderResume ? "未发现现存订单/持仓/策略单" : "仍有不确定项或现存交易状态"}</Text>
              <Text variant="caption" className="mt-2 block text-white/60">{failureAudit.summary}</Text>
              <Text variant="caption" className="mt-1 block text-white/45">核对时间 {time(failureAudit.checkedAt)} · 持仓 {failureAudit.positionsCount ?? "?"} · 策略单 {failureAudit.pendingStrategyOrdersCount ?? "?"}</Text>
              <div className="mt-3 space-y-2">
                {failureAudit.items.slice(0, 10).map((item) => (
                  <div key={item.outboxId} className="rounded-md border border-white/10 bg-black/20 p-3">
                    <Text variant="caption" className="block text-white/80">{item.symbol} · {item.action} · {item.failureStage} · clientOid {item.clientOid || "—"}</Text>
                    <Text variant="caption" className="mt-1 block text-white/55">order-info {item.orderLookup}{item.orderStatus ? ` (${item.orderStatus})` : ""} · position {item.positionPresent ? "FOUND" : "ABSENT"} · strategy {item.strategyOrderPresent ? "FOUND" : "ABSENT"}</Text>
                    {item.queryError ? <Text variant="caption" className="mt-1 block text-red-200">{item.queryError}</Text> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <Card padding="lg" className="space-y-4">
          <Heading size="h3">启动前安全检查</Heading>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">实盘总开关</Text><Text variant="body-sm" className="mt-1 block">{dashboard.environment.executionAllowed ? "已开启" : "未开启"}</Text></div>
            <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">真实亏损确认</Text><Text variant="body-sm" className="mt-1 block">{dashboard.environment.liveConfirmationAccepted ? "已确认" : "未确认"}</Text></div>
            <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">提币权限</Text><Text variant="body-sm" className={`mt-1 block ${securityResult?.withdrawalPermission ? "text-red-300" : ""}`}>{securityResult ? (securityResult.withdrawalPermission ? "危险：已开启" : "未开启") : "点击安全检查读取"}</Text></div>
          </div>
          <Text variant="body-sm" className={securityResult && !securitySafe ? "text-red-300" : "text-white/60"}>{securityResult?.message || experiment?.securityMessage || "配置完成后点击上方安全检查。只有无提币权限并具备UTA交易与管理权限时才允许新的实盘开仓。"}</Text>
        </Card>

        {testResult ? (
          <Card padding="lg" className="space-y-3">
            <Heading size="h3">账户检查结果</Heading>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">可用USDT</Text><Text variant="body" weight="semibold" className="mt-1 block">{testResult.availableUsdt.toFixed(2)}</Text></div>
              <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">账户权益</Text><Text variant="body" weight="semibold" className="mt-1 block">{testResult.equityUsdt.toFixed(2)}</Text></div>
              <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">账户模式</Text><Text variant="body-sm" className="mt-1 block">{testResult.accountMode} · {testResult.accountLevel}</Text></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {dashboard.environment.liveAllowedSymbols.map((symbol) => {
                const instrument = testResult.symbols.find((row) => row.symbol === symbol);
                return (
                  <div key={symbol} className={`rounded-lg border p-3 ${instrument?.available ? "border-emerald-400/20" : "border-red-400/25"}`}>
                    <Text variant="caption" color="tertiary">{LIVE_ASSET_LABELS[symbol] ?? symbol}</Text>
                    <Text variant="body-sm" className={`mt-1 block ${instrument?.available ? "text-emerald-300" : "text-red-300"}`}>{symbol} · {instrument?.available ? "可交易" : "不可交易"}</Text>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        <Card padding="lg" className="space-y-4">
          <Heading size="h3">最近安全与订单事件</Heading>
          {dashboard.runtime.recentEvents.length ? dashboard.runtime.recentEvents.slice(0, 15).map((event) => (
            <div key={event.id} className="rounded-lg border border-white/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><Text variant="body-sm" weight="semibold">{event.action}{event.symbol ? ` · ${event.symbol}` : ""}</Text><Badge variant={event.level === "ERROR" ? "danger" : event.level === "WARNING" ? "warning" : event.level === "SUCCESS" ? "success" : "outline"}>{event.level}</Badge></div>
              <Text variant="caption" color="secondary" className="mt-2 block">{event.message}</Text>
              <Text variant="caption" color="tertiary" className="mt-1 block">{time(event.createdAt)}</Text>
            </div>
          )) : <Text variant="body-sm" color="secondary">启动服务器运行后，这里会显示安全检查、拦截、订单与平仓记录。</Text>}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message ? (
        <Card padding="md" className="border-primary/25 bg-primary/[0.04]">
          <Text variant="body-sm">{message}</Text>
        </Card>
      ) : null}

      <Card padding="lg" className="space-y-5 border-primary/20 bg-primary/[0.025]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Heading size="h3">24小时服务器执行链路</Heading>
            <Text variant="body-sm" color="secondary" className="mt-2 block max-w-4xl">
              Vercel Cron每分钟在服务器运行：读取Bitget行情、检查策略、镜像Demo订单、回查持仓并写入审计日志。浏览器只显示状态，关闭电脑不会停止。
            </Text>
          </div>
          <Badge variant={runtimeStatus.variant}>{runtimeStatus.label}</Badge>
        </div>

        {dashboard.runtime.paused ? (
          <div className="rounded-lg border border-red-400/25 bg-red-400/[0.05] p-4">
            <Text variant="body-sm" className="text-red-200">
              暂停原因：{dashboard.runtime.pauseReason || "等待管理员检查"}
            </Text>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">最近服务器心跳</Text>
            <Text variant="body-sm" className="mt-1 block">{time(dashboard.runtime.lastHeartbeatAt)}</Text>
            <Text variant="caption" color="tertiary" className="mt-1 block">距今 {seconds(dashboard.runtime.heartbeatAgeSeconds)}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">最近Bitget行情</Text>
            <Text variant="body-sm" className="mt-1 block">{time(dashboard.runtime.lastMarketAt)}</Text>
            <Text variant="caption" color="tertiary" className="mt-1 block">延迟 {seconds(dashboard.runtime.quoteAgeSeconds)}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">最近策略检查</Text>
            <Text variant="body-sm" className="mt-1 block">{time(dashboard.runtime.lastStrategyAt)}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">最近账户对账</Text>
            <Text variant="body-sm" className="mt-1 block">{time(dashboard.runtime.lastReconcileAt)}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">Demo账户状态</Text>
            <Text variant="body-sm" className="mt-1 block">
              {dashboard.runtime.account.connected ? "已连接" : "未正常连接"}
            </Text>
            <Text variant="caption" color="tertiary" className="mt-1 block">
              持仓 {dashboard.runtime.account.positionsCount} · 止盈止损单 {dashboard.runtime.account.pendingStrategyOrdersCount}
            </Text>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {dashboard.runtime.latestQuotes.map((quote) => (
            <div key={quote.symbol} className="rounded-lg border border-white/10 p-3">
              <Text variant="caption" color="tertiary">{quote.symbol}</Text>
              <Text variant="body" weight="semibold" className="mt-1 block">
                {quote.price.toLocaleString("en-US", { maximumFractionDigits: 6 })}
              </Text>
              <Text variant="caption" color="tertiary" className="mt-1 block">{time(quote.capturedAt)}</Text>
            </div>
          ))}
          {!dashboard.runtime.latestQuotes.length ? (
            <div className="rounded-lg border border-white/10 p-3">
              <Text variant="body-sm" color="secondary">尚无有效Bitget报价。</Text>
            </div>
          ) : null}
        </div>

      </Card>

      <Card padding="lg" className="space-y-4">
        <div>
          <Heading size="h3">今日服务器策略审计</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 block">
            零交易不等于系统停止；这里显示每次没有下单的具体原因。
          </Text>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">策略运行</Text><Heading size="h3" className="mt-1">{stats.scanRuns}</Heading></div>
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">币种判断</Text><Heading size="h3" className="mt-1">{stats.symbolsEvaluated}</Heading></div>
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">置信度不足</Text><Heading size="h3" className="mt-1">{stats.confidenceBlocked}</Heading></div>
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">周期不一致</Text><Heading size="h3" className="mt-1">{stats.alignmentBlocked}</Heading></div>
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">等待技术触发</Text><Heading size="h3" className="mt-1">{stats.triggerWaiting}</Heading></div>
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">风控拦截</Text><Heading size="h3" className="mt-1">{stats.riskBlocked}</Heading></div>
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">行情异常</Text><Heading size="h3" className="mt-1">{stats.marketErrors}</Heading></div>
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">订单尝试</Text><Heading size="h3" className="mt-1">{stats.orderAttempts}</Heading></div>
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">已触发开仓</Text><Heading size="h3" className="mt-1">{stats.executed}</Heading></div>
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">连续接口/订单错误</Text><Heading size="h3" className="mt-1">{dashboard.runtime.consecutiveApiErrors} / {dashboard.runtime.consecutiveOrderErrors}</Heading></div>
        </div>
      </Card>

      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Heading size="h3">Bitget Demo连接与镜像开关</Heading>
            <Text variant="body-sm" color="secondary" className="mt-2 block">
              只连接Bitget模拟盘；所有REST私有请求强制携带 paptrading: 1。密钥只保存在Vercel环境变量。
            </Text>
          </div>
          <Badge variant="outline">{dashboard.settings.enabled ? "镜像运行中" : "镜像未开启"}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">Demo密钥</Text><Text variant="body-sm" className="mt-1 block">{dashboard.environment.configured ? dashboard.environment.apiKeyMasked : "未配置"}</Text></div>
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">下单总开关</Text><Text variant="body-sm" className="mt-1 block">{dashboard.environment.executionAllowed ? "允许Demo下单" : "环境变量未开启"}</Text></div>
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">模式</Text><Text variant="body-sm" className="mt-1 block">UTA V3 · 逐仓 · {dashboard.environment.leverage}倍</Text></div>
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">镜像开始时间</Text><Text variant="body-sm" className="mt-1 block">{time(dashboard.settings.startedAt)}</Text></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={testConnection} isLoading={loading}>测试连接（不下单）</Button>
          {dashboard.settings.enabled ? (
            <Button type="button" variant="danger" onClick={() => void setEnabled(false)} isLoading={loading}>紧急停止镜像</Button>
          ) : (
            <Button type="button" variant="primary" onClick={() => void setEnabled(true)} isLoading={loading}>开始镜像新订单</Button>
          )}
          <Button type="button" variant="outline" onClick={() => void syncNow()} isLoading={loading}>手动同步一次</Button>
        </div>
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.035] p-4">
          <Text variant="body-sm" className="text-amber-100">两套账本已明确区分</Text>
          <Text variant="caption" color="secondary" className="mt-2 block leading-relaxed">
            MOOX站内模拟盘负责产生策略与内部模拟成交；Bitget Demo是交易所模拟环境的实际订单账本。会员交易台只统计Bitget Demo，不再把站内模拟成交当成Bitget成交。
          </Text>
        </div>
      </Card>

      {testResult ? (
        <Card padding="lg" className="space-y-4">
          <Heading size="h3">连接测试结果</Heading>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-primary/25 bg-primary/[0.04] p-3">
              <Text variant="caption" color="tertiary">检测到的模拟资金</Text>
              <Heading size="h3" className="mt-2">{(testResult.detectedUsdt ?? testResult.demoFundsUsdt ?? testResult.availableUsdt).toLocaleString("en-US")}</Heading>
              <Text variant="caption" color="secondary" className="mt-1 block">{testResult.balanceSource ?? "UTA交易账户"}</Text>
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <Text variant="caption" color="tertiary">账户权益</Text>
              <Heading size="h3" className="mt-2">{testResult.equityUsdt.toLocaleString("en-US")}</Heading>
              <Text variant="caption" color="secondary" className="mt-1 block">Bitget UTA接口口径</Text>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {testResult.symbols.map((row) => (
              <div key={row.symbol} className="rounded-lg border border-white/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Text variant="body-sm" weight="semibold">{row.symbol}</Text>
                  <Badge variant="outline">{row.available ? "可用" : "不可用"}</Badge>
                </div>
                <Text variant="caption" color="tertiary" className="mt-2 block">最小量 {row.minTradeNum || "—"} · 步长 {row.sizeMultiplier || "—"}</Text>
                {!row.available ? <Text variant="caption" className="mt-1 block text-amber-200/80">{row.symbolStatus}</Text> : null}
              </div>
            ))}
          </div>
          {testResult.balanceNote ? <Text variant="caption" className="block text-amber-200/80">{testResult.balanceNote}</Text> : null}
        </Card>
      ) : null}

      <Card padding="lg" className="space-y-4 border-red-400/20">
        <div>
          <Heading size="h3">TEST_ONLY受控Demo订单</Heading>
          <Text variant="body-sm" color="secondary" className="mt-2 block max-w-4xl">
            默认关闭。开启环境变量后，管理员可用BTC最小模拟仓位验证“开仓→查询持仓→提交并撤销交易所止盈止损→平仓→持仓归零”。只允许Demo API，不会连接真钱账户。
          </Text>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className={inputClass}
            value={smokeConfirmation}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setSmokeConfirmation(event.target.value)}
            placeholder="输入 BITGET_DEMO_TEST_ONLY"
            disabled={!dashboard.environment.testOrderAllowed || loading}
          />
          <Button
            type="button"
            variant="danger"
            onClick={() => void runSmokeTest()}
            disabled={!dashboard.environment.testOrderAllowed || smokeConfirmation !== "BITGET_DEMO_TEST_ONLY"}
            isLoading={loading}
          >
            执行最小Demo开平仓测试
          </Button>
        </div>
        <Text variant="caption" className="block text-amber-200/80">
          环境变量 BITGET_DEMO_TEST_ORDER_ALLOWED：{dashboard.environment.testOrderAllowed ? "已开启" : "未开启（安全默认）"}。已有BTC持仓时系统会拒绝测试。
        </Text>
        {smokeResult ? (
          <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/[0.04] p-4">
            <Text variant="body-sm" className="text-emerald-200">测试通过 · {smokeResult.symbol} · 数量 {smokeResult.quantity}</Text>
            <Text variant="caption" color="secondary" className="mt-2 block">开仓订单 {smokeResult.openOrderId} · 保护单 {smokeResult.protectionOrderId} · 平仓订单 {smokeResult.closeOrderId} · 最终持仓 {smokeResult.finalPositionCount}</Text>
          </div>
        ) : null}
      </Card>

      <Card padding="lg" className="space-y-4">
        <div>
          <Heading size="h3">服务器审计事件</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 block">记录行情、策略拦截、订单、对账和错误，不公开API密钥。</Text>
        </div>
        {dashboard.runtime.recentEvents.length ? (
          <div className="space-y-2">
            {dashboard.runtime.recentEvents.slice(0, 25).map((event) => (
              <div key={event.id} className="rounded-lg border border-white/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Text variant="body-sm" weight="semibold">{event.stage} · {event.action}{event.symbol ? ` · ${event.symbol}` : ""}</Text>
                  <Badge variant={event.level === "ERROR" ? "danger" : event.level === "WARNING" ? "warning" : event.level === "SUCCESS" ? "success" : "outline"}>{event.level}</Badge>
                </div>
                <Text variant="caption" color="secondary" className="mt-2 block">{event.message}</Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">{time(event.createdAt)}</Text>
              </div>
            ))}
          </div>
        ) : <Text variant="body-sm" color="secondary">服务器运行后会在这里生成审计记录。</Text>}
      </Card>

      <Card padding="lg" className="space-y-4">
        <div>
          <Heading size="h3">最近Bitget Demo镜像记录</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 block">这里只展示实际发送到Bitget Demo的订单结果。</Text>
        </div>
        {dashboard.logs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-white/45"><tr><th className="px-3 py-2">时间</th><th className="px-3 py-2">品种</th><th className="px-3 py-2">动作</th><th className="px-3 py-2">数量</th><th className="px-3 py-2">状态</th><th className="px-3 py-2">Bitget订单</th><th className="px-3 py-2">说明</th></tr></thead>
              <tbody>
                {dashboard.logs.map((row) => (
                  <tr key={row.id} className="border-t border-white/10">
                    <td className="px-3 py-3">{time(row.updatedAt)}</td><td className="px-3 py-3">{row.bitgetSymbol}</td><td className="px-3 py-3">{row.action} / {row.side}</td><td className="px-3 py-3">{row.bitgetSize ?? row.quantity}</td><td className="px-3 py-3">{row.status}</td><td className="px-3 py-3">{row.bitgetOrderId ?? "—"}</td><td className="px-3 py-3">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Text variant="body-sm" color="secondary">尚无Bitget Demo镜像订单。</Text>}
      </Card>
    </div>
  );
}
