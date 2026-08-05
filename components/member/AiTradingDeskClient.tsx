"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Card, Heading, Text } from "@/components/ui";
import { AiTradeIntentBoard } from "@/components/trading/AiTradeIntentBoard";
import type { AiTradingDeskSnapshot } from "@/types/ai-trading-desk";
import { assetDisplayName, assetDisplaySymbol } from "@/lib/presentation/asset-catalog";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const LIVE_ASSETS = [
  ["BTCUSDT", "比特币", "Bitcoin"],
  ["ETHUSDT", "以太坊", "Ether"],
  ["HYPEUSDT", "HYPE", "HYPE"],
  ["MUUSDT", "美光", "Micron"],
  ["QQQUSDT", "纳指QQQ", "Nasdaq QQQ"],
  ["XAUTUSDT", "黄金", "Gold"],
  ["XAGUSDT", "白银", "Silver"],
  ["GOOGLUSDT", "谷歌", "Google"],
  ["CLUSDT", "WTI原油", "WTI Crude"],
  ["SPYUSDT", "标普", "S&P 500 SPY"],
] as const;

function liveAssetName(symbol: string, en: boolean): string {
  const row = LIVE_ASSETS.find(([code]) => code === symbol.toUpperCase());
  return row ? row[en ? 2 : 1] : assetDisplayName(symbol);
}

