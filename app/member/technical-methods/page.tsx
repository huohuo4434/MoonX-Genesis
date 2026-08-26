import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { ChanStructureChart } from "@/components/member/ChanStructureChart";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { resolveChanInstrument } from "@/lib/market-data/chan-instrument-catalog";
import type { ChanDirection, ChanStage, ChanTimeframe } from "@/types/chan-execution";

export const metadata = {
  title: "缠论阶段分析｜MOOX会员研究",
  description: "用真实闭合K线识别当前缠论阶段、确认位和失效位。",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

const reasonLabels: Record<string, string> = {
  AUTHORITATIVE_DIRECTION_UNAVAILABLE: "正式周/月方向尚未发布",
  TIMEFRAME_DATA_UNAVAILABLE: "部分周期行情暂不可用",
  TIMEFRAME_STRUCTURE_INCOMPLETE: "部分周期结构还没走完",
  TIMEFRAME_CONFLICT_OR_NO_ENTRY: "各周期暂未形成同向买卖点",
  STRUCTURE_OPPOSES_AUTHORITY: "缠论结构与正式方向相反",
};

function directionLabel(direction: ChanDirection): string {
  return direction === "BULL" ? "偏多" : direction === "BEAR" ? "偏空" : "暂无正式方向";
}

function actionText(action: "BUY_CANDIDATE" | "SELL_CANDIDATE" | "WAIT", stage: ChanStage): string {
  if (action === "BUY_CANDIDATE") return "已出现同向候选买点；等待价格确认后再考虑，不追涨。";
  if (action === "SELL_CANDIDATE") return "已出现同向候选卖点；等待价格确认后再考虑，不抢跑。";
  return stage.waitingFor;
}

function formatPrice(value: number | null): string {
  if (value == null) return "等待结构形成";
  return value >= 1_000
    ? value.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export default async function MemberTechnicalMethodsPage({ searchParams }: { searchParams: Promise<{ symbol?: string; timeframe?: string }> }) {
  noStore();
  const access = await getAccessUser();
  if (!access.authenticated) redirect("/login?next=/member/technical-methods");
  if (!access.isAdmin && !access.isActiveMember) redirect("/account/membership");
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "DEVICE_REQUIRED") {
    return <main className="mx-auto max-w-5xl px-4 py-10"><MemberDeviceGate decision={gate.device} nextPath="/member/technical-methods" /></main>;
  }

  const query = await searchParams;
  const selectedTimeframe = (["30m", "1H", "4H", "1D"] as const).includes(query.timeframe as "30m" | "1H" | "4H" | "1D")
    ? query.timeframe as "30m" | "1H" | "4H" | "1D"
    : "4H";
  const capturedNowMs = Date.now();

  const [catalogModule, marketModule, structureModule, multiModule, directionModule] = await Promise.all([
    import("@/lib/market-data/chan-instrument-catalog.server"),
    import("@/lib/market-data/chan-market-data"),
    import("@/lib/trading-signals/chan-structure-core"),
    import("@/lib/trading-signals/chan-multi-timeframe-core"),
    import("@/lib/trading-signals/chan-formal-direction-reader"),
  ]);
  const catalogState = await catalogModule.loadChanInstrumentCatalog();
  const instrument = resolveChanInstrument(query.symbol, catalogState.instruments)
    ?? resolveChanInstrument("BTC", catalogState.instruments)
    ?? resolveChanInstrument("BTCUSDT", catalogState.instruments)!;
  const symbol = instrument.symbol;
  const [markets, formalDirection] = await Promise.all([
    marketModule.loadChanTimeframes({ symbol, instrument, capturedNowMs, timeoutMs: 4_500 }),
    directionModule.readChanFormalDirection({ symbol: instrument.formalPlanSymbol, capturedNowMs }),
  ]);
  const frames = markets.map((market) => ({ timeframe: market.timeframe as "30m" | "1H" | "4H" | "1D", structure: structureModule.analyzeChanStructure(market.candles), error: market.error }));
  const decision = multiModule.decideChanMultiTimeframe({ authoritativeDirection: formalDirection.direction, frames });
  const selectedMarket = markets.find((market) => market.timeframe === selectedTimeframe) ?? markets[0]!;
  const selectedFrame = frames.find((frame) => frame.timeframe === selectedTimeframe) ?? frames[0]!;
  const selectedSignal = decision.timeframeSignals.find((row) => row.timeframe === selectedTimeframe) ?? decision.timeframeSignals[0]!;
  const selectedStage = selectedSignal.stage;
  const nowLabel = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(capturedNowMs));
  const cryptoInstruments = catalogState.instruments.filter((row) => row.market === "CRYPTO");
  const equityInstruments = catalogState.instruments.filter((row) => row.market === "US_EQUITY");
  const macroInstruments = catalogState.instruments.filter((row) => row.market === "INDEX_COMMODITY");
  const selectedIsCatalogued = catalogState.instruments.some((row) => row.symbol === symbol);

  return <><MemberDeviceHeartbeat /><main className="mx-auto max-w-7xl px-4 py-8 text-zinc-100">
    <section data-conclusion-first="1" className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-300/[0.08] to-violet-400/[0.05] p-5 sm:p-7">
      <p className="text-xs font-semibold tracking-[.14em] text-amber-300">缠论阶段分析 · {instrument.label} · {selectedTimeframe}</p>
      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="text-3xl font-bold">当前阶段：{selectedStage.labelZh}</h1>
          <p className="mt-3 text-base leading-7 text-zinc-200"><b>现在怎么做：</b>{actionText(decision.action, selectedStage)}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">缠论负责判断位置和阶段；正式周/月预测负责方向。两者同向才会出现候选动作，冲突时继续等待。</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-zinc-500">正式方向</div><div className="mt-1 text-lg font-semibold">{directionLabel(formalDirection.direction)}</div><div className="mt-1 text-[11px] text-zinc-500">{formalDirection.sourceHorizon === "WEEK" ? "本周预测" : formalDirection.sourceHorizon === "MONTH" ? "本月预测" : "等待发布"}</div></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-zinc-500">当前结构</div><div className="mt-1 text-lg font-semibold">{selectedStage.direction === "BULL" ? "偏多" : selectedStage.direction === "BEAR" ? "偏空" : "未定"}</div><div className="mt-1 text-[11px] text-zinc-500">{selectedTimeframe} · {selectedStage.status === "ACTIVE" ? "已确认" : selectedStage.status === "INVALIDATED" ? "已失效" : "等待确认"}</div></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-zinc-500">确认价</div><div className="mt-1 text-lg font-semibold">{formatPrice(selectedStage.confirmation)}</div></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-zinc-500">失效价</div><div className="mt-1 text-lg font-semibold">{formatPrice(selectedStage.invalidation)}</div></div>
        </div>
      </div>
      {decision.reasons.length ? <p className="mt-4 text-sm text-amber-100/70">本周期暂无可执行机会，继续等待：{decision.reasons.slice(0, 2).map((reason) => reasonLabels[reason] ?? "等待结构确认").join("；")}</p> : null}
    </section>

    <section className="mt-6 rounded-2xl border border-white/10 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-lg font-semibold">四周期阶段</h2><p className="mt-1 text-xs text-zinc-500">更新于 {nowLabel} · 当前提供 {catalogState.instruments.length} 个品种 · 点击查看任一周期</p></div>
        <form className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-zinc-500">品种</label>
          <select name="symbol" defaultValue={symbol} aria-label="股票、加密货币或指数商品" className="max-w-56 rounded-lg bg-zinc-900 px-3 py-2">
            {!selectedIsCatalogued ? <option value={symbol}>{instrument.label}</option> : null}
            <optgroup label={`加密货币（${cryptoInstruments.length}）`}>{cryptoInstruments.map((item) => <option key={item.providerSymbol} value={item.symbol}>{item.label}</option>)}</optgroup>
            <optgroup label={`美股合约（${equityInstruments.length}）`}>{equityInstruments.map((item) => <option key={item.providerSymbol} value={item.symbol}>{item.label}</option>)}</optgroup>
            <optgroup label={`指数、商品与外汇（${macroInstruments.length}）`}>{macroInstruments.map((item) => <option key={item.providerSymbol} value={item.symbol}>{item.label}</option>)}</optgroup>
          </select>
          <label className="text-xs text-zinc-500">周期</label>
          <select name="timeframe" defaultValue={selectedTimeframe} className="rounded-lg bg-zinc-900 px-3 py-2">{["30m", "1H", "4H", "1D"].map((value) => <option key={value}>{value}</option>)}</select>
          <button className="rounded-lg bg-amber-300 px-4 py-2 font-semibold text-black">查看</button>
          <a href={`/member/market-structure?symbol=${encodeURIComponent(symbol)}&timeframe=${selectedTimeframe}`} className="rounded-lg border border-cyan-300/30 px-3 py-2 text-sm font-semibold text-cyan-100">多源K线</a>
        </form>
      </div>
      <p className="mt-3 text-xs text-zinc-500">加密行情优先使用Binance，并由OKX、Bitget交叉校验；美股继续使用公开现货K线。页面只分析真实已闭合K线。</p>
      <form className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-xs text-zinc-500">其他美股</label>
        <input name="symbol" aria-label="输入其他美股代码" placeholder="例如 PLTR" className="w-32 rounded-lg bg-zinc-900 px-3 py-2 uppercase" pattern="[A-Za-z][A-Za-z0-9.\-]{0,9}" maxLength={10} />
        <input type="hidden" name="timeframe" value={selectedTimeframe} />
        <button className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-zinc-200">查询美股</button>
        <span className="text-xs text-zinc-600">目录外普通美股使用公开现货K线。</span>
      </form>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{decision.timeframeSignals.map((row) => {
        const active = row.timeframe === selectedTimeframe;
        return <a key={row.timeframe} href={`?symbol=${encodeURIComponent(symbol)}&timeframe=${row.timeframe}`} className={`rounded-xl border p-4 transition ${active ? "border-amber-300/50 bg-amber-300/[0.06]" : row.available ? "border-white/10 bg-black/15" : "border-rose-300/20 bg-rose-300/[0.03]"}`}>
          <div className="flex items-center justify-between"><b>{row.timeframe}</b><span className="text-xs text-zinc-400">{row.available ? row.stage.status === "ACTIVE" ? "已确认" : row.stage.status === "INVALIDATED" ? "已失效" : "观察中" : "暂无行情"}</span></div>
          <p className="mt-3 font-medium text-white">{row.available ? row.stage.labelZh : "该周期暂不可用"}</p>
          <p className="mt-2 text-xs leading-5 text-zinc-400">{row.available ? row.stage.waitingFor : "稍后重试；不会用未闭合或伪造K线补齐。"}</p>
          {row.available && (row.stage.confirmation != null || row.stage.invalidation != null) ? <p className="mt-2 text-[11px] text-zinc-500">确认 {formatPrice(row.stage.confirmation)} · 失效 {formatPrice(row.stage.invalidation)}</p> : null}
        </a>;
      })}</div>
    </section>

    <section className="mt-6">
      <div className="mb-3"><h2 className="text-lg font-semibold">{symbol} · {selectedTimeframe} 结构图</h2><p className="text-xs text-zinc-500">只使用已闭合K线；黄色为笔、蓝色为线段、紫色为中枢。</p></div>
      <ChanStructureChart candles={selectedMarket.candles} structure={selectedFrame.structure} timeframe={selectedTimeframe as ChanTimeframe} authoritativeDirection={formalDirection.direction} />
      {selectedMarket.error ? <p className="mt-2 text-sm text-rose-300">该周期行情暂时读取失败，请稍后重试。</p> : null}
    </section>

    <details className="mt-6 rounded-2xl border border-white/10 p-4 text-sm text-zinc-400">
      <summary className="cursor-pointer font-semibold text-zinc-200">怎么看这页</summary>
      <ul className="mt-3 space-y-2 leading-6"><li>1. 先看“当前阶段”，确认是在二买、三买、二卖、三卖还是等待确认。</li><li>2. 再看确认价和失效价；没有确认前不抢跑，失效后放弃原结构。</li><li>3. 最后看四周期是否同向；周期冲突时只观察，不用单一小周期替代正式周/月方向。</li></ul>
    </details>
  </main></>;
}
