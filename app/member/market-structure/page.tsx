import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { ChanStructureChart } from "@/components/member/ChanStructureChart";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import {
  CRYPTO_SYMBOL_LABELS,
  MULTI_SOURCE_CRYPTO_SYMBOLS,
  normalizeCryptoBaseSymbol,
} from "@/lib/market-data/crypto-market-symbols";
import { loadCryptoMarketIntelligence } from "@/lib/market-data/multi-source-crypto";
import { readChanFormalDirection } from "@/lib/trading-signals/chan-formal-direction-reader";
import { deriveChanStage } from "@/lib/trading-signals/chan-stage-core";
import { analyzeChanStructure } from "@/lib/trading-signals/chan-structure-core";
import type { ChanDirection, ChanTimeframe } from "@/types/chan-execution";
import type { CryptoMarketProvider } from "@/types/market-microstructure";

export const metadata = {
  title: "多源K线与资金结构｜MOOX会员研究",
  description: "Binance主K线、OKX与Bitget交叉验证，叠加资金费率、持仓量和缠论结构。",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 20;

const TIMEFRAMES: ChanTimeframe[] = ["5m", "30m", "1H", "4H", "1D"];
const PROVIDER_LABELS: Record<CryptoMarketProvider, string> = {
  BINANCE_SPOT: "Binance现货",
  OKX_SPOT: "OKX现货",
  BITGET_FUTURES: "Bitget合约",
};

function formalReaderSymbol(symbol: string): string {
  if (symbol === "BTC" || symbol === "ETH") return `${symbol}USDT`;
  return symbol;
}

function directionLabel(direction: ChanDirection): string {
  return direction === "BULL" ? "正式方向偏多" : direction === "BEAR" ? "正式方向偏空" : "正式方向待发布";
}

function formatPrice(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "暂无";
  return value.toLocaleString("en-US", { maximumFractionDigits: value >= 100 ? 2 : 6 });
}

function formatPct(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "暂无";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function formatUnsignedPct(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "暂无";
  return `${value.toFixed(digits)}%`;
}

function formatCompactUsd(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "暂无";
  return new Intl.NumberFormat("zh-CN", {
    notation: "compact",
    maximumFractionDigits: 2,
    style: "currency",
    currency: "USD",
  }).format(value);
}

function qualityLabel(value: "GOOD" | "DEGRADED" | "BLOCKED"): string {
  if (value === "GOOD") return "多源一致，可计算精确技术位";
  if (value === "DEGRADED") return "降级可用，技术位需谨慎";
  return "数据分歧过大，暂停精确点位";
}

export default async function MemberMarketStructurePage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string; timeframe?: string }>;
}) {
  noStore();
  const access = await getAccessUser();
  if (!access.authenticated) redirect("/login?next=/member/market-structure");
  if (!access.isAdmin && !access.isActiveMember) redirect("/account/membership");
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "DEVICE_REQUIRED") {
    return <main className="mx-auto max-w-5xl px-4 py-10"><MemberDeviceGate decision={gate.device} nextPath="/member/market-structure" /></main>;
  }

  const query = await searchParams;
  const requested = normalizeCryptoBaseSymbol(query.symbol ?? "BTC");
  const symbol = MULTI_SOURCE_CRYPTO_SYMBOLS.includes(requested as (typeof MULTI_SOURCE_CRYPTO_SYMBOLS)[number]) ? requested : "BTC";
  const requestedTimeframe = query.timeframe as ChanTimeframe | undefined;
  const timeframe: ChanTimeframe = requestedTimeframe && TIMEFRAMES.includes(requestedTimeframe) ? requestedTimeframe : "4H";
  const capturedNowMs = Date.now();

  const [snapshot, formalDirection] = await Promise.all([
    loadCryptoMarketIntelligence({ symbol, timeframe, capturedNowMs, timeoutMs: 4_500 }),
    readChanFormalDirection({ symbol: formalReaderSymbol(symbol), capturedNowMs }).catch(() => ({
      direction: "NEUTRAL" as const,
      sourceHorizon: null,
      reason: "FORMAL_DIRECTION_UNAVAILABLE",
    })),
  ]);
  const structure = analyzeChanStructure(snapshot.candles);
  const stage = deriveChanStage(structure);
  const capturedLabel = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(snapshot.capturedAt));

  return <><MemberDeviceHeartbeat /><main className="mx-auto max-w-7xl px-4 py-8 text-zinc-100">
    <section className="rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/[0.08] to-violet-400/[0.05] p-5 sm:p-7">
      <p className="text-xs font-semibold tracking-[.14em] text-cyan-300">多源K线 · 市场微观结构 · 只读研究</p>
      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="text-3xl font-bold">{CRYPTO_SYMBOL_LABELS[symbol] ?? symbol} · {timeframe}</h1>
          <p className="mt-3 text-base leading-7 text-zinc-200"><b>当前结论：</b>{snapshot.assessment.labelZh}。{snapshot.assessment.summaryZh}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400"><b>现在怎么做：</b>{snapshot.assessment.executionStatusZh}。多源行情和资金结构只能确认位置、风险与仓位，不能反向修改已锁定方向。</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-zinc-500">正式方向</div><div className="mt-1 font-semibold">{directionLabel(formalDirection.direction)}</div><div className="mt-1 text-[11px] text-zinc-500">周/月预测拥有方向权</div></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-zinc-500">缠论阶段</div><div className="mt-1 font-semibold">{stage.labelZh}</div><div className="mt-1 text-[11px] text-zinc-500">只负责位置</div></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-zinc-500">行情质量</div><div className="mt-1 font-semibold">{snapshot.provenance.quality === "GOOD" ? "多源一致" : snapshot.provenance.quality === "DEGRADED" ? "降级可用" : "暂停精确点位"}</div></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-zinc-500">当前价格</div><div className="mt-1 font-semibold">{formatPrice(snapshot.metrics.spotPrice)}</div></div>
        </div>
      </div>
      <form className="mt-5 flex flex-wrap items-center gap-2">
        <label className="text-xs text-zinc-500">品种</label>
        <select name="symbol" defaultValue={symbol} className="rounded-lg bg-zinc-900 px-3 py-2">{MULTI_SOURCE_CRYPTO_SYMBOLS.map((item) => <option key={item} value={item}>{CRYPTO_SYMBOL_LABELS[item] ?? item}</option>)}</select>
        <label className="text-xs text-zinc-500">周期</label>
        <select name="timeframe" defaultValue={timeframe} className="rounded-lg bg-zinc-900 px-3 py-2">{TIMEFRAMES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <button className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-black">查看</button>
        <a href={`/member/technical-methods?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`} className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold">返回缠论执行台</a>
      </form>
      <p className="mt-3 text-xs text-zinc-500">数据截至 {capturedLabel}（北京时间） · {qualityLabel(snapshot.provenance.quality)} · 仅使用已闭合K线。</p>
    </section>

    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-white/10 p-4"><div className="text-xs text-zinc-500">资金费率</div><div className="mt-2 text-xl font-semibold">{snapshot.metrics.fundingRateBps == null ? "暂无" : `${snapshot.metrics.fundingRateBps.toFixed(3)} bps`}</div></div>
      <div className="rounded-2xl border border-white/10 p-4"><div className="text-xs text-zinc-500">持仓量变化</div><div className="mt-2 text-xl font-semibold">{formatPct(snapshot.metrics.openInterestChangePct)}</div></div>
      <div className="rounded-2xl border border-white/10 p-4"><div className="text-xs text-zinc-500">账户多空比</div><div className="mt-2 text-xl font-semibold">{snapshot.metrics.globalLongShortRatio?.toFixed(3) ?? "暂无"}</div><div className="mt-1 text-xs text-zinc-500">多 {formatUnsignedPct(snapshot.metrics.longAccountPct)} · 空 {formatUnsignedPct(snapshot.metrics.shortAccountPct)}</div></div>
      <div className="rounded-2xl border border-white/10 p-4"><div className="text-xs text-zinc-500">主动买卖比</div><div className="mt-2 text-xl font-semibold">{snapshot.metrics.takerBuySellRatio?.toFixed(3) ?? "暂无"}</div><div className="mt-1 text-xs text-zinc-500">大于1偏主动买入</div></div>
      <div className="rounded-2xl border border-white/10 p-4"><div className="text-xs text-zinc-500">现货—标记基差</div><div className="mt-2 text-xl font-semibold">{formatPct(snapshot.metrics.basisPct, 3)}</div></div>
      <div className="rounded-2xl border border-white/10 p-4"><div className="text-xs text-zinc-500">标记价格</div><div className="mt-2 text-xl font-semibold">{formatPrice(snapshot.metrics.markPrice)}</div></div>
      <div className="rounded-2xl border border-white/10 p-4"><div className="text-xs text-zinc-500">指数价格</div><div className="mt-2 text-xl font-semibold">{formatPrice(snapshot.metrics.indexPrice)}</div></div>
      <div className="rounded-2xl border border-white/10 p-4"><div className="text-xs text-zinc-500">风险标记</div><div className="mt-2 text-sm font-semibold">{snapshot.assessment.riskFlags.length ? snapshot.assessment.riskFlags.join(" · ") : "暂无明显拥挤信号"}</div></div>
    </section>

    <section className="mt-6">
      <div className="mb-3"><h2 className="text-lg font-semibold">闭合K线＋缠论结构</h2><p className="text-xs text-zinc-500">黄色为笔、蓝色为线段、紫色为中枢；不会绘制未来蜡烛。</p></div>
      <ChanStructureChart candles={snapshot.candles} structure={structure} timeframe={timeframe} authoritativeDirection={formalDirection.direction} />
    </section>

    <section className="mt-6 rounded-2xl border border-white/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">行情源健康</h2><p className="mt-1 text-xs text-zinc-500">Binance主源，OKX和Bitget交叉核验。偏差过大时宁可暂停精确点位。</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">选用：{snapshot.provenance.selectedProvider ? PROVIDER_LABELS[snapshot.provenance.selectedProvider] : "无"}</span></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-zinc-500"><tr><th className="py-2">来源</th><th>状态</th><th>K线数</th><th>最新价</th><th>延迟</th><th>最后闭合</th></tr></thead><tbody>{snapshot.provenance.sources.map((source) => <tr key={source.provider} className="border-t border-white/10"><td className="py-3 font-medium">{PROVIDER_LABELS[source.provider]}</td><td>{source.status === "HEALTHY" ? "正常" : source.status === "DEGRADED" ? "降级" : "失败"}</td><td>{source.candleCount}</td><td>{formatPrice(source.latestPrice)}</td><td>{source.latencyMs} ms</td><td className="text-zinc-500">{source.latestClosedAt ? new Date(source.latestClosedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }) : source.errorCode ?? "暂无"}</td></tr>)}</tbody></table></div>
    </section>

    <section className="mt-6 grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-white/10 p-4">
        <h2 className="text-lg font-semibold">全市场背景</h2>
        {snapshot.marketContext.available ? <div className="mt-4 grid grid-cols-2 gap-2 text-sm"><div className="rounded-xl border border-white/10 p-3"><div className="text-zinc-500">加密总市值</div><div className="mt-1 font-semibold">{formatCompactUsd(snapshot.marketContext.totalMarketCapUsd)}</div></div><div className="rounded-xl border border-white/10 p-3"><div className="text-zinc-500">24小时成交额</div><div className="mt-1 font-semibold">{formatCompactUsd(snapshot.marketContext.totalVolumeUsd)}</div></div><div className="rounded-xl border border-white/10 p-3"><div className="text-zinc-500">BTC市占率</div><div className="mt-1 font-semibold">{formatUnsignedPct(snapshot.marketContext.btcDominancePct)}</div></div><div className="rounded-xl border border-white/10 p-3"><div className="text-zinc-500">市场24小时变化</div><div className="mt-1 font-semibold">{formatPct(snapshot.marketContext.marketCapChangePct24h)}</div></div></div> : <p className="mt-3 text-sm text-zinc-500">CoinGecko市场背景暂不可用，不影响K线主系统。</p>}
      </div>
      <div className="rounded-2xl border border-white/10 p-4">
        <h2 className="text-lg font-semibold">CoinGecko热门搜索</h2>
        <div className="mt-4 space-y-2">{snapshot.marketContext.trending.length ? snapshot.marketContext.trending.slice(0, 6).map((coin, index) => <div key={coin.id} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"><span><b>{index + 1}. {coin.name}</b> <span className="text-zinc-500">{coin.symbol}</span></span><span className="text-zinc-400">{coin.priceChangePct24h == null ? `市值排名 ${coin.marketCapRank ?? "—"}` : formatPct(coin.priceChangePct24h)}</span></div>) : <p className="text-sm text-zinc-500">热门数据暂不可用。</p>}</div>
      </div>
    </section>

    <details className="mt-6 rounded-2xl border border-white/10 p-4 text-sm text-zinc-400">
      <summary className="cursor-pointer font-semibold text-zinc-200">系统纪律</summary>
      <ul className="mt-3 space-y-2 leading-6"><li>1. 多源K线与资金结构只负责确认位置、风险和仓位，不参与六爻方向投票。</li><li>2. Binance、OKX、Bitget报价明显分歧时，系统暂停精确点位，不拿脏数据继续计算。</li><li>3. 本版只读研究，不修改Bitget下单、AUTO_ORDER、杠杆或任何实盘权限。</li></ul>
    </details>
  </main></>;
}