function number(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

function signed(value: number | null, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${number(value, 2)}${suffix}`;
}

function time(value: string | null, en: boolean): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(en ? "en-GB" : "zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

async function readSnapshot(): Promise<AiTradingDeskSnapshot> {
  const response = await fetch("/api/member/ai-trading-desk", { cache: "no-store", headers: { Accept: "application/json" } });
  const json = (await response.json()) as AiTradingDeskSnapshot & { error?: string };
  if (!response.ok || json.error) throw new Error(json.error || "读取失败");
  return json;
}


function statusVariant(snapshot: AiTradingDeskSnapshot) {
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
  const live = snapshot.mode === "BITGET_LIVE_EXPERIMENT";

  useEffect(() => {
    const timer = window.setInterval(() => {
      void readSnapshot().then((next) => {
        setSnapshot(next);
        setError("");
      }).catch((reason) => setError(reason instanceof Error ? reason.message : "刷新失败"));
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);


  const experimentDay = useMemo(() => {
    if (!snapshot.experiment.startedAt) return 0;
    const elapsed = Math.max(0, Date.now() - Date.parse(snapshot.experiment.startedAt));
    return Math.min(30, Math.floor(elapsed / 86_400_000) + 1);
  }, [snapshot.experiment.startedAt]);

  const experimentStatus = snapshot.experiment.status;
  const experimentLabel = en
    ? ({ DISABLED: "Disabled", NOT_STARTED: "Not started", ACTIVE: "Running", COMPLETED: "Completed", STOPPED: "Stopped" } as const)[experimentStatus]
    : ({ DISABLED: "未启用", NOT_STARTED: "待启动", ACTIVE: "运行中", COMPLETED: "已结束", STOPPED: "已止损停止" } as const)[experimentStatus];

  return (
    <div className="space-y-6">
      <Card padding="lg" className="space-y-5 border-primary/25 bg-primary/[0.025]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Heading size="h2">{live ? (en ? "Bitget Live Experiment" : "Bitget 实盘实验") : (en ? "Bitget Demo Experiment" : "Bitget 模拟实验")}</Heading>
              <Badge variant={live ? "danger" : "warning"}>{live ? (en ? "REAL FUNDS" : "真实资金") : "DEMO"}</Badge>
            </div>
            <Text variant="body-sm" color="secondary" className="mt-2 block max-w-3xl">
              {live
                ? (en ? "A 30-day, 1,000 USDT futures experiment across ten markets. Daily and cumulative results are published here." : "1000 USDT、30天、十品种合约实盘实验。每日盈亏、累计收益率与最大回撤固定公开。")
                : (en ? "A simplified simulated trading experiment." : "简化后的模拟交易实验。")}
            </Text>
          </div>
          <Badge variant={statusVariant(snapshot)}>{snapshot.operationalStateLabel}</Badge>
        </div>

        {live ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <Card padding="md" className="border-primary/20"><Text variant="caption" color="tertiary">{en ? "Today PnL" : "今日盈亏"}</Text><Text variant="body" weight="semibold" className={`mt-1 block ${(snapshot.experiment.dailyPnlUsdt ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(snapshot.experiment.dailyPnlUsdt, " USDT")} · {signed(snapshot.experiment.dailyPnlPct, "%")}</Text></Card>
              <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Total PnL" : "累计盈亏"}</Text><Text variant="body" weight="semibold" className={`mt-1 block ${(snapshot.experiment.pnlUsdt ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(snapshot.experiment.pnlUsdt, " USDT")} · {signed(snapshot.experiment.pnlPct, "%")}</Text></Card>
              <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Current equity" : "当前权益"}</Text><Text variant="body" weight="semibold" className="mt-1 block">{number(snapshot.experiment.currentEquityUsdt)} USDT</Text></Card>
              <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Max drawdown" : "最大回撤"}</Text><Text variant="body" weight="semibold" className="mt-1 block text-red-300">-{number(snapshot.experiment.maxDrawdownUsdt)} USDT · -{number(snapshot.experiment.maxDrawdownPct)}%</Text></Card>
              <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Progress" : "实验进度"}</Text><Text variant="body" weight="semibold" className="mt-1 block">{experimentDay || "—"} / 30 {en ? "days" : "天"}</Text></Card>
              <Card padding="md"><Text variant="caption" color="tertiary">{en ? "Status" : "实验状态"}</Text><Text variant="body" weight="semibold" className="mt-1 block">{experimentLabel}</Text></Card>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <div className="border-b border-white/10 px-4 py-3"><Text variant="body-sm" weight="semibold">{en ? "Daily live performance" : "每日实盘成绩"}</Text></div>
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/10 bg-white/[0.025] text-white/45"><tr><th className="px-4 py-3">{en ? "Date" : "日期"}</th><th className="px-4 py-3">{en ? "Opening equity" : "日初权益"}</th><th className="px-4 py-3">{en ? "Latest equity" : "最新权益"}</th><th className="px-4 py-3">{en ? "PnL" : "当日盈亏"}</th><th className="px-4 py-3">{en ? "Trades" : "开仓次数"}</th></tr></thead>
                <tbody>
                  {(snapshot.experiment.dailyHistory ?? []).map((day) => <tr key={day.date} className="border-b border-white/[0.06] last:border-0"><td className="px-4 py-3">{day.date}</td><td className="px-4 py-3 text-white/65">{number(day.openingEquityUsdt)} USDT</td><td className="px-4 py-3">{number(day.closingEquityUsdt)} USDT</td><td className={`px-4 py-3 ${day.pnlUsdt >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(day.pnlUsdt, " USDT")} · {signed(day.pnlPct, "%")}</td><td className="px-4 py-3">{day.trades}</td></tr>)}
                  {!snapshot.experiment.dailyHistory?.length ? <tr><td colSpan={5} className="px-4 py-7 text-center text-white/45">{en ? "Daily results will appear after the experiment starts." : "实验启动后，这里每天自动记录盈亏和收益率。"}</td></tr> : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">{en ? "Started" : "开始时间"}</Text><Text variant="body-sm" className="mt-1 block">{time(snapshot.experiment.startedAt, en)}</Text></div>
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">{en ? "Ends" : "结束时间"}</Text><Text variant="body-sm" className="mt-1 block">{time(snapshot.experiment.endsAt, en)}</Text></div>
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">{en ? "Market data" : "行情状态"}</Text><Text variant="body-sm" className="mt-1 block">{snapshot.quoteReady ? (en ? "Normal" : "正常") : (en ? "Delayed / unavailable" : "延迟或不可用")}</Text></div>
          <div className="rounded-lg border border-white/10 p-3"><Text variant="caption" color="tertiary">{en ? "Last check" : "最近检查"}</Text><Text variant="body-sm" className="mt-1 block">{time(snapshot.latestQuoteAt, en)}</Text></div>
        </div>

        <Text variant="caption" className={snapshot.syncStatus === "ERROR" ? "text-red-300" : "text-white/55"}>{error || snapshot.syncMessage}</Text>
        {snapshot.experiment.securityMessage ? <Text variant="caption" className="block text-white/50">{snapshot.experiment.securityMessage}</Text> : null}
        {snapshot.experiment.stopReason ? <Text variant="body-sm" className="block text-amber-300">{snapshot.experiment.stopReason}</Text> : null}
      </Card>

      <AiTradeIntentBoard
        locale={en ? "en" : "zh"}
        dashboard={{
          databaseReady: true,
          generatedAt: snapshot.generatedAt,
          summary: snapshot.planSummary,
          decisions: snapshot.intentDecisions ?? [],
          plans: snapshot.publishedPlans ?? [],
          notice: en ? "Plans are locked before execution." : "计划在执行前锁定。",
        }}
      />

      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Heading size="h3">{en ? "Simple rules" : "实验规则"}</Heading>
            <Text variant="body-sm" color="secondary" className="mt-1 block">{en ? "Futures only. No martingale or averaging down. Risk is shared across ten markets." : "只做合约，不补仓、不马丁；十个品种共用同一套组合风控。"}</Text>
          </div>
          <Badge variant="outline">USDT Futures · ≤2x · Isolated</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {LIVE_ASSETS.map(([symbol, zh, english]) => <Badge key={symbol} variant="outline">{en ? english : zh} · {symbol}</Badge>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 text-sm text-white/70">
          <div className="rounded-lg border border-white/10 p-3">{en ? "Up to 3 new trades per day" : "每天最多新开3笔"}</div>
          <div className="rounded-lg border border-white/10 p-3">{en ? "Up to 3 concurrent positions" : "最多同时持有3个仓位"}</div>
          <div className="rounded-lg border border-white/10 p-3">{en ? "0.5% planned risk per trade" : "单笔计划风险0.5%"}</div>
          <div className="rounded-lg border border-white/10 p-3">{en ? "Daily stop: 20 USDT" : "当日亏损20 USDT停止新开仓"}</div>
          <div className="rounded-lg border border-white/10 p-3">{en ? "Experiment stop: 100 USDT drawdown" : "总回撤100 USDT停止实验"}</div>
          <div className="rounded-lg border border-white/10 p-3">{en ? "Take 50% at 1R" : "达到1R先止盈50%"}</div>
          <div className="rounded-lg border border-white/10 p-3">{en ? "Move stop to breakeven" : "首批止盈后止损移至保本"}</div>
          <div className="rounded-lg border border-white/10 p-3">{en ? "Exit remainder near 2.2R" : "剩余仓位目标约2.2R"}</div>
          <div className="rounded-lg border border-white/10 p-3">{en ? "Single position ≤30% equity" : "单仓名义价值≤权益30%"}</div>
          <div className="rounded-lg border border-white/10 p-3">{en ? "Gross exposure ≤100% equity" : "组合总名义仓位≤账户权益"}</div>
        </div>
      </Card>

      <section className="space-y-3">
        <Heading size="h3">{en ? "Current position" : "当前持仓"}</Heading>
        {snapshot.positions.length ? snapshot.positions.map((position) => (
          <Card key={`${position.symbol}-${position.direction}`} padding="lg" className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div><Text variant="body" weight="semibold">{liveAssetName(position.symbol, en)} · {assetDisplaySymbol(position.symbol)}</Text><Text variant="caption" color="tertiary" className="mt-1 block">{position.marginMode} · {position.leverage}x · {time(position.openedAt, en)}</Text></div>
              <Badge variant={position.direction === "LONG" ? "success" : "danger"}>{position.direction === "LONG" ? (en ? "Long" : "多单") : (en ? "Short" : "空单")}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div><Text variant="caption" color="tertiary">{en ? "Entry" : "开仓价"}</Text><Text variant="body-sm" className="mt-1 block">{number(position.averageEntryPrice, 2)}</Text></div>
              <div><Text variant="caption" color="tertiary">{en ? "Mark" : "标记价"}</Text><Text variant="body-sm" className="mt-1 block">{number(position.markPrice, 2)}</Text></div>
              <div><Text variant="caption" color="tertiary">{en ? "Unrealized PnL" : "未实现盈亏"}</Text><Text variant="body-sm" className={`mt-1 block ${(position.unrealisedPnlUsdt ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(position.unrealisedPnlUsdt, " USDT")} · {signed(position.profitRatePct, "%")}</Text></div>
              <div><Text variant="caption" color="tertiary">{en ? "Stop" : "止损"}</Text><Text variant="body-sm" className="mt-1 block">{number(position.stopLoss, 2)}</Text></div>
              <div><Text variant="caption" color="tertiary">{en ? "Target" : "止盈"}</Text><Text variant="body-sm" className="mt-1 block">{number(position.takeProfit, 2)}</Text></div>
            </div>
          </Card>
        )) : <Card padding="lg"><Text variant="body-sm" color="secondary">{en ? "No open position." : "当前没有持仓。"}</Text></Card>}
      </section>

      <section className="space-y-3">
        <Heading size="h3">{en ? "Completed trades" : "已经结束的交易"}</Heading>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.025] text-white/45"><tr><th className="px-4 py-3">{en ? "Time" : "时间"}</th><th className="px-4 py-3">{en ? "Asset" : "品种"}</th><th className="px-4 py-3">{en ? "Direction" : "方向"}</th><th className="px-4 py-3">{en ? "Result" : "盈亏"}</th></tr></thead>
            <tbody>
              {snapshot.recentTrades.map((trade) => <tr key={trade.id} className="border-b border-white/[0.06] last:border-0"><td className="px-4 py-3 text-white/60">{time(trade.closedAt, en)}</td><td className="px-4 py-3">{liveAssetName(trade.symbol, en)} · {trade.symbol}</td><td className="px-4 py-3">{trade.direction === "LONG" ? (en ? "Long" : "做多") : (en ? "Short" : "做空")}</td><td className={`px-4 py-3 ${(trade.netProfitUsdt ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{signed(trade.netProfitUsdt, " USDT")} · {signed(trade.returnPct, "%")}</td></tr>)}
              {!snapshot.recentTrades.length ? <tr><td colSpan={4} className="px-4 py-8 text-center text-white/45">{en ? "No completed trades yet." : "暂时还没有结束交易。"}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <Card padding="md" className="border-red-400/20 bg-red-400/[0.035]">
        <Text variant="caption" color="secondary">{live ? (en ? "This page uses real funds. The maximum planned loss is limited, but a total loss of the 1,000 USDT experiment account remains possible during exchange, API or extreme market failures." : "本页使用真实资金。系统设置了风险上限，但交易所、API或极端行情故障下，1000 USDT实验资金仍存在全部损失可能。") : (en ? "Demo records only." : "本页仅展示模拟记录。")}</Text>
      </Card>
    </div>
  );
}
