"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Heading, Text } from "@/components/ui";
import type {
  AiTradingDeskPlan,
  AiTradingDeskSnapshot,
} from "@/types/ai-trading-desk";
import { assetDisplayName, assetDisplaySymbol, assetVenue } from "@/lib/presentation/asset-catalog";
import { cleanMemberCopy } from "@/lib/presentation/public-copy";

function number(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function signed(value: number | null, suffix = "%"): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${number(value, 2)}${suffix}`;
}

function time(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const beijing = new Date(date.getTime() + 8 * 60 * 60_000);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${beijing.getUTCFullYear()}-${pad(beijing.getUTCMonth() + 1)}-${pad(beijing.getUTCDate())} ${pad(beijing.getUTCHours())}:${pad(beijing.getUTCMinutes())} 北京时间`;
}

function planBadge(plan: AiTradingDeskPlan) {
  if (plan.status === "POSITION_OPEN" || plan.status === "READY") return "success" as const;
  if (plan.status === "PLAN_ONLY" || plan.status === "WAIT_LONG" || plan.status === "WAIT_SHORT") return "warning" as const;
  if (plan.status === "BLOCKED" || plan.status === "ERROR") return "danger" as const;
  return "outline" as const;
}

async function readSnapshot(): Promise<AiTradingDeskSnapshot> {
  const response = await fetch("/api/member/ai-trading-desk", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const text = await response.text();
  let json: AiTradingDeskSnapshot & { error?: string };
  try {
    json = JSON.parse(text) as AiTradingDeskSnapshot & { error?: string };
  } catch {
    throw new Error(`服务器返回异常（HTTP ${response.status}）`);
  }
  if (!response.ok || json.error) throw new Error(json.error || "读取失败");
  return json;
}

export function AiTradingDeskClient({ initial }: { initial: AiTradingDeskSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      void readSnapshot()
        .then((next) => {
          setSnapshot(next);
          setError("");
        })
        .catch((reason) => {
          setError(reason instanceof Error ? reason.message : "刷新失败");
        });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const statusVariant = snapshot.operationalState === "WAITING_ENTRY" || snapshot.operationalState === "SIMULATION_POSITION"
    ? "success"
    : snapshot.operationalState === "PLAN_ONLY" || snapshot.operationalState === "DATA_DELAYED" || snapshot.operationalState === "CONNECTING"
      ? "warning"
      : snapshot.operationalState === "PAUSED"
        ? "outline"
        : "danger";

  return (
    <div className="space-y-8">
      <Card padding="lg" className="space-y-5 border-primary/25 bg-primary/[0.025]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Heading size="h2">AI交易公开台</Heading>
              <Badge variant="warning">Bitget 模拟交易</Badge>
            </div>
            <Text variant="body-sm" color="secondary" className="mt-2 block max-w-4xl">
              展示服务器正在检查的交易机会、Bitget Demo实际模拟持仓和已结束交易。计划发布后保留原始依据，不因结果倒改。
            </Text>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={statusVariant}>{snapshot.operationalStateLabel}</Badge>
            <a
              href="https://t.me/jackuwin"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary transition hover:opacity-80"
            >
              电报客服 @jackuwin
            </a>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">策略状态</Text>
            <Text variant="body-sm" className="mt-1 block">{snapshot.operationalStateLabel}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">交易同步</Text>
            <Text variant="body-sm" className="mt-1 block">{snapshot.mirrorEnabled ? "已开启" : "未开启"}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">模拟执行</Text>
            <Text variant="body-sm" className="mt-1 block">{snapshot.executionAllowed ? "已开启" : "已关闭"}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">行情数据</Text>
            <Text variant="body-sm" className="mt-1 block">{snapshot.quoteReady ? "已连接" : "未连接或延迟"}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">最近检查</Text>
            <Text variant="body-sm" className="mt-1 block">{time(snapshot.latestQuoteAt)}</Text>
          </div>
        </div>

        <Text variant="caption" color="tertiary" className={snapshot.syncStatus === "ERROR" ? "text-red-300" : undefined}>
          {cleanMemberCopy(error || snapshot.syncMessage)}
        </Text>

        <div className="rounded-lg border border-white/10 bg-black/10 p-4">
          <Text variant="caption" color="tertiary">账本说明</Text>
          <Text variant="body-sm" color="secondary" className="mt-1 block">
            {snapshot.ledgerNotice}
          </Text>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">服务器心跳</Text>
            <Text variant="body-sm" className="mt-1 block">{time(snapshot.runtime.lastHeartbeatAt)}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">最近策略检查</Text>
            <Text variant="body-sm" className="mt-1 block">{time(snapshot.runtime.lastStrategyAt)}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">今日判断次数</Text>
            <Text variant="body-sm" className="mt-1 block">{snapshot.runtime.decisionStatsToday.symbolsEvaluated}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">置信度 / 周期拦截</Text>
            <Text variant="body-sm" className="mt-1 block">{snapshot.runtime.decisionStatsToday.confidenceBlocked} / {snapshot.runtime.decisionStatsToday.alignmentBlocked}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">等待技术触发 / 已开仓</Text>
            <Text variant="body-sm" className="mt-1 block">{snapshot.runtime.decisionStatsToday.triggerWaiting} / {snapshot.runtime.decisionStatsToday.executed}</Text>
          </div>
        </div>
      </Card>

      <section className="space-y-4">
        <div>
          <Heading size="h3">三周期策略</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 block">
            短线、波段和中长期独立扫描。影子观察只记录机会，不会向Bitget提交订单。
          </Text>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {snapshot.strategies.map((strategy) => {
            const latest = strategy.decisions[0];
            return (
              <Card key={strategy.strategyType} padding="lg" className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Text variant="body" weight="semibold">{strategy.label}</Text>
                    <Text variant="caption" color="tertiary" className="mt-1 block">
                      {strategy.holdingLabel} · {strategy.timeframeLabel}
                    </Text>
                  </div>
                  <Badge variant={!strategy.enabled ? "outline" : strategy.mode === "DEMO" ? "warning" : "success"}>
                    {!strategy.enabled ? "已暂停" : strategy.modeLabel}
                  </Badge>
                </div>
                <Text variant="body-sm" color="secondary">{strategy.description}</Text>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg border border-white/10 p-3">
                    <Text variant="caption" color="tertiary">今日扫描</Text>
                    <Text variant="body-sm" className="mt-1 block">{strategy.stats.scansToday}次</Text>
                  </div>
                  <div className="rounded-lg border border-white/10 p-3">
                    <Text variant="caption" color="tertiary">影子机会</Text>
                    <Text variant="body-sm" className="mt-1 block">{strategy.stats.shadowReadyToday}次</Text>
                  </div>
                  <div className="rounded-lg border border-white/10 p-3">
                    <Text variant="caption" color="tertiary">下单尝试</Text>
                    <Text variant="body-sm" className="mt-1 block">{strategy.stats.orderAttemptsToday}次</Text>
                  </div>
                  <div className="rounded-lg border border-white/10 p-3">
                    <Text variant="caption" color="tertiary">单笔风险</Text>
                    <Text variant="body-sm" className="mt-1 block">{strategy.riskPerTradePct}%</Text>
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/10 p-3">
                  <Text variant="caption" color="tertiary">最近判断</Text>
                  <Text variant="body-sm" className="mt-1 block">
                    {latest
                      ? `${latest.symbol} · ${latest.status} · ${latest.conditionsMet}/${latest.conditionsTotal}项满足`
                      : "尚未完成首次扫描"}
                  </Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {latest?.rejectionReason ?? `最近扫描：${time(strategy.lastScanAt)}`}
                  </Text>
                </div>
              </Card>
            );
          })}
        </div>
        {!snapshot.strategies.length ? (
          <Card padding="lg"><Text variant="body-sm" color="secondary">三周期策略正在初始化。</Text></Card>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          <Heading size="h3">AI当前计划</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 block">
            周预测决定主方向，日预测决定进场节奏，15分钟结构确认后才允许开仓。
          </Text>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {snapshot.plans.map((plan) => (
            <Card key={plan.symbol} padding="lg" className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Text variant="body" weight="semibold">{assetDisplayName(plan.symbol, plan.assetName)} · {assetDisplaySymbol(plan.symbol)}</Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {assetVenue(plan.symbol)} · 参考价 {plan.currentPrice == null ? "行情未连接" : number(plan.currentPrice, 4)} · 置信度 {plan.confidence}%
                  </Text>
                </div>
                <Badge variant={planBadge(plan)}>{plan.statusLabel}</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-white/10 p-3">
                  <Text variant="caption" color="tertiary">周度方向</Text>
                  <Text variant="body-sm" className="mt-1 block">{cleanMemberCopy(plan.weeklyText)}</Text>
                </div>
                <div className="rounded-lg border border-white/10 p-3">
                  <Text variant="caption" color="tertiary">日内节奏</Text>
                  <Text variant="body-sm" className="mt-1 block">{cleanMemberCopy(plan.dailyText)}</Text>
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/[0.035] p-4">
                <Text variant="caption" color="tertiary">当前系统动作</Text>
                <Text variant="body-sm" className="mt-1 block">{cleanMemberCopy(plan.actionText)}</Text>
              </div>

              <div className="space-y-2 text-sm text-white/70">
                <div><span className="text-white/45">触发条件：</span>{cleanMemberCopy(plan.triggerText)}</div>
                <div><span className="text-white/45">失效条件：</span>{cleanMemberCopy(plan.invalidationText)}</div>
                {plan.keyLevel != null ? <div><span className="text-white/45">关键点位：</span>{number(plan.keyLevel, 4)}</div> : null}
                <div><span className="text-white/45">最近检查：</span>{time(plan.lastCheckedAt)}</div>
              </div>
            </Card>
          ))}
        </div>
        {!snapshot.plans.length ? (
          <Card padding="lg"><Text variant="body-sm" color="secondary">暂无可公开的AI交易计划。</Text></Card>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          <Heading size="h3">Bitget 模拟交易当前持仓</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 block">
            同步读取模拟交易持仓；不公开API密钥、账户总资产和实际持仓数量。
          </Text>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {snapshot.positions.map((position) => (
            <Card key={`${position.symbol}-${position.direction}`} padding="lg" className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Text variant="body" weight="semibold">{assetDisplayName(position.symbol)} · {assetDisplaySymbol(position.symbol)}</Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {assetVenue(position.symbol)} · {position.marginMode} · {position.leverage}倍 · 开仓 {time(position.openedAt)}
                  </Text>
                </div>
                <Badge variant={position.direction === "LONG" ? "success" : "danger"}>
                  {position.direction === "LONG" ? "多单" : "空单"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div><Text variant="caption" color="tertiary">开仓均价</Text><Text variant="body-sm" className="mt-1 block">{number(position.averageEntryPrice, 4)}</Text></div>
                <div><Text variant="caption" color="tertiary">标记价格</Text><Text variant="body-sm" className="mt-1 block">{number(position.markPrice, 4)}</Text></div>
                <div><Text variant="caption" color="tertiary">浮动收益率</Text><Text variant="body-sm" className={`mt-1 block ${position.profitRatePct >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(position.profitRatePct)}</Text></div>
                <div><Text variant="caption" color="tertiary">风险保护</Text><Text variant="body-sm" className="mt-1 block">{position.riskSource === "BITGET_ORDER" ? "交易所挂单" : "系统计划"}</Text></div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-red-400/20 bg-red-400/[0.035] p-3"><Text variant="caption" color="tertiary">止损</Text><Text variant="body-sm" className="mt-1 block">{number(position.stopLoss, 4)}</Text></div>
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.035] p-3"><Text variant="caption" color="tertiary">第一止盈</Text><Text variant="body-sm" className="mt-1 block">{number(position.takeProfit, 4)}</Text></div>
              </div>
              {position.unrealisedPnlUsdt != null ? <Text variant="caption" color="tertiary">未实现盈亏：{signed(position.unrealisedPnlUsdt, " USDT")}</Text> : null}
            </Card>
          ))}
        </div>
        {!snapshot.positions.length ? (
          <Card padding="lg"><Text variant="body-sm" color="secondary">当前没有模拟持仓。</Text></Card>
        ) : null}
      </section>

      {snapshot.stats.closedTrades > 0 ? (
      <section className="space-y-4">
        <Heading size="h3">策略表现</Heading>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Card padding="md"><Text variant="caption" color="tertiary">已结束交易</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{snapshot.stats.closedTrades}</Text></Card>
          <Card padding="md"><Text variant="caption" color="tertiary">胜率</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{snapshot.stats.winRatePct == null ? "—" : `${number(snapshot.stats.winRatePct, 1)}%`}</Text></Card>
          <Card padding="md"><Text variant="caption" color="tertiary">平均逐笔收益</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{signed(snapshot.stats.averageReturnPct)}</Text></Card>
          <Card padding="md"><Text variant="caption" color="tertiary">最佳 / 最差</Text><Text variant="body-sm" className="mt-1 block">{signed(snapshot.stats.bestReturnPct)} / {signed(snapshot.stats.worstReturnPct)}</Text></Card>
          <Card padding="md"><Text variant="caption" color="tertiary">逐笔收益曲线回撤</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{snapshot.stats.tradeCurveMaxDrawdownPct == null ? "—" : `${number(snapshot.stats.tradeCurveMaxDrawdownPct)}%`}</Text></Card>
        </div>
        <Text variant="caption" color="tertiary">
          回撤按每笔成交收益率构造，仅用于比较策略稳定性，不等同于账户净值回撤。
        </Text>
      </section>

      ) : (
        <section className="space-y-4">
          <Heading size="h3">策略表现</Heading>
          <Card padding="lg">
            <Text variant="body" weight="semibold">交易样本正在积累</Text>
            <Text variant="body-sm" color="secondary" className="mt-2">完成第一笔模拟交易后再显示胜率、收益与回撤。</Text>
          </Card>
        </section>
      )}

      <section className="space-y-4">
        <Heading size="h3">最近结束交易</Heading>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.025] text-white/45">
              <tr>
                <th className="px-4 py-3">时间</th>
                <th className="px-4 py-3">品种</th>
                <th className="px-4 py-3">方向</th>
                <th className="px-4 py-3">开仓</th>
                <th className="px-4 py-3">平仓</th>
                <th className="px-4 py-3">结果</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.recentTrades.map((trade) => (
                <tr key={trade.id} className="border-b border-white/[0.06] last:border-0">
                  <td className="px-4 py-3 text-white/60">{time(trade.closedAt)}</td>
                  <td className="px-4 py-3">{assetDisplayName(trade.symbol)} · {assetDisplaySymbol(trade.symbol)}</td>
                  <td className="px-4 py-3">{trade.direction === "LONG" ? "做多" : "做空"}</td>
                  <td className="px-4 py-3">{number(trade.openPrice, 4)}</td>
                  <td className="px-4 py-3">{number(trade.closePrice, 4)}</td>
                  <td className={`px-4 py-3 ${trade.returnPct >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(trade.returnPct)}{trade.netProfitUsdt != null ? ` · ${signed(trade.netProfitUsdt, " USDT")}` : ""}</td>
                </tr>
              ))}
              {!snapshot.recentTrades.length ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-white/45">暂无已经结束的模拟交易。</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <Card padding="md" className="border-amber-400/20 bg-amber-400/[0.035]">
        <Text variant="caption" color="secondary">
          本栏目展示模拟交易记录，不构成收益承诺或个性化投资建议。会员可参考策略，但应自行决定是否交易并承担风险。
        </Text>
      </Card>
    </div>
  );
}
