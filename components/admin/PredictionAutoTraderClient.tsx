"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import type {
  PredictionAutoDecision,
  PredictionAutoRunReport,
  PredictionAutoTraderDashboard,
} from "@/types/prediction-auto-trader";

const inputClass =
  "min-h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-primary/60";

function setupLabel(value: string): string {
  if (value === "BUY_DIP") return "逢低做多";
  if (value === "SELL_RALLY") return "逢高做空";
  if (value === "MISSING_FORECAST") return "缺少预测";
  return "暂不交易";
}

function directionLabel(value: string): string {
  if (value === "LONG") return "偏多";
  if (value === "SHORT") return "偏空";
  return "中性";
}

function statusVariant(status: string): "success" | "warning" | "danger" | "outline" {
  if (status === "EXECUTED" || status === "MANAGED") return "success";
  if (status === "ERROR" || status === "BLOCKED") return "danger";
  if (status === "WAITING") return "warning";
  return "outline";
}

async function readJson<T>(response: Response, label: string): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${label}返回格式异常（HTTP ${response.status}）`);
  }
}

export function PredictionAutoTraderClient({
  initial,
}: {
  initial: PredictionAutoTraderDashboard;
}) {
  const [dashboard, setDashboard] = useState(initial);
  const [report, setReport] = useState<PredictionAutoRunReport | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const busyRef = useRef(false);

  async function refresh() {
    const response = await fetch("/api/admin/prediction-auto-trader/status", {
      cache: "no-store",
    });
    const json = await readJson<PredictionAutoTraderDashboard & { error?: string }>(
      response,
      "自动交易状态"
    );
    if (!response.ok || json.error) throw new Error(json.error || "读取失败");
    setDashboard(json);
  }

  async function setEnabled(enabled: boolean) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/prediction-auto-trader/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const json = await readJson<{ error?: string }>(response, "自动交易开关");
      if (!response.ok || json.error) throw new Error(json.error || "设置失败");
      await refresh();
      setMessage(enabled ? "预测自动交易已开启。" : "预测自动交易已停止。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/prediction-auto-trader/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          btcEnabled: form.get("btcEnabled") === "on",
          ethEnabled: form.get("ethEnabled") === "on",
          positionPct: Number(form.get("positionPct")),
          stopLossPct: Number(form.get("stopLossPct")),
          target1Pct: Number(form.get("target1Pct")),
          target2Pct: Number(form.get("target2Pct")),
          target3Pct: Number(form.get("target3Pct")),
          minDipPct: Number(form.get("minDipPct")),
          reboundConfirmPct: Number(form.get("reboundConfirmPct")),
          minRallyPct: Number(form.get("minRallyPct")),
          reversalConfirmPct: Number(form.get("reversalConfirmPct")),
          minForecastConfidence: Number(form.get("minForecastConfidence")),
          maxTradesPerSymbolDay: Number(form.get("maxTradesPerSymbolDay")),
          requireDailyWeeklyAlignment:
            form.get("requireDailyWeeklyAlignment") === "on",
        }),
      });
      const json = await readJson<{ error?: string }>(response, "自动交易参数");
      if (!response.ok || json.error) throw new Error(json.error || "保存失败");
      await refresh();
      setMessage("自动交易参数已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function runNow(silent = false) {
    if (busyRef.current) return;
    busyRef.current = true;
    if (!silent) {
      setLoading(true);
      setMessage("");
    }
    try {
      const response = await fetch("/api/admin/prediction-auto-trader/run", {
        method: "POST",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const json = await readJson<PredictionAutoRunReport & { error?: string }>(
        response,
        "策略检查"
      );
      if (!response.ok || json.error) throw new Error(json.error || "运行失败");
      setReport(json);
      if (!silent || json.decisions.some((row) => row.status === "EXECUTED")) {
        setMessage(json.message);
      }
      await refresh();
    } catch (error) {
      if (!silent) setMessage(error instanceof Error ? error.message : "运行失败");
    } finally {
      busyRef.current = false;
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (!dashboard.settings.enabled) return;
    const timer = window.setInterval(() => void runNow(true), 60_000);
    return () => window.clearInterval(timer);
    // 开关变化时重建定时器；服务器Cron仍是无人值守主通道。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard.settings.enabled]);

  const settings = dashboard.settings;

  return (
    <div className="space-y-6">
      {message ? (
        <Card padding="md" className="border-primary/25 bg-primary/[0.04]">
          <Text variant="body-sm">{message}</Text>
        </Card>
      ) : null}

      <Card padding="lg" className="space-y-4 border-primary/30 bg-primary/[0.025]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Heading size="h3">预测驱动自动交易</Heading>
            <Text variant="body-sm" color="secondary" className="mt-2 block max-w-4xl">
              周预测决定当前主方向，日预测决定先跌后涨或先涨后跌的进场节奏，Bitget 15分钟K线负责确认。只连接模拟盘。
            </Text>
          </div>
          <Badge variant={settings.enabled ? "success" : "outline"}>
            {settings.enabled ? "自动运行中" : "尚未开启"}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">Bitget镜像</Text>
            <Text variant="body-sm" className="mt-1 block">
              {dashboard.mirrorEnabled ? "已开启" : "未开启"}
            </Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">Demo下单总开关</Text>
            <Text variant="body-sm" className="mt-1 block">
              {dashboard.executionAllowed ? "允许" : "未允许"}
            </Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">最近服务器检查</Text>
            <Text variant="body-sm" className="mt-1 block">
              {settings.lastRunAt
                ? new Date(settings.lastRunAt).toLocaleString("zh-CN")
                : "尚未运行"}
            </Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">最近结果</Text>
            <Text variant="body-sm" className="mt-1 block">{settings.lastMessage}</Text>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {settings.enabled ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => void setEnabled(false)}
              isLoading={loading}
            >
              紧急停止自动交易
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={() => void setEnabled(true)}
              isLoading={loading}
            >
              开启预测自动交易
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => void runNow(false)}
            isLoading={loading}
          >
            立即检查一次
          </Button>
        </div>
        <Text variant="caption" className="block text-amber-200/80">
          服务器默认每5分钟检查一次；网页打开时每60秒补查。缺少当天日预测、缺少本周预测、日周冲突或Bitget镜像未开启时，系统不会开仓。
        </Text>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {dashboard.plans.map((plan) => (
          <Card key={plan.symbol} padding="lg" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Heading size="h3">{plan.symbol} 自动计划</Heading>
              <Badge variant={plan.setup === "HOLD" || plan.setup === "MISSING_FORECAST" ? "outline" : "warning"}>
                {setupLabel(plan.setup)}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 p-3">
                <Text variant="caption" color="tertiary">周内当前阶段</Text>
                <Text variant="body-sm" className="mt-1 block">
                  {directionLabel(plan.weeklyDirection)}
                </Text>
              </div>
              <div className="rounded-lg border border-white/10 p-3">
                <Text variant="caption" color="tertiary">日内节奏</Text>
                <Text variant="body-sm" className="mt-1 block">
                  {plan.dailyForecast?.direction ?? "缺失"}
                </Text>
              </div>
              <div className="rounded-lg border border-white/10 p-3">
                <Text variant="caption" color="tertiary">综合置信度</Text>
                <Text variant="body-sm" className="mt-1 block">{plan.confidence}%</Text>
              </div>
            </div>
            <Text variant="body-sm">{plan.reason}</Text>
            <Text variant="caption" color="tertiary" className="block leading-relaxed">
              周：{plan.weeklyForecast?.direction ?? "缺失"}；{plan.weeklyForecast?.path ?? "缺失"}
            </Text>
            <Text variant="caption" color="tertiary" className="block leading-relaxed">
              日：{plan.dailyForecast?.direction ?? "缺失"}；{plan.dailyForecast?.path ?? "缺失"}
            </Text>
          </Card>
        ))}
      </div>

      {report ? (
        <Card padding="lg" className="space-y-3">
          <Heading size="h3">本次策略检查</Heading>
          {report.decisions.length ? (
            <div className="space-y-3">
              {report.decisions.map((decision: PredictionAutoDecision, index) => (
                <div
                  key={`${decision.symbol}-${decision.action}-${index}`}
                  className="rounded-lg border border-white/10 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Text variant="body-sm" weight="semibold">
                      {decision.symbol} · {decision.action}
                    </Text>
                    <Badge variant={statusVariant(decision.status)}>{decision.status}</Badge>
                  </div>
                  <Text variant="body-sm" color="secondary" className="mt-2 block">
                    {decision.message}
                  </Text>
                  {decision.market ? (
                    <Text variant="caption" color="tertiary" className="mt-2 block">
                      现价 {decision.market.currentPrice.toLocaleString("en-US")}；下探 {decision.market.dipPct.toFixed(2)}%；低点反弹 {decision.market.reboundPct.toFixed(2)}%；冲高 {decision.market.rallyPct.toFixed(2)}%；高点回落 {decision.market.reversalPct.toFixed(2)}%
                    </Text>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <Text variant="body-sm" color="secondary">{report.message}</Text>
          )}
        </Card>
      ) : null}

      <Card padding="lg" className="space-y-4">
        <Heading size="h3">第一版自动风控参数</Heading>
        <form onSubmit={saveSettings} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1">
              <Text variant="caption" color="tertiary">单笔仓位（账户净值%）</Text>
              <input className={inputClass} name="positionPct" type="number" step="0.1" defaultValue={settings.positionPct} />
            </label>
            <label className="space-y-1">
              <Text variant="caption" color="tertiary">止损（%）</Text>
              <input className={inputClass} name="stopLossPct" type="number" step="0.1" defaultValue={settings.stopLossPct} />
            </label>
            <label className="space-y-1">
              <Text variant="caption" color="tertiary">止盈1（%）</Text>
              <input className={inputClass} name="target1Pct" type="number" step="0.1" defaultValue={settings.target1Pct} />
            </label>
            <label className="space-y-1">
              <Text variant="caption" color="tertiary">止盈2（%）</Text>
              <input className={inputClass} name="target2Pct" type="number" step="0.1" defaultValue={settings.target2Pct} />
            </label>
            <label className="space-y-1">
              <Text variant="caption" color="tertiary">止盈3（%）</Text>
              <input className={inputClass} name="target3Pct" type="number" step="0.1" defaultValue={settings.target3Pct} />
            </label>
            <label className="space-y-1">
              <Text variant="caption" color="tertiary">做多最低下探（%）</Text>
              <input className={inputClass} name="minDipPct" type="number" step="0.05" defaultValue={settings.minDipPct} />
            </label>
            <label className="space-y-1">
              <Text variant="caption" color="tertiary">低点反弹确认（%）</Text>
              <input className={inputClass} name="reboundConfirmPct" type="number" step="0.05" defaultValue={settings.reboundConfirmPct} />
            </label>
            <label className="space-y-1">
              <Text variant="caption" color="tertiary">做空最低冲高（%）</Text>
              <input className={inputClass} name="minRallyPct" type="number" step="0.05" defaultValue={settings.minRallyPct} />
            </label>
            <label className="space-y-1">
              <Text variant="caption" color="tertiary">高点回落确认（%）</Text>
              <input className={inputClass} name="reversalConfirmPct" type="number" step="0.05" defaultValue={settings.reversalConfirmPct} />
            </label>
            <label className="space-y-1">
              <Text variant="caption" color="tertiary">最低预测置信度（%）</Text>
              <input className={inputClass} name="minForecastConfidence" type="number" step="1" defaultValue={settings.minForecastConfidence} />
            </label>
            <label className="space-y-1">
              <Text variant="caption" color="tertiary">每品种每日最多开仓</Text>
              <input className={inputClass} name="maxTradesPerSymbolDay" type="number" step="1" defaultValue={settings.maxTradesPerSymbolDay} />
            </label>
          </div>
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input name="btcEnabled" type="checkbox" defaultChecked={settings.btcEnabled} />
              BTC自动交易
            </label>
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input name="ethEnabled" type="checkbox" defaultChecked={settings.ethEnabled} />
              ETH自动交易
            </label>
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                name="requireDailyWeeklyAlignment"
                type="checkbox"
                defaultChecked={settings.requireDailyWeeklyAlignment}
              />
              必须日周方向共振
            </label>
          </div>
          <Button type="submit" variant="outline" isLoading={loading}>
            保存自动交易参数
          </Button>
        </form>
      </Card>

      <Card padding="lg" className="space-y-3">
        <Heading size="h3">最近自动动作记录</Heading>
        {dashboard.recentRuns.length ? (
          <div className="space-y-2">
            {dashboard.recentRuns.slice(0, 15).map((row) => (
              <div key={row.id} className="rounded-lg border border-white/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Text variant="body-sm" weight="semibold">
                    {row.symbol} · {row.action}
                  </Text>
                  <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                </div>
                <Text variant="caption" color="secondary" className="mt-2 block">
                  {row.reason}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  {new Date(row.createdAt).toLocaleString("zh-CN")}
                  {row.price ? ` · ${row.price.toLocaleString("en-US")}` : ""}
                </Text>
              </div>
            ))}
          </div>
        ) : (
          <Text variant="body-sm" color="secondary">尚无自动开仓、止盈、止损或错误记录。</Text>
        )}
      </Card>
    </div>
  );
}
