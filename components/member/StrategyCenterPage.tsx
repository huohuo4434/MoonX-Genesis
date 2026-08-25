import Link from "next/link";
import { ConclusionFirstPanel } from "@/components/member/ConclusionFirstPanel";
import type { StrategyCenterSnapshot } from "@/lib/presentation/strategy-center";

function signedPct(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function plainPct(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "—" : `${value.toFixed(1)}%`;
}

function ratio(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "—" : value.toFixed(2);
}

function time(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function price(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 8 });
}

function direction(value: "LONG" | "SHORT"): string {
  return value === "LONG" ? "做多" : "做空";
}

function orderStatus(value: string): string {
  const labels: Record<string, string> = {
    ORDER_SUBMITTED: "订单已提交",
    OPEN: "持仓中",
    PARTIAL: "已部分止盈",
    CLOSING: "平仓处理中",
    CLOSED: "已平仓",
    ERROR: "执行异常",
  };
  return labels[value] ?? value;
}

export function StrategyCenterPage({ snapshot }: { snapshot: StrategyCenterSnapshot }) {
  const runningOrders = snapshot.liveOrders.filter((order) => !["CLOSED", "ERROR"].includes(order.status));
  const enabledStrategies = snapshot.strategies.filter((row) => row.enabled);
  const runningTrades = snapshot.strategies.reduce((sum, row) => sum + row.runningTrades, 0);
  return (
    <main className="min-h-screen bg-[#06070b] pb-24 text-white md:pb-12">
      <section className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6 md:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.22em] text-violet-300">MOOX STRATEGY</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">策略中心</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">只读展示现有策略表现和运行记录。这里不改预测方向、不改风控，也不触发交易写入。</p>
          </div>
          <Link href="/member/ai-trading" className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-white/75">进入交易台</Link>
        </div>

        <ConclusionFirstPanel
          className="mt-5"
          title={runningOrders.length ? `当前有 ${runningOrders.length} 笔实盘单仍在运行` : "当前没有运行中的实盘单"}
          conclusion={runningOrders.length
            ? `先看运行单的方向、开单价、止损和止盈；只有感兴趣时再展开玄学依据、技术入场理由和历史成绩。`
            : "没有真实运行单时保持空白，不用模拟单或观察计划填充。可以继续看各策略最近表现，但不能把历史成绩当成当前开单结论。"}
          facts={[
            { label: "运行实盘单", value: String(runningOrders.length), tone: runningOrders.length ? "turn" : "muted" },
            { label: "已启用策略", value: `${enabledStrategies.length}/${snapshot.strategies.length}`, tone: enabledStrategies.length ? "positive" : "muted" },
            { label: "策略运行交易", value: String(runningTrades), tone: runningTrades ? "neutral" : "muted" },
            { label: "真实记录", value: String(snapshot.liveOrders.length), tone: snapshot.liveOrders.length ? "neutral" : "muted" },
          ]}
          actions={["有运行单：先核对方向、开单、止损、止盈和状态。", "无运行单：不要从历史收益推导当前应该开单。"]}
        />

        <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3 text-xs leading-5 text-white/45">{snapshot.dataNotice}</div>

        <section className="mt-6 rounded-3xl border border-amber-300/15 bg-[linear-gradient(145deg,rgba(52,38,14,.62),rgba(8,9,14,.98))] p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-amber-200/75">MEMBER LIVE ORDERS</p>
              <h2 className="mt-2 text-xl font-semibold">会员实盘策略清单</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">玄学只负责锁定方向与时序，技术结构只负责开单价格、止盈止损和入场确认。以下理由读取开仓时已保存的记录，不根据结果事后改写。</p>
            </div>
            <span className="rounded-full border border-amber-200/15 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">共 {snapshot.liveOrders.length} 笔真实记录</span>
          </div>

          <div className="mt-5 grid gap-4">
            {snapshot.liveOrders.map((order) => <article key={order.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2.5 py-1 text-xs text-violet-100">{order.horizonLabel}</span>
                  <h3 className="text-lg font-semibold">{order.symbol}</h3>
                  <span className={order.direction === "LONG" ? "text-emerald-300" : "text-rose-300"}>{direction(order.direction)}</span>
                </div>
                <div className="text-right text-xs text-white/45"><div>{orderStatus(order.status)}</div><div className="mt-1">开单 {time(order.openedAt)}</div></div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                <div className="rounded-xl bg-white/[0.04] p-3"><div className="text-xs text-white/35">开单价格</div><div className="mt-1 font-semibold">{price(order.entryPrice)}</div></div>
                <div className="rounded-xl bg-white/[0.04] p-3"><div className="text-xs text-white/35">止损价格</div><div className="mt-1 font-semibold text-rose-200">{price(order.stopLoss)}</div></div>
                <div className="rounded-xl bg-white/[0.04] p-3"><div className="text-xs text-white/35">第一止盈</div><div className="mt-1 font-semibold text-emerald-200">{price(order.target1)}</div></div>
                <div className="rounded-xl bg-white/[0.04] p-3"><div className="text-xs text-white/35">第二止盈</div><div className="mt-1 font-semibold text-emerald-200">{price(order.target2)}</div></div>
                <div className="rounded-xl bg-white/[0.04] p-3"><div className="text-xs text-white/35">数量</div><div className="mt-1 font-semibold">{price(order.quantity)}</div></div>
                <div className="rounded-xl bg-white/[0.04] p-3"><div className="text-xs text-white/35">计划风险</div><div className="mt-1 font-semibold">{order.riskAmountUsdt == null ? "—" : `${price(order.riskAmountUsdt)} U`}</div></div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-violet-300/10 bg-violet-400/[0.05] p-4">
                  <div className="text-sm font-medium text-violet-100">玄学怎么预测</div>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-white/65">{order.metaphysicalReasons.map((reason) => <li key={reason}>• {reason}</li>)}</ul>
                </div>
                <div className="rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.04] p-4">
                  <div className="text-sm font-medium text-cyan-100">为什么在这个价格开单</div>
                  {order.executionReasons.length
                    ? <ul className="mt-2 space-y-2 text-sm leading-6 text-white/65">{order.executionReasons.map((reason) => <li key={reason}>• {reason}</li>)}</ul>
                    : <p className="mt-2 text-sm leading-6 text-white/45">该订单没有保存完整的技术入场说明，不补写事后理由。</p>}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-white/25">Bitget订单号：{order.bitgetOrderId}</div>
            </article>)}
            {!snapshot.liveOrders.length && <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-8 text-center text-sm text-white/45">当前没有已确认的真实开单记录。系统不会用模拟单或观察计划填充这里。</div>}
          </div>
        </section>

        <div className="mt-6 hidden overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/8 text-xs tracking-[0.12em] text-white/38">
              <tr><th className="px-5 py-4">策略</th><th className="px-3 py-4">周期</th><th className="px-3 py-4">近30天收益</th><th className="px-3 py-4">最大回撤</th><th className="px-3 py-4">胜率</th><th className="px-3 py-4">Sharpe</th><th className="px-3 py-4">运行交易</th><th className="px-3 py-4" /></tr>
            </thead>
            <tbody>
              {snapshot.strategies.map((row) => <tr key={row.id} className="border-b border-white/[0.06] last:border-b-0">
                <td className="px-5 py-5"><div className="font-semibold">{row.name}</div><div className="mt-1 text-xs text-white/38">{row.modeLabel} · {row.enabled ? "启用" : "未启用"} · 最近扫描 {time(row.lastScanAt)}</div></td>
                <td className="px-3 py-5 text-white/70">{row.cycle}</td>
                <td className="px-3 py-5 font-medium">{signedPct(row.return30dPct)}</td>
                <td className="px-3 py-5">{plainPct(row.maxDrawdownPct)}</td>
                <td className="px-3 py-5">{plainPct(row.winRatePct)}</td>
                <td className="px-3 py-5">{ratio(row.sharpeRatio)}</td>
                <td className="px-3 py-5">{row.runningTrades}</td>
                <td className="px-3 py-5 text-right"><Link href={`/member/strategy/${row.id}`} className="text-violet-200">详情 →</Link></td>
              </tr>)}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-3 md:hidden">
          {snapshot.strategies.map((row) => <Link key={row.id} href={`/member/strategy/${row.id}`} className="rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(25,22,45,.92),rgba(8,9,14,.98))] p-5">
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{row.name}</h2><p className="mt-1 text-xs text-white/42">{row.cycle} · {row.modeLabel}</p></div><span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-200">{row.runningTrades} 运行</span></div>
            <div className="mt-5 grid grid-cols-4 gap-2 text-center"><div><div className="text-xs text-white/35">30日</div><div className="mt-1 font-semibold">{signedPct(row.return30dPct)}</div></div><div><div className="text-xs text-white/35">回撤</div><div className="mt-1 font-semibold">{plainPct(row.maxDrawdownPct)}</div></div><div><div className="text-xs text-white/35">胜率</div><div className="mt-1 font-semibold">{plainPct(row.winRatePct)}</div></div><div><div className="text-xs text-white/35">Sharpe</div><div className="mt-1 font-semibold">{ratio(row.sharpeRatio)}</div></div></div>
          </Link>)}
        </div>
      </section>
    </main>
  );
}
