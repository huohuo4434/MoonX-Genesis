"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";

type Dashboard = {
  environment: {
    configured: boolean;
    executionAllowed: boolean;
    apiKeyMasked: string;
    leverage: number;
  };
  settings: {
    enabled: boolean;
    startedAt: string | null;
    updatedAt: string;
  };
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

export function BitgetDemoClient({ initial }: { initial: Dashboard }) {
  const [dashboard, setDashboard] = useState(initial);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const busyRef = useRef(false);

  async function refresh() {
    const res = await fetch("/api/admin/bitget-demo/status", { cache: "no-store" });
    const json = await parseJson<Dashboard & { error?: string }>(res, "Bitget状态");
    if (!res.ok || json.error) throw new Error(json.error || "读取失败");
    setDashboard(json);
  }

  async function testConnection() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/bitget-demo/test", { method: "POST" });
      const json = await parseJson<{
        error?: string;
        connection?: TestResult;
      }>(res, "连接测试");
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
          ? `Bitget Demo连接成功，已读取${detected.toLocaleString("en-US")} USDT模拟资金，没有下单。`
          : "Bitget Demo连接成功，但当前仍未检测到模拟资金，没有下单。"
      );
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
          ? "Bitget Demo镜像已开启，只同步开启时间之后的新模拟订单。"
          : "Bitget Demo镜像已停止。"
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  async function syncNow(silent = false) {
    if (busyRef.current) return;
    busyRef.current = true;
    if (!silent) {
      setLoading(true);
      setMessage("");
    }
    try {
      const res = await fetch("/api/admin/bitget-demo/sync", { method: "POST" });
      const json = await parseJson<{
        error?: string;
        result?: {
          processed: number;
          success: number;
          skipped: number;
          errors: number;
          messages: string[];
        };
        dashboard?: Dashboard;
      }>(res, "订单同步");
      if (!res.ok || json.error || !json.result) {
        throw new Error(json.error || "同步失败");
      }
      if (json.dashboard) setDashboard(json.dashboard);
      if (!silent || json.result.processed > 0) {
        setMessage(
          `处理${json.result.processed}笔：成功${json.result.success}，跳过${json.result.skipped}，失败${json.result.errors}`
        );
      }
    } catch (error) {
      if (!silent) setMessage(error instanceof Error ? error.message : "同步失败");
    } finally {
      busyRef.current = false;
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (!dashboard.settings.enabled) return;
    const timer = window.setInterval(() => void syncNow(true), 30_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard.settings.enabled]);

  return (
    <div className="space-y-6">
      {message ? (
        <Card padding="md" className="border-primary/25 bg-primary/[0.04]">
          <Text variant="body-sm">{message}</Text>
        </Card>
      ) : null}

      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Heading size="h3">连接状态</Heading>
            <Text variant="body-sm" color="secondary" className="mt-2 block">
              只连接Bitget模拟盘。密钥保存在Vercel服务器环境变量，不会显示在网页中。
            </Text>
          </div>
          <Badge variant="outline">
            {dashboard.settings.enabled ? "镜像运行中" : "尚未开启"}
          </Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">密钥</Text>
            <Text variant="body-sm" className="mt-1 block">
              {dashboard.environment.configured ? dashboard.environment.apiKeyMasked : "未配置"}
            </Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">下单总开关</Text>
            <Text variant="body-sm" className="mt-1 block">
              {dashboard.environment.executionAllowed ? "允许Demo下单" : "环境变量未开启"}
            </Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">模式</Text>
            <Text variant="body-sm" className="mt-1 block">UTA V3 · 逐仓 · {dashboard.environment.leverage}倍</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">开始时间</Text>
            <Text variant="body-sm" className="mt-1 block">
              {dashboard.settings.startedAt ? new Date(dashboard.settings.startedAt).toLocaleString("zh-CN") : "尚未开始"}
            </Text>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={testConnection} isLoading={loading}>
            测试连接（不下单）
          </Button>
          {dashboard.settings.enabled ? (
            <Button type="button" variant="danger" onClick={() => void setEnabled(false)} isLoading={loading}>
              紧急停止镜像
            </Button>
          ) : (
            <Button type="button" variant="primary" onClick={() => void setEnabled(true)} isLoading={loading}>
              开始镜像新订单
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => void syncNow(false)} isLoading={loading}>
            立即同步一次
          </Button>
        </div>
        <Text variant="caption" className="block text-amber-200/80">
          开启后只同步“开启时间之后”新产生的BTC、ETH、HYPE模拟订单，不会补下之前已存在的HYPE或其他旧持仓。
        </Text>
      </Card>

      {testResult ? (
        <Card padding="lg" className="space-y-4">
          <Heading size="h3">连接测试结果</Heading>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-primary/25 bg-primary/[0.04] p-3">
              <Text variant="caption" color="tertiary">检测到的模拟资金</Text>
              <Heading size="h3" className="mt-2">
                {(testResult.detectedUsdt ?? testResult.demoFundsUsdt ?? testResult.availableUsdt).toLocaleString("en-US")}
              </Heading>
              <Text variant="caption" color="secondary" className="mt-1 block">
                {testResult.balanceSource ?? "UTA交易账户"}
              </Text>
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <Text variant="caption" color="tertiary">账户权益</Text>
              <Heading size="h3" className="mt-2">{testResult.equityUsdt.toLocaleString("en-US")}</Heading>
              <Text variant="caption" color="secondary" className="mt-1 block">
                Bitget UTA接口口径
              </Text>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-white/10 p-3">
              <Text variant="caption" color="tertiary">UTA可用余额</Text>
              <Text variant="body-sm" className="mt-1 block">
                {testResult.availableUsdt.toLocaleString("en-US")}
              </Text>
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <Text variant="caption" color="tertiary">模拟赠金 bonus</Text>
              <Text variant="body-sm" className="mt-1 block">
                {(testResult.bonusUsdt ?? 0).toLocaleString("en-US")}
              </Text>
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <Text variant="caption" color="tertiary">资金账户USDT</Text>
              <Text variant="body-sm" className="mt-1 block">
                {(testResult.fundingBalanceUsdt ?? testResult.fundingAvailableUsdt ?? 0).toLocaleString("en-US")}
              </Text>
            </div>
          </div>
          {testResult.balanceNote ? (
            <Text variant="caption" className="block text-amber-200/80">
              {testResult.balanceNote}
            </Text>
          ) : null}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-white/10 p-3">
              <Text variant="caption" color="tertiary">接口模式</Text>
              <Text variant="body-sm" className="mt-1 block">{testResult.apiMode}</Text>
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <Text variant="caption" color="tertiary">账户模式</Text>
              <Text variant="body-sm" className="mt-1 block">
                {testResult.accountMode} / {testResult.accountLevel}
              </Text>
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <Text variant="caption" color="tertiary">持仓模式</Text>
              <Text variant="body-sm" className="mt-1 block">{testResult.holdMode}</Text>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {testResult.symbols.map((row) => (
              <div key={row.symbol} className="rounded-lg border border-white/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Text variant="body-sm" weight="semibold">{row.symbol}</Text>
                  <Badge variant="outline">{row.available ? "可用" : "不可用"}</Badge>
                </div>
                <Text variant="caption" color="tertiary" className="mt-2 block">
                  最小量 {row.minTradeNum || "—"} · 步长 {row.sizeMultiplier || "—"}
                </Text>
                {!row.available ? (
                  <Text variant="caption" className="mt-1 block text-amber-200/80">{row.symbolStatus}</Text>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card padding="lg" className="space-y-4">
        <div>
          <Heading size="h3">最近镜像记录</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 block">
            MoonX内部模拟订单为主记录；Bitget Demo仅镜像相同方向和数量，不使用真实资金。
          </Text>
        </div>
        {dashboard.logs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-white/45">
                <tr>
                  <th className="px-3 py-2">时间</th>
                  <th className="px-3 py-2">品种</th>
                  <th className="px-3 py-2">动作</th>
                  <th className="px-3 py-2">数量</th>
                  <th className="px-3 py-2">状态</th>
                  <th className="px-3 py-2">Bitget订单</th>
                  <th className="px-3 py-2">说明</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.logs.map((row) => (
                  <tr key={row.id} className="border-t border-white/10">
                    <td className="px-3 py-3">{new Date(row.updatedAt).toLocaleString("zh-CN")}</td>
                    <td className="px-3 py-3">{row.bitgetSymbol}</td>
                    <td className="px-3 py-3">{row.action} / {row.side}</td>
                    <td className="px-3 py-3">{row.bitgetSize ?? row.quantity}</td>
                    <td className="px-3 py-3">{row.status}</td>
                    <td className="px-3 py-3">{row.bitgetOrderId ?? "—"}</td>
                    <td className="px-3 py-3">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Text variant="body-sm" color="secondary">尚无镜像订单。</Text>
        )}
      </Card>
    </div>
  );
}
