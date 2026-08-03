"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import type {
  BitgetRuntimeState,
  BitgetSmokeTestReport,
} from "@/types/bitget-demo-runtime";

const inputClass =
  "min-h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-primary/60";

type Dashboard = {
  environment: {
    configured: boolean;
    executionAllowed: boolean;
    testOrderAllowed: boolean;
    apiKeyMasked: string;
    leverage: number;
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

export function BitgetDemoClient({ initial }: { initial: Dashboard }) {
  const [dashboard, setDashboard] = useState(initial);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [smokeResult, setSmokeResult] = useState<BitgetSmokeTestReport | null>(null);
  const [smokeConfirmation, setSmokeConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const busyRef = useRef(false);

  async function refresh(silent = false) {
    try {
      const res = await fetch("/api/admin/bitget-demo/status", { cache: "no-store" });
      const json = await parseJson<Dashboard & { error?: string }>(res, "Bitget状态");
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
      const json = await parseJson<{ error?: string; connection?: TestResult }>(
        res,
        "连接测试"
      );
      if (!res.ok || json.error || !json.connection) {
        throw new Error(json.error || "连接测试失败");
      }
      setTestResult(json.connection);
      const detected =
        json.connection.detectedUsdt ??
        json.connection.demoFundsUsdt ??
        json.connection.availableUsdt ??
        0;
      setMessage(
        detected > 0
          ? `Bitget Demo连接成功，检测到${detected.toLocaleString("en-US")} USDT模拟资金；本次没有下单。`
          : "Bitget Demo连接成功，但没有检测到模拟资金；本次没有下单。"
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
        dashboard?: Dashboard;
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

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void runtimeAction("RUN_NOW")} isLoading={loading}>
            服务器立即检查一次
          </Button>
          {dashboard.runtime.paused ? (
            <Button type="button" variant="primary" onClick={() => void runtimeAction("RESUME")} isLoading={loading}>
              恢复服务器执行
            </Button>
          ) : (
            <Button type="button" variant="danger" onClick={() => void runtimeAction("PAUSE")} isLoading={loading}>
              暂停新订单执行
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => void refresh(false)} isLoading={loading}>
            刷新状态
          </Button>
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
