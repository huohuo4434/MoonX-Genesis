"use client";

import { type ChangeEvent, useState } from "react";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import type {
  ThreeHorizonStrategyDashboard,
  ThreeHorizonStrategyMode,
  ThreeHorizonStrategyProfile,
} from "@/types/three-horizon-strategy";

const inputClass =
  "min-h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-primary/60";

function time(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("zh-CN");
}

function strategyBadge(profile: ThreeHorizonStrategyProfile) {
  if (!profile.enabled) return { label: "已停用", variant: "outline" as const };
  if (profile.mode === "DEMO") return { label: "Demo模拟执行", variant: "warning" as const };
  return { label: "影子观察", variant: "success" as const };
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`服务器返回异常（HTTP ${response.status}）`);
  }
}

export function ThreeHorizonStrategyClient({
  initial,
}: {
  initial: ThreeHorizonStrategyDashboard;
}) {
  const [dashboard, setDashboard] = useState(initial);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  async function save(profile: ThreeHorizonStrategyProfile) {
    setSaving(profile.strategyType);
    setMessage("");
    try {
      const response = await fetch("/api/admin/bitget-demo/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyType: profile.strategyType,
          enabled: profile.enabled,
          mode: profile.mode,
          riskPerTradePct: profile.riskPerTradePct,
          planningMinConfidence: profile.planningMinConfidence,
          minConfidence: profile.minConfidence,
          maxTradesPerDay: profile.maxTradesPerDay,
        }),
      });
      const json = await parseJson<{
        error?: string;
        dashboard?: ThreeHorizonStrategyDashboard;
      }>(response);
      if (!response.ok || json.error || !json.dashboard) {
        throw new Error(json.error || "保存失败");
      }
      setDashboard(json.dashboard);
      setMessage(`${profile.label}设置已保存。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(null);
    }
  }

  function patch(
    strategyType: ThreeHorizonStrategyProfile["strategyType"],
    changes: Partial<ThreeHorizonStrategyProfile>
  ) {
    setDashboard((current) => ({
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.strategyType === strategyType ? { ...profile, ...changes } : profile
      ),
    }));
  }

  return (
    <Card padding="lg" className="space-y-6 border-primary/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Heading size="h3">三周期策略控制台</Heading>
          <Text variant="body-sm" color="secondary" className="mt-2 block max-w-4xl">
            短线、波段和中长期分别使用独立周期、风险预算和持仓期限。计划发布门槛低于执行门槛：会员可提前看到计划，未满足最终条件不会下单。
          </Text>
        </div>
        <Badge variant={dashboard.executionEnvironmentAllowed ? "warning" : "success"}>
          {dashboard.executionEnvironmentAllowed ? "Demo总开关已开启" : "安全影子模式"}
        </Badge>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/15 p-4">
        <Text variant="body-sm">{dashboard.executionSafetyNotice}</Text>
        <Text variant="caption" color="tertiary" className="mt-2 block">
          组合风险：{dashboard.risk.openRiskPct}% / {dashboard.risk.openRiskLimitPct}%；当日亏损：{dashboard.risk.dailyLossPct}% / {dashboard.risk.dailyLossLimitPct}%；连续亏损：{dashboard.risk.consecutiveLosses}单。
        </Text>
        {dashboard.risk.blocked ? (
          <Text variant="caption" className="mt-2 block text-red-300">
            新开仓拦截：{dashboard.risk.blockReason}
          </Text>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {dashboard.profiles.map((profile) => {
          const badge = strategyBadge(profile);
          const stats = dashboard.stats.find(
            (row) => row.strategyType === profile.strategyType
          );
          return (
            <div key={profile.strategyType} className="space-y-4 rounded-xl border border-white/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Text variant="body" weight="semibold">{profile.label}</Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {profile.environmentTimeframe}环境 / {profile.directionTimeframe}方向 / {profile.entryTimeframe}入场
                  </Text>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>

              <Text variant="body-sm" color="secondary">{profile.description}</Text>

              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={profile.enabled}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => patch(profile.strategyType, { enabled: event.target.checked })}
                />
                启用策略扫描
              </label>

              <label className="space-y-1 text-sm text-white/70">
                <span>运行模式</span>
                <select
                  className={inputClass}
                  value={profile.mode}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => patch(profile.strategyType, {
                    mode: event.target.value as ThreeHorizonStrategyMode,
                  })}
                >
                  <option value="SHADOW">SHADOW｜影子观察，不下单</option>
                  <option value="DEMO">DEMO｜Bitget模拟下单</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <label className="space-y-1 text-xs text-white/60">
                  <span>单笔风险%</span>
                  <input
                    className={inputClass}
                    type="number"
                    min="0.1"
                    max="0.5"
                    step="0.05"
                    value={profile.riskPerTradePct}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => patch(profile.strategyType, {
                      riskPerTradePct: Number(event.target.value),
                    })}
                  />
                </label>
                <label className="space-y-1 text-xs text-white/60">
                  <span>计划发布门槛</span>
                  <input
                    className={inputClass}
                    type="number"
                    min="40"
                    max="80"
                    step="1"
                    value={profile.planningMinConfidence}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => patch(profile.strategyType, {
                      planningMinConfidence: Number(event.target.value),
                    })}
                  />
                </label>
                <label className="space-y-1 text-xs text-white/60">
                  <span>模拟执行门槛</span>
                  <input
                    className={inputClass}
                    type="number"
                    min="50"
                    max="90"
                    step="1"
                    value={profile.minConfidence}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => patch(profile.strategyType, {
                      minConfidence: Number(event.target.value),
                    })}
                  />
                </label>
                <label className="space-y-1 text-xs text-white/60">
                  <span>每日上限</span>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    max="4"
                    step="1"
                    value={profile.maxTradesPerDay}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => patch(profile.strategyType, {
                      maxTradesPerDay: Number(event.target.value),
                    })}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-white/65">
                <div>今日扫描：{stats?.scansToday ?? 0}</div>
                <div>影子机会：{stats?.shadowReadyToday ?? 0}</div>
                <div>下单尝试：{stats?.orderAttemptsToday ?? 0}</div>
                <div>已平仓：{stats?.closedTrades ?? 0}</div>
              </div>

              <Text variant="caption" color="tertiary">
                最近扫描：{time(profile.lastScanAt)}
              </Text>
              <Button
                size="sm"
                onClick={() => void save(profile)}
                disabled={saving === profile.strategyType}
              >
                {saving === profile.strategyType ? "保存中…" : `保存${profile.label}设置`}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <Text variant="body-sm" weight="semibold">最近决策审计</Text>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-left text-xs text-white/70">
            <thead className="bg-white/[0.03] text-white/45">
              <tr>
                <th className="px-3 py-2">时间</th>
                <th className="px-3 py-2">策略</th>
                <th className="px-3 py-2">标的</th>
                <th className="px-3 py-2">状态</th>
                <th className="px-3 py-2">条件</th>
                <th className="px-3 py-2">原因</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.latestDecisions.slice(0, 20).map((decision) => (
                <tr key={decision.id} className="border-t border-white/10">
                  <td className="whitespace-nowrap px-3 py-2">{time(decision.createdAt)}</td>
                  <td className="px-3 py-2">{decision.strategyLabel}</td>
                  <td className="px-3 py-2">{decision.symbol}</td>
                  <td className="px-3 py-2">{decision.status}</td>
                  <td className="px-3 py-2">{decision.conditionsMet}/{decision.conditionsTotal}</td>
                  <td className="max-w-sm px-3 py-2">{decision.rejectionReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {message ? <Text variant="body-sm" className={message.includes("失败") || message.includes("错误") ? "text-red-300" : "text-emerald-300"}>{message}</Text> : null}
    </Card>
  );
}
