"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Heading, Text } from "@/components/ui";
import { AiTradeIntentBoard } from "@/components/trading/AiTradeIntentBoard";
import { aiTradingAssetName } from "@/lib/trading-signals/ai-trading-focus";
import { assetDisplaySymbol } from "@/lib/presentation/asset-catalog";
import { formatBeijingDeskTime } from "@/lib/presentation/member-desk-time-core";
import { memberDeskRefreshPresentation, startMemberDeskPolling } from "@/lib/member-ai-desk-polling-core";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { AiTradingDeskPosition, AiTradingDeskSnapshot, AiTradingDeskTrade } from "@/types/ai-trading-desk";

function number(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function signed(value: number | null | undefined, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${number(value, 2)}${suffix}`;
}

async function readSnapshot(signal?: AbortSignal): Promise<AiTradingDeskSnapshot> {
  const response = await fetch("/api/member/ai-trading-desk", {
    cache: "no-store",
    signal,
    headers: { Accept: "application/json" },
  });
  const json = (await response.json()) as AiTradingDeskSnapshot & { error?: string };
  if (!response.ok || json.error) throw new Error(json.error || "读取失败");
  return json;
}

function statusVariant(snapshot: AiTradingDeskSnapshot, refreshFailed = false) {
  if (refreshFailed) return "danger" as const;
  if (["LIVE_POSITION", "SIMULATION_POSITION", "WAITING_ENTRY"].includes(snapshot.operationalState)) return "success" as const;
  if (["CONNECTING", "DATA_DELAYED", "PLAN_ONLY"].includes(snapshot.operationalState)) return "warning" as const;
  if (snapshot.operationalState === "PAUSED") return "outline" as const;
  return "danger" as const;
}

export function AiTradingDeskClient({ initial }: { initial: AiTradingDeskSnapshot }) {
  const { locale } = useLocale();
  const en = locale === "en";
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState<number>(NaN);
  const syncError = snapshot.syncStatus === "ERROR" || snapshot.syncStatus === "PARTIAL"
    ? snapshot.syncMessage || (en ? "Snapshot needs verification" : "快照待核验") : "";
  const refreshPresentation = memberDeskRefreshPresentation(error || syncError, en, { lastSyncedAt: snapshot.lastSyncedAt, nowMs: checkedAt });
  const stale = refreshPresentation.stale;
  const live = snapshot.mode === "BITGET_LIVE_EXPERIMENT";
  const dailyRows = snapshot.experiment.dailyHistory ?? [];
  const todayTrades = dailyRows.length
    ? (dailyRows[dailyRows.length - 1]?.trades ?? 0)
    : snapshot.planSummary.closedToday + snapshot.planSummary.submittedOrOpen;
  // Keep this as a named structural value rather than an inline object literal.
  // Current MOOX requires `quotes`; older compatible dashboards did not.
  // A named value satisfies both contracts while still supplying the current required field.
  const focusDashboard = {
    databaseReady: true,
    generatedAt: snapshot.generatedAt,
    summary: snapshot.planSummary,
    decisions: snapshot.intentDecisions ?? [],
    quotes: [],
    plans: snapshot.publishedPlans ?? [],
    notice: en ? "Plans are locked before execution." : "计划在执行前锁定。",
  };

  useEffect(() => {
    setCheckedAt(Date.now());
    const ageTimer = window.setInterval(() => setCheckedAt(Date.now()), 30_000);
    const stopPolling = startMemberDeskPolling({
      read: readSnapshot,
      onSnapshot: (next) => { setSnapshot(next); setError(""); },
      onError: (reason) => setError(reason instanceof Error ? reason.message : "刷新失败"),
      intervalMs: 30_000,
      setIntervalFn: window.setInterval.bind(window),
      clearIntervalFn: window.clearInterval.bind(window),
    });
    return () => { stopPolling(); window.clearInterval(ageTimer); };
  }, []);

  if (!snapshot.settings.enabled) return <Card padding="lg"><Heading size="h2">{en ? "Member trading display is unavailable" : "会员交易展示暂未开放"}</Heading><Text className="mt-3 block">{en ? "Display settings are unavailable or have been disabled. This does not change server trading controls. The page checks again automatically." : "展示设置暂不可用或已由管理员关闭。这不会改变服务器交易开关；页面会自动重新检查。"}</Text></Card>;

  return (
    <div className="space-y-5">
      <Card padding="lg" data-conclusion-first="1" className="border-primary/20 bg-gradient-to-r from-primary/[0.04] to-transparent">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{en ? "Execution summary" : "执行结论"}</Badge>
              <Heading size="h2">{en ? "AI Trading Desk" : "AI交易执行台"}</Heading>
              <Badge variant={live ? "danger" : "warning"}>{live ? (en ? "LIVE FUNDS" : "实盘") : "DEMO"}</Badge>
              <Badge variant="outline">{en ? "FORECAST ≠ ORDER" : "预测观点 ≠ 已执行订单"}</Badge>
            </div>
            <Text variant="body-sm" color="secondary" className="mt-2 block max-w-3xl">
              {en
                ? "MOOX sets the weekly path first. The AI then chooses the entry, stop and targets from live technical structure. The formal live universe contains 18 exact Bitget instruments; all are scanned and ranked before execution."
                : "先由MOOX研究锁定唯一方向，再由AI用实时技术结构寻找入场、止损和止盈位置。技术分析不参与多空方向投票。正式允许池共18个Bitget精确合约全部扫描，并在执行前统一排名。"}
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(snapshot, refreshPresentation.stale)}>
              {refreshPresentation.statusLabel ?? snapshot.operationalStateLabel}
            </Badge>
            <Badge variant="outline">{en ? "Cadence caps: 5/day · 5/week · 5/month" : "节奏上限：短5/日 · 中5/周 · 长5/月"}</Badge>
          </div>
        </div>

        {stale ? <div role="status" className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100" data-stale-desk="1">{en ? "This is an old or unverified snapshot, not the current account state. Current PnL, position count and trade candidates are withheld. Historical positions below do not mean they are still open. The page retries automatically; no trading settings are changed." : "当前为过期或未核验快照，不是账户实时状态。今日盈亏、当前持仓数及交易候选暂不展示；下方历史持仓不代表现在仍持有。页面会自动重试，不会因此改变交易开关。"}</div> : null}
        {!stale ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/[0.08] bg-black/10 p-3"><Text variant="caption" color="tertiary">{en ? "Today PnL" : "今日盈亏"}</Text><Text variant="body" weight="semibold" className={`mt-1 block ${(snapshot.experiment.dailyPnlUsdt ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(snapshot.experiment.dailyPnlUsdt, " USDT")}</Text></div>
          <div className="rounded-xl border border-white/[0.08] bg-black/10 p-3"><Text variant="caption" color="tertiary">{en ? "Total PnL" : "累计盈亏"}</Text><Text variant="body" weight="semibold" className={`mt-1 block ${(snapshot.experiment.pnlUsdt ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(snapshot.experiment.pnlUsdt, " USDT")}</Text></div>
          <div className="rounded-xl border border-white/[0.08] bg-black/10 p-3"><Text variant="caption" color="tertiary">{en ? "Trades today" : "今日交易"}</Text><Text variant="body" weight="semibold" className="mt-1 block">{todayTrades}</Text></div>
          <div className="rounded-xl border border-white/[0.08] bg-black/10 p-3"><Text variant="caption" color="tertiary">{en ? "Open positions" : "当前持仓"}</Text><Text variant="body" weight="semibold" className="mt-1 block">{snapshot.positions.length}</Text></div>
        </div> : null}

        <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/10 p-3 text-xs text-white/55">
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <span>{en ? "Display layer" : "展示层"}：MEMBER_FEED</span>
            <span>{en ? "Data source" : "数据源"}：{live ? "LIVE_EXPERIMENT" : "PAPER"}</span>
            <span>{en ? "Last successful sync (Beijing)" : "最近成功同步（北京时间）"}：{formatBeijingDeskTime(snapshot.lastSyncedAt)}</span>
            <span>{en ? "Account equity and order sizes are private" : "账户总资产及真实持仓数量不公开"}</span>
            <span>{en ? "Quote age within snapshot" : "快照内行情延迟"}：{snapshot.runtime.quoteAgeSeconds == null ? "—" : `${snapshot.runtime.quoteAgeSeconds}s`}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-white/45">
            <span>{en ? "Latest market" : "最新行情"}：{formatBeijingDeskTime(snapshot.latestQuoteAt)}</span>
            <span className={refreshPresentation.stale ? "text-red-300" : ""}>
              {en ? "Server" : "服务器"}：{refreshPresentation.serverLabel
                ? refreshPresentation.serverLabel
                : snapshot.serverHealthy ? (en ? "healthy" : "正常") : (en ? "attention" : "需检查")}
            </span>
            <span className={snapshot.syncStatus === "ERROR" || stale ? "text-red-300" : ""}>{stale ? refreshPresentation.statusLabel : snapshot.syncMessage}</span>
          </div>
        </div>
      </Card>

      {!stale ? <AiTradeIntentBoard
        locale={en ? "en" : "zh"}
        showHistory
        dashboard={focusDashboard}
      /> : null}

      <div className="rounded-xl border border-white/10 p-4 text-sm leading-6 text-foreground-secondary" data-trade-reading-guide="1">
        <p className="font-semibold text-foreground">{en ? "Why a bullish forecast can still end in a stopped-out long" : "为什么预测看涨，多单仍可能止损？"}</p>
        <p className="mt-2">{en ? "A forecast describes an asset over a dated period. A trade has its own entry, holding horizon and risk limit. A later rebound does not justify keeping a failed short-term trade open. Review the order record to determine whether an exit followed the plan." : "预测说的是某个标的在一段时间里的走势；每笔订单另有入场位置、持仓周期和风险上限。预计后面反弹，不等于短线失败后可以一直拿着。退出是否合理，要核对该笔订单记录，不能只看之后涨没涨。"}</p>
        <p className="mt-2">{en ? "Read in order: snapshot time → execution status → plan horizon and conditions → actual fills. A candidate or an armed plan is not an order; account and risk checks still apply." : "阅读顺序：快照时间 → 执行状态 → 计划周期与条件 → 实际成交。候选、已武装都不等于已经下单，仍需通过账户与风险检查。"}</p>
      </div>

      <Card padding="lg" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Heading size="h3">{stale ? (en ? "Historical snapshot positions · not current" : "历史快照持仓 · 不代表当前") : (en ? "Open positions" : "当前持仓")}</Heading>
          <Badge variant="outline">{snapshot.positions.length}</Badge>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-white/[0.02] text-white/45"><tr><th className="px-3 py-3">{en ? "Asset" : "品种"}</th><th className="px-3 py-3">{en ? "Side" : "方向"}</th><th className="px-3 py-3">{en ? "Entry" : "开仓"}</th><th className="px-3 py-3">{en ? "Mark" : "现价"}</th><th className="px-3 py-3">PnL</th><th className="px-3 py-3">{en ? "Stop" : "止损"}</th><th className="px-3 py-3">{en ? "Target" : "止盈"}</th></tr></thead>
            <tbody>
              {snapshot.positions.map((position: AiTradingDeskPosition) => (
                <tr key={`${position.symbol}-${position.direction}`} className="border-b border-white/[0.055] last:border-0">
                  <td className="px-3 py-3"><span className="font-medium">{aiTradingAssetName(position.symbol, en)}</span><span className="ml-2 text-xs text-white/35">{assetDisplaySymbol(position.symbol)}</span></td>
                  <td className="px-3 py-3"><Badge variant={position.direction === "LONG" ? "success" : "danger"}>{position.direction === "LONG" ? (en ? "Long" : "多") : (en ? "Short" : "空")}</Badge></td>
                  <td className="px-3 py-3">{number(position.averageEntryPrice)}</td>
                  <td className="px-3 py-3">{number(position.markPrice)}</td>
                  <td className={`px-3 py-3 ${(position.unrealisedPnlUsdt ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(position.unrealisedPnlUsdt, " U")}</td>
                  <td className="px-3 py-3 text-red-300">{number(position.stopLoss)}</td>
                  <td className="px-3 py-3 text-emerald-300">{number(position.takeProfit)}</td>
                </tr>
              ))}
              {!snapshot.positions.length ? <tr><td colSpan={7} className="px-4 py-7 text-center text-white/45">{en ? "This snapshot contains no open position. Check its timestamp and the execution status above; candidate scanning does not mean new entries are enabled." : "本快照未列出持仓。请同时核对快照时间与上方执行状态；扫描候选不代表已经允许新开仓。"}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>

      <details className="rounded-2xl border border-white/[0.08] bg-white/[0.015] px-4 py-4">
        <summary className="cursor-pointer font-medium text-white/75">{en ? "Performance & completed trades" : "成绩与已结束交易"}</summary>
        <div className="mt-4 space-y-4">
          <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="min-w-[650px] w-full text-left text-sm">
              <thead className="border-b border-white/[0.08] text-white/45"><tr><th className="px-3 py-3">{en ? "Date" : "日期"}</th><th className="px-3 py-3">{en ? "Opening" : "日初权益"}</th><th className="px-3 py-3">{en ? "Latest" : "最新权益"}</th><th className="px-3 py-3">PnL</th><th className="px-3 py-3">{en ? "Trades" : "交易"}</th></tr></thead>
              <tbody>{dailyRows.map((row: AiTradingDeskSnapshot["experiment"]["dailyHistory"][number]) => <tr key={row.date} className="border-b border-white/[0.05] last:border-0"><td className="px-3 py-3">{row.date}</td><td className="px-3 py-3">{number(row.openingEquityUsdt)}</td><td className="px-3 py-3">{number(row.closingEquityUsdt)}</td><td className={`px-3 py-3 ${row.pnlUsdt >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(row.pnlUsdt, " U")}</td><td className="px-3 py-3">{row.trades}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="min-w-[650px] w-full text-left text-sm">
              <thead className="border-b border-white/[0.08] text-white/45"><tr><th className="px-3 py-3">{en ? "Time" : "时间"}</th><th className="px-3 py-3">{en ? "Asset" : "品种"}</th><th className="px-3 py-3">{en ? "Side" : "方向"}</th><th className="px-3 py-3">{en ? "Result" : "结果"}</th></tr></thead>
              <tbody>{snapshot.recentTrades.map((trade: AiTradingDeskTrade) => <tr key={trade.id} className="border-b border-white/[0.05] last:border-0"><td className="px-3 py-3 text-white/55">{formatBeijingDeskTime(trade.closedAt)}</td><td className="px-3 py-3">{aiTradingAssetName(trade.symbol, en)}</td><td className="px-3 py-3">{trade.direction === "LONG" ? (en ? "Long" : "多") : (en ? "Short" : "空")}</td><td className={`px-3 py-3 ${(trade.netProfitUsdt ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(trade.netProfitUsdt, " U")}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </details>

      <details className="rounded-2xl border border-white/[0.08] bg-white/[0.015] px-4 py-4">
        <summary className="cursor-pointer font-medium text-white/75">{en ? "System & risk details" : "系统与风控详情"}</summary>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4 text-sm text-white/60">
          <div className="rounded-lg border border-white/[0.07] p-3">{en ? "Market" : "行情"}：{stale ? (en ? "unverified" : "待重新核验") : snapshot.quoteReady ? (en ? "ready" : "正常") : (en ? "delayed" : "延迟")}</div>
          <div className="rounded-lg border border-white/[0.07] p-3">{en ? "Heartbeat" : "心跳"}：{formatBeijingDeskTime(snapshot.runtime.lastHeartbeatAt)}</div>
          <div className="rounded-lg border border-white/[0.07] p-3">{en ? "Execution" : "执行"}：{stale ? (en ? "unverified" : "待重新核验") : snapshot.executionAllowed ? (en ? "allowed" : "已授权") : (en ? "blocked" : "未授权")}</div>
          <div className="rounded-lg border border-white/[0.07] p-3">{en ? "Universe" : "候选池"}：{en ? "dynamic Top 10 from allow-list" : "允许池动态Top10"}</div>
        </div>
        <Text variant="caption" color="secondary" className="mt-3 block leading-5">
          {en
            ? "Ultra-short setups are scanned every minute, targeting 1–5 qualified orders a day. The 30-minute structure supplies context, the five-minute chart identifies the setup, and a closed one-minute candle can trigger execution without creating or reversing the formal direction. Stale trades exit after 60 minutes and every ultra-short trade has a 90-minute hard time limit."
            : "超短线每分钟扫描，日目标1—5笔；30分钟提供方向背景，5分钟识别结构，1分钟收盘负责最终触发，但不能创造或反转正式方向。持仓60分钟仍未推进0.25R就退出，90分钟无条件时间退出；计划锁、持仓冲突、亏损上限、保护单与数据新鲜度仍是硬闸门。"}
        </Text>
      </details>

      <Card padding="md" className={live ? "border-red-400/20 bg-red-400/[0.035]" : "border-white/[0.08]"}>
        <Text variant="caption" color="secondary">
          {live
            ? (en ? "Real funds are in use. Risk controls reduce exposure but cannot eliminate loss." : "当前使用真实资金。主动交易不是强制乱下单；风险控制只能降低暴露，不能消除亏损。")
            : (en ? "Demo records only." : "当前为模拟记录。")}
        </Text>
      </Card>
    </div>
  );
}
