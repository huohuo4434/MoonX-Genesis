// MOOX_V7206_ADMIN_PERFORMANCE_UI
import type { AdminTradingPerformanceSnapshot } from "@/lib/trading-signals/admin-public-performance";

function money(value: number | null | undefined, digits = 2): string {
  return value == null || !Number.isFinite(value) ? "—" : `$${value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
function pct(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}
function time(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

export function AdminPublicTradingPerformance({ snapshot }: { snapshot: AdminTradingPerformanceSnapshot }) {
  return <section className="space-y-5 rounded-3xl border border-white/10 bg-[#0a0c12] p-5 sm:p-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">MOOX OFFICIAL ACCOUNT</p><h2 className="mt-2 text-2xl font-semibold">管理员账户实盘记录</h2><p className="mt-2 text-sm text-white/45">余额、当前持仓和最近已平仓交易直接读取交易所，只展示结果，不展示任何密钥。</p></div>
      <div className="text-right text-xs text-white/35">{snapshot.environmentLabel}<br/>{time(snapshot.generatedAt)}</div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"><p className="text-xs text-white/40">账户权益</p><p className="mt-2 text-2xl font-semibold">{money(snapshot.equityUsdt)}</p></div>
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"><p className="text-xs text-white/40">可用USDT</p><p className="mt-2 text-2xl font-semibold">{money(snapshot.availableUsdt)}</p></div>
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"><p className="text-xs text-white/40">当前持仓</p><p className="mt-2 text-2xl font-semibold">{snapshot.currentPositions.length} 笔</p></div>
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"><p className="text-xs text-white/40">最近100笔净盈亏</p><p className={`mt-2 text-2xl font-semibold ${snapshot.recentNetProfitUsdt >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{money(snapshot.recentNetProfitUsdt)}</p><p className="mt-1 text-xs text-white/35">盈利 {snapshot.profitableTrades} · 亏损 {snapshot.losingTrades}</p></div>
    </div>

    {snapshot.currentPositions.length ? <div className="overflow-x-auto rounded-2xl border border-white/[0.07]"><table className="min-w-[860px] w-full text-left text-sm"><thead className="text-xs text-white/40"><tr><th className="px-4 py-3">标的</th><th className="px-4 py-3">方向</th><th className="px-4 py-3">数量</th><th className="px-4 py-3">开仓价</th><th className="px-4 py-3">现价</th><th className="px-4 py-3">杠杆</th><th className="px-4 py-3">浮动盈亏</th><th className="px-4 py-3">收益率</th></tr></thead><tbody>{snapshot.currentPositions.map((position) => <tr key={`${position.symbol}:${position.posSide}`} className="border-t border-white/[0.06]"><td className="px-4 py-3 font-semibold">{position.symbol}</td><td className="px-4 py-3">{position.posSide === "long" ? "多" : "空"}</td><td className="px-4 py-3">{position.total}</td><td className="px-4 py-3">{money(position.avgPrice, 4)}</td><td className="px-4 py-3">{money(position.markPrice, 4)}</td><td className="px-4 py-3">{position.leverage}x</td><td className={`px-4 py-3 ${position.unrealisedPnl >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{money(position.unrealisedPnl)}</td><td className={`px-4 py-3 ${position.profitRate >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{pct(position.profitRate)}</td></tr>)}</tbody></table></div> : <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4 text-sm text-emerald-100">当前没有持仓。</div>}

    <details className="rounded-2xl border border-white/[0.07] bg-black/20 p-4" open>
      <summary className="cursor-pointer font-semibold">最近已平仓交易（每单盈亏）</summary>
      <div className="mt-4 overflow-x-auto"><table className="min-w-[980px] w-full text-left text-sm"><thead className="text-xs text-white/40"><tr><th className="px-3 py-2">平仓时间</th><th className="px-3 py-2">标的</th><th className="px-3 py-2">方向</th><th className="px-3 py-2">开仓均价</th><th className="px-3 py-2">平仓均价</th><th className="px-3 py-2">净盈利</th><th className="px-3 py-2">资金费</th><th className="px-3 py-2">手续费</th></tr></thead><tbody>{snapshot.closedTrades.slice(0, 30).map((trade) => <tr key={trade.positionId} className="border-t border-white/[0.06]"><td className="px-3 py-3 text-xs text-white/50">{time(trade.updatedAt)}</td><td className="px-3 py-3 font-semibold">{trade.symbol}</td><td className="px-3 py-3">{trade.posSide === "long" ? "多" : "空"}</td><td className="px-3 py-3">{money(trade.openPriceAvg, 4)}</td><td className="px-3 py-3">{money(trade.closePriceAvg, 4)}</td><td className={`px-3 py-3 font-semibold ${trade.netProfit >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{money(trade.netProfit)}</td><td className="px-3 py-3">{money(trade.totalFunding)}</td><td className="px-3 py-3">{money(trade.openFeeTotal + trade.closeFeeTotal)}</td></tr>)}</tbody></table></div>
      {!snapshot.closedTrades.length ? <p className="mt-3 text-sm text-white/45">暂无可读取的已平仓记录。</p> : null}
    </details>
    {snapshot.errorZh ? <p className="text-xs text-amber-200">{snapshot.errorZh}</p> : null}
  </section>;
}
