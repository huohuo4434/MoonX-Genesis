import Link from "next/link";
import type { StrategyCenterRow, StrategyCenterTrade } from "@/lib/presentation/strategy-center";

const statusLabel: Record<string, string> = {
  OBSERVING: "观察中",
  READY: "等待执行",
  SHADOW_READY: "影子信号",
  BLOCKED: "已拦截",
  ORDER_SUBMITTED: "订单已提交",
  OPEN: "持仓中",
  PARTIAL: "部分执行",
  CLOSING: "平仓处理中",
  CLOSED: "已结束",
  EXPIRED: "已过期",
  ERROR: "异常",
};

function number(value: number | null, digits = 2): string {
  return value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
}

function signedPct(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function plainPct(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "—" : `${value.toFixed(1)}%`;
}

function money(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(2)} USDT`;
}

function dateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function direction(value: StrategyCenterTrade["direction"]): string {
  if (value === "LONG") return "做多";
  if (value === "SHORT") return "做空";
  return "中性";
}

export function StrategyDetailPage({ strategy, trades }: { strategy: StrategyCenterRow; trades: StrategyCenterTrade[] }) {
  const running = trades.filter((row) => ["ORDER_SUBMITTED", "OPEN", "PARTIAL", "CLOSING"].includes(row.status));
  const closed = trades.filter((row) => row.status === "CLOSED" || Boolean(row.closedAt));

  return (
    <main className="min-h-screen bg-[#06070b] pb-24 text-white md:pb-12">
      <section className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6 md:py-10">
        <div className="flex items-center gap-3 text-sm text-white/45"><Link href="/member/strategy" className="hover:text-white">策略中心</Link><span>/</span><span>{strategy.name}</span></div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs tracking-[0.2em] text-violet-300">STRATEGY DETAIL</p><h1 className="mt-2 text-3xl font-semibold">{strategy.name}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">{strategy.description}</p></div><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60">{strategy.cycle} · {strategy.modeLabel}</span></div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-6">
          <Metric label="近30天收益" value={signedPct(strategy.return30dPct)} />
          <Metric label="最大回撤" value={plainPct(strategy.maxDrawdownPct)} />
          <Metric label="胜率" value={plainPct(strategy.winRatePct)} />
          <Metric label="Sharpe" value={number(strategy.sharpeRatio)} />
          <Metric label="已结束" value={String(strategy.closedTrades)} />
          <Metric label="运行中" value={String(strategy.runningTrades)} />
        </div>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.025] p-5">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs tracking-[0.16em] text-white/35">PERFORMANCE</p><h2 className="mt-1 text-xl font-semibold">净值曲线</h2></div><span className="text-xs text-white/35">累计净盈亏 {money(strategy.netPnlUsdt)}</span></div>
          <div className="mt-5 flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 px-5 text-center text-sm leading-6 text-white/42">当前数据模型没有可靠的“单策略净值序列”，所以这里暂不使用累计盈亏伪装净值。等策略级NAV按日落库后，这个区域直接接真实曲线。</div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.025] p-5">
          <div className="flex items-center justify-between"><div><p className="text-xs tracking-[0.16em] text-white/35">RUNNING</p><h2 className="mt-1 text-xl font-semibold">当前运行</h2></div><span className="text-sm text-white/45">{running.length} 条</span></div>
          <div className="mt-4 grid gap-3">{running.length ? running.map((row) => <TradeCard key={row.id} row={row} />) : <Empty text="当前没有运行中的策略记录。" />}</div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.025] p-5">
          <div><p className="text-xs tracking-[0.16em] text-white/35">TRADES</p><h2 className="mt-1 text-xl font-semibold">完整交易记录</h2></div>
          <div className="mt-4 overflow-x-auto"><table className="min-w-[860px] w-full text-left text-sm"><thead className="text-xs text-white/35"><tr><th className="py-3 pr-4">时间</th><th className="py-3 pr-4">标的</th><th className="py-3 pr-4">方向</th><th className="py-3 pr-4">入场</th><th className="py-3 pr-4">止损 / 目标</th><th className="py-3 pr-4">结果</th></tr></thead><tbody>{closed.map((row) => <tr key={row.id} className="border-t border-white/[0.06]"><td className="py-4 pr-4 text-white/50">{dateTime(row.openedAt || row.createdAt)}<br/><span className="text-xs">→ {dateTime(row.closedAt)}</span></td><td className="py-4 pr-4 font-medium">{row.symbol}</td><td className="py-4 pr-4">{direction(row.direction)}</td><td className="py-4 pr-4">{number(row.entryPrice)}</td><td className="py-4 pr-4 text-white/60">{number(row.stopLoss)} / {number(row.target1)} · {number(row.target2)}</td><td className="py-4 pr-4 font-medium">{money(row.realizedPnlUsdt)}</td></tr>)}</tbody></table>{!closed.length ? <Empty text="当前读取范围内还没有已结束交易。" /> : null}</div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.025] p-5">
          <div><p className="text-xs tracking-[0.16em] text-white/35">ORDER ACTIONS</p><h2 className="mt-1 text-xl font-semibold">订单与策略动作</h2></div>
          <div className="mt-4 divide-y divide-white/[0.06]">{trades.length ? trades.map((row) => <div key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div><div className="font-medium">{row.symbol} · {direction(row.direction)} · {statusLabel[row.status] ?? row.status}</div><div className="mt-1 text-xs text-white/40">{dateTime(row.createdAt)} · 信心 {row.confidence}%</div>{row.rejectionReason ? <div className="mt-1 max-w-3xl text-xs leading-5 text-white/45">{row.rejectionReason}</div> : null}</div><div className="text-right text-xs text-white/45">入场 {number(row.entryPrice)}<br/>止损 {number(row.stopLoss)}</div></div>) : <Empty text="暂无策略动作记录。" />}</div>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><div className="text-xs text-white/35">{label}</div><div className="mt-2 text-lg font-semibold">{value}</div></div>;
}

function TradeCard({ row }: { row: StrategyCenterTrade }) {
  return <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold">{row.symbol} · {direction(row.direction)}</div><div className="mt-1 text-xs text-white/40">{statusLabel[row.status] ?? row.status} · {dateTime(row.openedAt || row.createdAt)}</div></div><span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-200">信心 {row.confidence}%</span></div><div className="mt-3 grid grid-cols-3 gap-2 text-sm text-white/60"><span>入场 {number(row.entryPrice)}</span><span>止损 {number(row.stopLoss)}</span><span>目标 {number(row.target1)}</span></div></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/38">{text}</div>;
}
