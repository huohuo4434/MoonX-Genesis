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
  const refreshPresentation = memberDeskRefreshPresentation(error, en);
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
    return startMemberDeskPolling({
      read: readSnapshot,
      onSnapshot: (next) => { setSnapshot(next); setError(""); },
      onError: (reason) => setError(reason instanceof Error ? reason.message : "刷新失败"),
      intervalMs: 30_000,
      setIntervalFn: window.setInterval.bind(window),
      clearIntervalFn: window.clearInterval.bind(window),
    });
  }, []);

  return (
    <div className="space-y-5">
      <Card padding="lg" className="border-primary/20 bg-gradient-to-r from-primary/[0.04] to-transparent">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Heading size="h2">{en ? "AI Trading Desk" : "AI交易执行台"}</Heading>
              <Badge variant={live ? "danger" : "warning"}>{live ? (en ? "LIVE FUNDS" : "实盘") : "DEMO"}</Badge>
              <Badge variant="success">{en ? "ACTIVE MODE" : "主动交易模式"}</Badge>
            </div>
            <Text variant="body-sm" color="secondary" className="mt-2 block max-w-3xl">
              {en
                ? "MOOX sets the weekly path first. The AI then chooses the entry, stop and targets from live technical structure. The formal live universe contains 12 allowed instruments; all are scanned and a dynamic Top 10 is ranked for execution."
                : "先由MOOX玄学研究锁定唯一方向，再由AI用实时技术结构寻找入场、止损和止盈位置。技术分析不参与多空方向投票。正式允许池共12个品种全部扫描，动态Top10进入候选排序。"}
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(snapshot, refreshPresentation.stale)}>
              {refreshPresentation.statusLabel ?? snapshot.operationalStateLabel}
            </Badge>
            <Badge variant="outline">{en ? "Daily target: ≥1 qualified activation" : "每日目标：≥1个合格激活机会"}</Badge>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/[0.08] bg-black/10 p-3"><Text variant="caption" color="tertiary">{en ? "Today PnL" : "今日盈亏"}</Text><Text variant="body" weight="semibold" className={`mt-1 block ${(snapshot.experiment.dailyPnlUsdt ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(snapshot.experiment.dailyPnlUsdt, " USDT")}</Text></div>
          <div className="rounded-xl border border-white/[0.08] bg-black/10 p-3"><Text variant="caption" color="tertiary">{en ? "Total PnL" : "累计盈亏"}</Text><Text variant="body" weight="semibold" className={`mt-1 block ${(snapshot.experiment.pnlUsdt ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(snapshot.experiment.pnlUsdt, " USDT")}</Text></div>
          <div className="rounded-xl border border-white/[0.08] bg-black/10 p-3"><Text variant="caption" color="tertiary">{en ? "Trades today" : "今日交易"}</Text><Text variant="body" weight="semibold" className="mt-1 block">{todayTrades}</Text></div>
          <div className="rounded-xl border border-white/[0.08] bg-black/10 p-3"><Text variant="caption" color="tertiary">{en ? "Open positions" : "当前持仓"}</Text><Text variant="body" weight="semibold" className="mt-1 block">{snapshot.positions.length}</Text></div>
        </div>

        <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/10 p-3 text-xs text-white/55">
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <span>{en ? "Display layer" : "展示层"}：MEMBER_FEED</span>
            <span>{en ? "Data source" : "数据源"}：{live ? "LIVE_EXPERIMENT" : "PAPER"}</span>
            <span>{en ? "Snapshot (Beijing)" : "快照时间（北京时间）"}：{formatBeijingDeskTime(snapshot.lastSyncedAt ?? snapshot.generatedAt)}</span>
            <span>{en ? "Initial equity" : "初始资金"}：{number(snapshot.experiment.initialEquityUsdt)} USDT</span>
            <span>{en ? "Quote age" : "行情延迟"}：{snapshot.runtime.quoteAgeSeconds == null ? "—" : `${snapshot.runtime.quoteAgeSeconds}s`}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-white/45">
            <span>{en ? "Latest market" : "最新行情"}：{formatBeijingDeskTime(snapshot.latestQuoteAt)}</span>
            <span className={refreshPresentation.stale ? "text-red-300" : ""}>
              {en ? "Server" : "服务器"}：{refreshPresentation.serverLabel
                ? refreshPresentation.serverLabel
                : snapshot.serverHealthy ? (en ? "healthy" : "正常") : (en ? "attention" : "需检查")}
            </span>
            <span className={snapshot.syncStatus === "ERROR" || error ? "text-red-300" : ""}>{error || snapshot.syncMessage}</span>
          </div>
        </div>
      </Card>

      <AiTradeIntentBoard
        locale={en ? "en" : "zh"}
        showHistory
        dashboard={focusDashboard}
      />

      <Card padding="lg" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Heading size="h3">{en ? "Open positions" : "当前持仓"}</Heading>
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
              {!snapshot.positions.length ? <tr><td colSpan={7} className="px-4 py-7 text-center text-white/45">{en ? "No open position." : "当前没有持仓，AI正在从动态候选池寻找下一笔。"}</td></tr> : null}
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
          <div className="rounded-lg border border-white/[0.07] p-3">{en ? "Market" : "行情"}：{snapshot.quoteReady ? (en ? "ready" : "正常") : (en ? "delayed" : "延迟")}</div>
          <div className="rounded-lg border border-white/[0.07] p-3">{en ? "Heartbeat" : "心跳"}：{formatBeijingDeskTime(snapshot.runtime.lastHeartbeatAt)}</div>
          <div className="rounded-lg border border-white/[0.07] p-3">{en ? "Execution" : "执行"}：{snapshot.executionAllowed ? (en ? "allowed" : "已授权") : (en ? "blocked" : "未授权")}</div>
          <div className="rounded-lg border border-white/[0.07] p-3">{en ? "Universe" : "候选池"}：{en ? "dynamic Top 10 from allow-list" : "允许池动态Top10"}</div>
        </div>
        <Text variant="caption" color="secondary" className="mt-3 block leading-5">
          {en
            ? "The activity target searches for at least one qualified activation each day. It never bypasses account permission, position conflicts, loss limits, protection orders, stale data or exchange errors."
            : "系统每天主动寻找至少1个合格激活机会；但账户权限、已有仓位、亏损上限、保护单、数据新鲜度和交易所错误仍是硬闸门，不能为了凑单绕过。"}
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
