"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Heading, Text } from "@/components/ui";
import type {
  AiTradingDeskPlan,
  AiTradingDeskSnapshot,
} from "@/types/ai-trading-desk";
import type { AiTradePlan } from "@/types/ai-trade-plan";
import { assetDisplayName, assetDisplaySymbol, assetVenue } from "@/lib/presentation/asset-catalog";
import { cleanMemberCopy } from "@/lib/presentation/public-copy";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { assetNameEn, safeEnglish, statusEn } from "@/lib/i18n/english-content";

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

function time(value: string | null, en = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const beijing = new Date(date.getTime() + 8 * 60 * 60_000);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${beijing.getUTCFullYear()}-${pad(beijing.getUTCMonth() + 1)}-${pad(beijing.getUTCDate())} ${pad(beijing.getUTCHours())}:${pad(beijing.getUTCMinutes())} ${en ? "Beijing time" : "北京时间"}`;
}

function publishedPlanBadge(plan: AiTradePlan) {
  if (["OPEN", "REDUCED", "CLOSED"].includes(plan.status)) return "success" as const;
  if (["ARMED", "ORDER_SUBMITTED", "PARTIALLY_FILLED"].includes(plan.status)) return "warning" as const;
  if (["EXECUTION_ERROR", "INVALIDATED", "CANCELLED"].includes(plan.status)) return "danger" as const;
  return "outline" as const;
}

function directionLabel(direction: AiTradePlan["direction"], en: boolean): string {
  if (direction === "LONG") return en ? "Ready for long confirmation" : "准备做多";
  if (direction === "SHORT") return en ? "Ready for short confirmation" : "准备做空";
  return en ? "Neutral monitoring" : "中性观察";
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
  const { locale } = useLocale();
  const en = locale === "en";
  const memberCopy = (value: string | null | undefined, fallback?: string) => en ? safeEnglish(cleanMemberCopy(value ?? ""), fallback) : cleanMemberCopy(value ?? "");
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
          setError(reason instanceof Error ? reason.message : (en ? "Refresh failed" : "刷新失败"));
        });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [en]);

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
              <Heading size="h2">{en ? "AI Strategy Desk" : "AI交易公开台"}</Heading>
              <Badge variant="warning">{en ? "Bitget Demo" : "Bitget 模拟交易"}</Badge>
            </div>
            <Text variant="body-sm" color="secondary" className="mt-2 block max-w-4xl">
              {en ? "Follow pre-trade plans, confirmation progress, Bitget Demo orders, positions and completed results. Published versions retain their timestamps and content hashes and are never rewritten after the outcome." : "展示AI事前计划、条件进度、Bitget Demo模拟委托、持仓和结束结果。已发布版本保留时间戳与内容哈希，不因结果倒改。"}
            </Text>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={statusVariant}>{en ? statusEn(snapshot.operationalStateLabel) : snapshot.operationalStateLabel}</Badge>
            <a
              href="https://t.me/jackuwin"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary transition hover:opacity-80"
            >
              {en ? "Telegram support @jackuwin" : "电报客服 @jackuwin"}
            </a>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">{en ? "Strategy status" : "策略状态"}</Text>
            <Text variant="body-sm" className="mt-1 block">{en ? statusEn(snapshot.operationalStateLabel) : snapshot.operationalStateLabel}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">{en ? "Trading sync" : "交易同步"}</Text>
            <Text variant="body-sm" className="mt-1 block">{snapshot.mirrorEnabled ? (en ? "Enabled" : "已开启") : (en ? "Disabled" : "未开启")}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">{en ? "Demo execution" : "模拟执行"}</Text>
            <Text variant="body-sm" className="mt-1 block">{snapshot.executionAllowed ? (en ? "Enabled" : "已开启") : (en ? "Disabled" : "已关闭")}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">{en ? "Market data" : "行情数据"}</Text>
            <Text variant="body-sm" className="mt-1 block">{snapshot.quoteReady ? (en ? "Connected" : "已连接") : (en ? "Disconnected or delayed" : "未连接或延迟")}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">{en ? "Last checked" : "最近检查"}</Text>
            <Text variant="body-sm" className="mt-1 block">{time(snapshot.latestQuoteAt, en)}</Text>
          </div>
        </div>

        <Text variant="caption" color="tertiary" className={snapshot.syncStatus === "ERROR" ? "text-red-300" : undefined}>
          {memberCopy(error || snapshot.syncMessage, "Status data is temporarily unavailable.")}
        </Text>

        <div className="rounded-lg border border-white/10 bg-black/10 p-4">
          <Text variant="caption" color="tertiary">{en ? "Ledger note" : "账本说明"}</Text>
          <Text variant="body-sm" color="secondary" className="mt-1 block">
            {memberCopy(snapshot.ledgerNotice)}
          </Text>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">{en ? "Server heartbeat" : "服务器心跳"}</Text>
            <Text variant="body-sm" className="mt-1 block">{time(snapshot.runtime.lastHeartbeatAt, en)}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">{en ? "Latest strategy check" : "最近策略检查"}</Text>
            <Text variant="body-sm" className="mt-1 block">{time(snapshot.runtime.lastStrategyAt, en)}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">{en ? "Decisions today" : "今日判断次数"}</Text>
            <Text variant="body-sm" className="mt-1 block">{snapshot.runtime.decisionStatsToday.symbolsEvaluated}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">{en ? "Confidence / horizon blocks" : "置信度 / 周期拦截"}</Text>
            <Text variant="body-sm" className="mt-1 block">{snapshot.runtime.decisionStatsToday.confidenceBlocked} / {snapshot.runtime.decisionStatsToday.alignmentBlocked}</Text>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <Text variant="caption" color="tertiary">{en ? "Waiting trigger / opened" : "等待技术触发 / 已开仓"}</Text>
            <Text variant="body-sm" className="mt-1 block">{snapshot.runtime.decisionStatsToday.triggerWaiting} / {snapshot.runtime.decisionStatsToday.executed}</Text>
          </div>
        </div>
      </Card>


      <section className="space-y-4">
        <div>
          <Heading size="h3">{en ? "Locked pre-trade plans" : "AI事前交易计划"}</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 block">
            {en ? "MOOX publishes and locks each plan before waiting for technical confirmation. Bitget Demo provides simulated order and fill evidence only; no order is submitted until the plan conditions are met." : "MOOX先发布并锁定计划，再等待技术触发；Bitget Demo只负责模拟委托与成交证明。计划未达到条件时不会下单。"}
          </Text>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Card padding="md"><Text variant="caption" color="tertiary">{en ? "New today" : "今日新计划"}</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{snapshot.planSummary.publishedToday}</Text></Card>
          <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Monitoring" : "等待触发"}</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{snapshot.planSummary.watching}</Text></Card>
          <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Near confirmation" : "即将触发"}</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{snapshot.planSummary.armed}</Text></Card>
          <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Orders / positions" : "委托或持仓"}</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{snapshot.planSummary.submittedOrOpen}</Text></Card>
          <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Closed today" : "今日结束"}</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{snapshot.planSummary.closedToday}</Text></Card>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {snapshot.publishedPlans.slice(0, 12).map((plan) => (
            <Card key={plan.id} padding="lg" className="space-y-4 border-primary/15">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Text variant="body" weight="semibold">{assetDisplaySymbol(plan.symbol)} · {memberCopy(plan.strategyLabel)} · {directionLabel(plan.direction, en)}</Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {en ? "Plan" : "计划"} V{plan.version} · {plan.tier === "FORMAL" ? (en ? "Formal plan" : "正式计划") : (en ? "Candidate watch" : "候选观察")} · {en ? "Published" : "发布"} {time(plan.publishedAt, en)}
                  </Text>
                </div>
                <Badge variant={publishedPlanBadge(plan)}>{plan.status}</Badge>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/[0.035] p-4">
                <Text variant="caption" color="tertiary">{en ? "Pre-trade thesis" : "事前逻辑"}</Text>
                <Text variant="body-sm" className="mt-1 block">{memberCopy(plan.thesisSummary)}</Text>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 p-3">
                  <Text variant="caption" color="tertiary">{en ? "Candidate entry zone" : "入场候选区"}</Text>
                  <Text variant="body-sm" className="mt-1 block">{number(plan.entryZoneLow, 4)} — {number(plan.entryZoneHigh, 4)}</Text>
                </div>
                <div className="rounded-lg border border-white/10 p-3">
                  <Text variant="caption" color="tertiary">{en ? "Protective stop" : "保护止损"}</Text>
                  <Text variant="body-sm" className="mt-1 block">{number(plan.protectiveStop, 4)}</Text>
                </div>
                <div className="rounded-lg border border-white/10 p-3 sm:col-span-2">
                  <Text variant="caption" color="tertiary">{en ? "Targets" : "目标"}</Text>
                  <Text variant="body-sm" className="mt-1 block">{number(plan.target1, 4)} / {number(plan.target2, 4)} / {number(plan.target3, 4)}</Text>
                </div>
              </div>

              <div className="space-y-2 text-sm text-white/70">
                <div><span className="text-white/45">{en ? "Final trigger: " : "最终触发："}</span>{memberCopy(plan.triggerRule)}</div>
                <div><span className="text-white/45">{en ? "Plan risk: " : "计划风险："}</span>{plan.riskPercent}% · {en ? "Maximum Demo leverage" : "最大模拟杠杆"} {plan.maxLeverage}x</div>
                <div><span className="text-white/45">{en ? "Current conditions: " : "当前条件："}</span>{plan.conditionsMet}/{plan.conditionsTotal} {en ? "met" : "项满足"} · {en ? "Distance to entry zone" : "距离候选区"} {plan.distanceToEntryPct == null ? "—" : `${number(plan.distanceToEntryPct, 2)}%`}</div>
                <div><span className="text-white/45">{en ? "Valid: " : "有效期："}</span>{time(plan.validFrom, en)} {en ? "to" : "至"} {time(plan.expiresAt, en)}</div>
                <div><span className="text-white/45">Bitget Demo: </span>{plan.bitgetOrderId ? `${en ? "Bound order" : "已绑定订单"} ${plan.bitgetOrderId}` : (en ? "No order submitted" : "尚未提交订单")}</div>
              </div>

              {plan.events.length ? (
                <div className="rounded-lg border border-white/10 bg-black/10 p-4">
                  <Text variant="caption" color="tertiary">{en ? "Full timeline" : "完整时间线"}</Text>
                  <div className="mt-3 space-y-2">
                    {plan.events.slice(-6).map((event) => (
                      <div key={event.id} className="grid grid-cols-[150px_1fr] gap-3 text-xs">
                        <span className="text-white/40">{time(event.eventAt, en)}</span>
                        <span className="text-white/70"><strong className="font-medium text-white/90">{memberCopy(event.title)}</strong> · {memberCopy(event.detail)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <Text variant="caption" color="tertiary">
                {en ? "This is a pre-trade plan, not evidence of a fill. No order is submitted until the trigger, publication timing and risk gates are satisfied. Content hash: " : "这是AI事前计划，不代表已经成交。未达到触发条件、事前发布时间或风险闸门要求时不会下单。内容哈希："}{plan.contentHash.slice(0, 12)}…
              </Text>
            </Card>
          ))}
        </div>
        {!snapshot.publishedPlans.length ? (
          <Card padding="lg">
            <Text variant="body" weight="semibold">{en ? "No structured plan has met the publication threshold" : "暂无达到发布门槛的结构化计划"}</Text>
            <Text variant="body-sm" color="secondary" className="mt-2 block">{en ? "The system continues scanning. Sub-threshold decisions remain in the audit log and are not published merely to keep the page active." : "系统仍会持续扫描；低于计划发布门槛的判断只保留在后台审计，不会为了页面活跃而强行生成计划。"}</Text>
          </Card>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          <Heading size="h3">{en ? "Three-horizon strategies" : "三周期策略"}</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 block">
            {en ? "Short-term, swing and medium-to-long-term strategies scan independently. Shadow monitoring records opportunities but never submits orders to Bitget." : "短线、波段和中长期独立扫描。影子观察只记录机会，不会向Bitget提交订单。"}
          </Text>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {snapshot.strategies.map((strategy) => {
            const latest = strategy.decisions[0];
            return (
              <Card key={strategy.strategyType} padding="lg" className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Text variant="body" weight="semibold">{memberCopy(strategy.label)}</Text>
                    <Text variant="caption" color="tertiary" className="mt-1 block">
                      {memberCopy(strategy.holdingLabel)} · {memberCopy(strategy.timeframeLabel)}
                    </Text>
                  </div>
                  <Badge variant={!strategy.enabled ? "outline" : strategy.mode === "DEMO" ? "warning" : "success"}>
                    {!strategy.enabled ? (en ? "Paused" : "已暂停") : memberCopy(strategy.modeLabel)}
                  </Badge>
                </div>
                <Text variant="body-sm" color="secondary">{memberCopy(strategy.description)}</Text>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg border border-white/10 p-3">
                    <Text variant="caption" color="tertiary">{en ? "Scans today" : "今日扫描"}</Text>
                    <Text variant="body-sm" className="mt-1 block">{strategy.stats.scansToday}{en ? "" : "次"}</Text>
                  </div>
                  <div className="rounded-lg border border-white/10 p-3">
                    <Text variant="caption" color="tertiary">{en ? "Shadow opportunities" : "影子机会"}</Text>
                    <Text variant="body-sm" className="mt-1 block">{strategy.stats.shadowReadyToday}{en ? "" : "次"}</Text>
                  </div>
                  <div className="rounded-lg border border-white/10 p-3">
                    <Text variant="caption" color="tertiary">{en ? "Order attempts" : "下单尝试"}</Text>
                    <Text variant="body-sm" className="mt-1 block">{strategy.stats.orderAttemptsToday}{en ? "" : "次"}</Text>
                  </div>
                  <div className="rounded-lg border border-white/10 p-3">
                    <Text variant="caption" color="tertiary">{en ? "Risk per trade" : "单笔风险"}</Text>
                    <Text variant="body-sm" className="mt-1 block">{strategy.riskPerTradePct}%</Text>
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/10 p-3">
                  <Text variant="caption" color="tertiary">{en ? "Latest decision" : "最近判断"}</Text>
                  <Text variant="body-sm" className="mt-1 block">
                    {latest
                      ? `${latest.symbol} · ${latest.status} · ${latest.conditionsMet}/${latest.conditionsTotal} ${en ? "met" : "项满足"}`
                      : (en ? "No scan completed yet" : "尚未完成首次扫描")}
                  </Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {latest?.rejectionReason ? memberCopy(latest.rejectionReason) : `${en ? "Last scan" : "最近扫描"}: ${time(strategy.lastScanAt, en)}`}
                  </Text>
                </div>
              </Card>
            );
          })}
        </div>
        {!snapshot.strategies.length ? (
          <Card padding="lg"><Text variant="body-sm" color="secondary">{en ? "Three-horizon strategies are initializing." : "三周期策略正在初始化。"}</Text></Card>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          <Heading size="h3">{en ? "Current monitored plans" : "AI当前计划"}</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 block">
            {en ? "The weekly outlook sets the primary direction, the daily outlook sets entry rhythm, and a 15-minute structure must confirm before a simulated position can open." : "周预测决定主方向，日预测决定进场节奏，15分钟结构确认后才允许开仓。"}
          </Text>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {snapshot.plans.map((plan) => (
            <Card key={plan.symbol} padding="lg" className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Text variant="body" weight="semibold">{en ? assetNameEn(plan.assetName) : assetDisplayName(plan.symbol, plan.assetName)} · {assetDisplaySymbol(plan.symbol)}</Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {assetVenue(plan.symbol)} · {en ? "Reference" : "参考价"} {plan.currentPrice == null ? (en ? "Data unavailable" : "行情未连接") : number(plan.currentPrice, 4)} · {en ? "Confidence" : "置信度"} {plan.confidence}%
                  </Text>
                </div>
                <Badge variant={planBadge(plan)}>{en ? statusEn(plan.statusLabel) : plan.statusLabel}</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-white/10 p-3">
                  <Text variant="caption" color="tertiary">{en ? "Weekly direction" : "周度方向"}</Text>
                  <Text variant="body-sm" className="mt-1 block">{memberCopy(plan.weeklyText)}</Text>
                </div>
                <div className="rounded-lg border border-white/10 p-3">
                  <Text variant="caption" color="tertiary">{en ? "Intraday rhythm" : "日内节奏"}</Text>
                  <Text variant="body-sm" className="mt-1 block">{memberCopy(plan.dailyText)}</Text>
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/[0.035] p-4">
                <Text variant="caption" color="tertiary">{en ? "Current system action" : "当前系统动作"}</Text>
                <Text variant="body-sm" className="mt-1 block">{memberCopy(plan.actionText)}</Text>
              </div>

              <div className="space-y-2 text-sm text-white/70">
                <div><span className="text-white/45">{en ? "Trigger: " : "触发条件："}</span>{memberCopy(plan.triggerText)}</div>
                <div><span className="text-white/45">{en ? "Invalidation: " : "失效条件："}</span>{memberCopy(plan.invalidationText)}</div>
                {plan.keyLevel != null ? <div><span className="text-white/45">{en ? "Key level: " : "关键点位："}</span>{number(plan.keyLevel, 4)}</div> : null}
                <div><span className="text-white/45">{en ? "Last checked: " : "最近检查："}</span>{time(plan.lastCheckedAt, en)}</div>
              </div>
            </Card>
          ))}
        </div>
        {!snapshot.plans.length ? (
          <Card padding="lg"><Text variant="body-sm" color="secondary">{en ? "No monitored plan is currently available for publication." : "暂无可公开的AI交易计划。"}</Text></Card>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          <Heading size="h3">{en ? "Current Bitget Demo positions" : "Bitget 模拟交易当前持仓"}</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 block">
            {en ? "Demo positions are synchronized without exposing API keys, total account assets or real position size." : "同步读取模拟交易持仓；不公开API密钥、账户总资产和实际持仓数量。"}
          </Text>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {snapshot.positions.map((position) => (
            <Card key={`${position.symbol}-${position.direction}`} padding="lg" className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Text variant="body" weight="semibold">{assetDisplayName(position.symbol)} · {assetDisplaySymbol(position.symbol)}</Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {assetVenue(position.symbol)} · {position.marginMode} · {position.leverage}x · {en ? "Opened" : "开仓"} {time(position.openedAt, en)}
                  </Text>
                </div>
                <Badge variant={position.direction === "LONG" ? "success" : "danger"}>
                  {position.direction === "LONG" ? (en ? "Long" : "多单") : (en ? "Short" : "空单")}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div><Text variant="caption" color="tertiary">{en ? "Average entry" : "开仓均价"}</Text><Text variant="body-sm" className="mt-1 block">{number(position.averageEntryPrice, 4)}</Text></div>
                <div><Text variant="caption" color="tertiary">{en ? "Mark price" : "标记价格"}</Text><Text variant="body-sm" className="mt-1 block">{number(position.markPrice, 4)}</Text></div>
                <div><Text variant="caption" color="tertiary">{en ? "Unrealized return" : "浮动收益率"}</Text><Text variant="body-sm" className={`mt-1 block ${position.profitRatePct >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(position.profitRatePct)}</Text></div>
                <div><Text variant="caption" color="tertiary">{en ? "Risk protection" : "风险保护"}</Text><Text variant="body-sm" className="mt-1 block">{position.riskSource === "BITGET_ORDER" ? (en ? "Exchange order" : "交易所挂单") : (en ? "System plan" : "系统计划")}</Text></div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-red-400/20 bg-red-400/[0.035] p-3"><Text variant="caption" color="tertiary">{en ? "Stop loss" : "止损"}</Text><Text variant="body-sm" className="mt-1 block">{number(position.stopLoss, 4)}</Text></div>
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.035] p-3"><Text variant="caption" color="tertiary">{en ? "First take-profit" : "第一止盈"}</Text><Text variant="body-sm" className="mt-1 block">{number(position.takeProfit, 4)}</Text></div>
              </div>
              {position.unrealisedPnlUsdt != null ? <Text variant="caption" color="tertiary">{en ? "Unrealized PnL: " : "未实现盈亏："}{signed(position.unrealisedPnlUsdt, " USDT")}</Text> : null}
            </Card>
          ))}
        </div>
        {!snapshot.positions.length ? (
          <Card padding="lg"><Text variant="body-sm" color="secondary">{en ? "There are no open Demo positions." : "当前没有模拟持仓。"}</Text></Card>
        ) : null}
      </section>

      {snapshot.stats.closedTrades > 0 ? (
      <section className="space-y-4">
        <Heading size="h3">{en ? "Strategy performance" : "策略表现"}</Heading>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Closed trades" : "已结束交易"}</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{snapshot.stats.closedTrades}</Text></Card>
          <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Win rate" : "胜率"}</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{snapshot.stats.winRatePct == null ? "—" : `${number(snapshot.stats.winRatePct, 1)}%`}</Text></Card>
          <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Average trade return" : "平均逐笔收益"}</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{signed(snapshot.stats.averageReturnPct)}</Text></Card>
          <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Best / worst" : "最佳 / 最差"}</Text><Text variant="body-sm" className="mt-1 block">{signed(snapshot.stats.bestReturnPct)} / {signed(snapshot.stats.worstReturnPct)}</Text></Card>
          <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Trade-curve drawdown" : "逐笔收益曲线回撤"}</Text><Text variant="body" weight="semibold" className="mt-1 block text-xl">{snapshot.stats.tradeCurveMaxDrawdownPct == null ? "—" : `${number(snapshot.stats.tradeCurveMaxDrawdownPct)}%`}</Text></Card>
        </div>
        <Text variant="caption" color="tertiary">
          {en ? "Drawdown is constructed from per-trade returns for strategy comparison and is not the same as account-equity drawdown." : "回撤按每笔成交收益率构造，仅用于比较策略稳定性，不等同于账户净值回撤。"}
        </Text>
      </section>

      ) : (
        <section className="space-y-4">
          <Heading size="h3">{en ? "Strategy performance" : "策略表现"}</Heading>
          <Card padding="lg">
            <Text variant="body" weight="semibold">{en ? "Trade samples are still accumulating" : "交易样本正在积累"}</Text>
            <Text variant="body-sm" color="secondary" className="mt-2">{en ? "Win rate, returns and drawdown will appear after the first completed Demo trade." : "完成第一笔模拟交易后再显示胜率、收益与回撤。"}</Text>
          </Card>
        </section>
      )}

      <section className="space-y-4">
        <Heading size="h3">{en ? "Recent completed trades" : "最近结束交易"}</Heading>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.025] text-white/45">
              <tr>
                <th className="px-4 py-3">{en ? "Time" : "时间"}</th>
                <th className="px-4 py-3">{en ? "Asset" : "品种"}</th>
                <th className="px-4 py-3">{en ? "Direction" : "方向"}</th>
                <th className="px-4 py-3">{en ? "Open" : "开仓"}</th>
                <th className="px-4 py-3">{en ? "Close" : "平仓"}</th>
                <th className="px-4 py-3">{en ? "Result" : "结果"}</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.recentTrades.map((trade) => (
                <tr key={trade.id} className="border-b border-white/[0.06] last:border-0">
                  <td className="px-4 py-3 text-white/60">{time(trade.closedAt, en)}</td>
                  <td className="px-4 py-3">{assetDisplayName(trade.symbol)} · {assetDisplaySymbol(trade.symbol)}</td>
                  <td className="px-4 py-3">{trade.direction === "LONG" ? (en ? "Long" : "做多") : (en ? "Short" : "做空")}</td>
                  <td className="px-4 py-3">{number(trade.openPrice, 4)}</td>
                  <td className="px-4 py-3">{number(trade.closePrice, 4)}</td>
                  <td className={`px-4 py-3 ${trade.returnPct >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(trade.returnPct)}{trade.netProfitUsdt != null ? ` · ${signed(trade.netProfitUsdt, " USDT")}` : ""}</td>
                </tr>
              ))}
              {!snapshot.recentTrades.length ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-white/45">{en ? "No completed Demo trades yet." : "暂无已经结束的模拟交易。"}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <Card padding="md" className="border-amber-400/20 bg-amber-400/[0.035]">
        <Text variant="caption" color="secondary">
          {en ? "This section displays simulated trading records. It is not a return promise or personalized investment advice. Users remain responsible for their own decisions and risk." : "本栏目展示模拟交易记录，不构成收益承诺或个性化投资建议。会员可参考策略，但应自行决定是否交易并承担风险。"}
        </Text>
      </Card>
    </div>
  );
}
