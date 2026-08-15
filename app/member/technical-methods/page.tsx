import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { ChanStructureChart } from "@/components/member/ChanStructureChart";
import { TeacherMethodRulebookPanel } from "@/components/member/TeacherMethodRulebookPanel";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { getAccessUser } from "@/lib/auth/get-access-user";
import type { ChanTimeframe } from "@/types/chan-execution";
import { PUBLIC_ATTRIBUTION_DISCLOSURE_ZH,PUBLIC_INTERPRETATION_LABEL_ZH } from "@/lib/presentation/public-attribution";

export const metadata = {
  title: "缠论技术执行台｜MOOX会员研究",
  description: "多周期真实闭合K线结构研究；只负责执行位置，不改变正式预测方向。",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

const actionLabels = {
  WAIT: "等待 / WAIT",
  BUY_CANDIDATE: "候选买点 / BUY CANDIDATE",
  SELL_CANDIDATE: "候选卖点 / SELL CANDIDATE",
} as const;

const reasonLabels: Record<string, string> = {
  AUTHORITATIVE_DIRECTION_UNAVAILABLE: "正式锁定方向缺失",
  TIMEFRAME_DATA_UNAVAILABLE: "一个或多个周期行情不可用",
  TIMEFRAME_STRUCTURE_INCOMPLETE: "一个或多个关键周期结构未完成",
  TIMEFRAME_CONFLICT_OR_NO_ENTRY: "周期冲突或没有标准二/三买卖点",
  STRUCTURE_OPPOSES_AUTHORITY: "结构候选与正式方向冲突",
};

export default async function MemberTechnicalMethodsPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string; timeframe?: string }>;
}) {
  noStore();
  const access = await getAccessUser();
  if (!access.authenticated) redirect("/login?next=/member/technical-methods");
  if (!access.isAdmin && !access.isActiveMember) redirect("/account/membership");
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "DEVICE_REQUIRED") {
    return <main className="mx-auto max-w-5xl px-4 py-10"><MemberDeviceGate decision={gate.device} nextPath="/member/technical-methods" /></main>;
  }

  const query = await searchParams;
  const symbol = query.symbol === "ETHUSDT" ? "ETHUSDT" : "BTCUSDT";
  const selectedTimeframe = (["30m", "1H", "4H", "1D"] as const).includes(query.timeframe as "30m" | "1H" | "4H" | "1D")
    ? query.timeframe as "30m" | "1H" | "4H" | "1D"
    : "4H";
  const capturedNowMs = Date.now();
  // Server-only market access begins only after all access gates.
  const [marketModule, structureModule, multiModule, directionModule, teacherRulebookModule, teacherEvaluationModule] = await Promise.all([
    import("@/lib/market-data/chan-market-data"),
    import("@/lib/trading-signals/chan-structure-core"),
    import("@/lib/trading-signals/chan-multi-timeframe-core"),
    import("@/lib/trading-signals/chan-formal-direction-reader"),
    import("@/lib/data/teacher-method-rulebook-20260815"),
    import("@/lib/research/teacher-method-evaluation-core"),
  ]);
  const [markets, formalDirection] = await Promise.all([
    marketModule.loadChanTimeframes({ symbol, capturedNowMs, timeoutMs: 4_000 }),
    directionModule.readChanFormalDirection({ symbol, capturedNowMs }),
  ]);
  const frames = markets.map((market) => ({
    timeframe: market.timeframe as "30m" | "1H" | "4H" | "1D",
    structure: structureModule.analyzeChanStructure(market.candles),
    error: market.error,
  }));
  const authoritativeDirection = formalDirection.direction;
  const decision = multiModule.decideChanMultiTimeframe({ authoritativeDirection, frames });
  const selectedMarket = markets.find((market) => market.timeframe === selectedTimeframe) ?? markets[0]!;
  const selectedFrame = frames.find((frame) => frame.timeframe === selectedTimeframe) ?? frames[0]!;
  const teacherRulebook = teacherRulebookModule.getTeacherMethodRulebook20260815();
  const teacherEvaluation = teacherEvaluationModule.evaluateTeacherResearch({
    authoritativeDirection,
    // The page does not yet receive a traceable original/mutual/changed hexagram and moving line bundle.
    liuyao: { originalHexagram: null, mutualHexagram: null, changedHexagram: null, movingLine: null, direction: "NEUTRAL" },
    // Qimen stays unavailable until a complete chart and explicit timing window are supplied.
    qimen: { chartAvailable: false, timingWindow: null },
    chan: {
      available: frames.every((frame) => frame.error == null),
      complete: frames.every((frame) => frame.structure.trendState === "COMPLETE"),
      direction: decision.technicalBias === "BULL" || decision.technicalBias === "BEAR" ? decision.technicalBias : "NEUTRAL",
    },
    // Macro and fundamental evidence remains a separate unavailable input in this V1 page.
    fundamentals: { available: false, direction: "NEUTRAL" },
  });
  const nowLabel = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date(capturedNowMs));

  return <><MemberDeviceHeartbeat /><main className="mx-auto max-w-7xl px-4 py-8 text-zinc-100">
    <section className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-300/[0.08] to-violet-400/[0.05] p-5 sm:p-7">
      <div className="text-xs font-semibold tracking-[.16em] text-amber-300">MOOX CHAN EXECUTION CONSOLE · V2 · RESEARCH ONLY</div>
      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_260px]">
        <div>
          <h1 className="text-3xl font-bold">唯一结论：{actionLabels[decision.action]}</h1>
          <p className="mt-3 text-base text-zinc-200">现在怎么做：{decision.action === "WAIT" ? "不追价、不预判反转；等待正式方向接入、四周期结构完成并出现同向二买/三买或对称卖点。" : "这只是研究候选，仍需正式方向与全部外部硬门禁确认，不构成订单。"}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">正式锁定周/月预测是唯一方向权威。缠论只提供位置、结构完成度与等待条件，不能投方向票，也不能把正式多头翻为空头或把正式空头翻为多头。</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-zinc-500">正式方向</div><div className="mt-1 font-semibold">{authoritativeDirection === "BULL" ? "看多 / BULL" : authoritativeDirection === "BEAR" ? "看空 / BEAR" : "缺失 / MISSING"}</div><div className="mt-1 text-[11px] text-zinc-500">{formalDirection.sourceHorizon ?? "—"} · {formalDirection.reason}</div></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-zinc-500">缠论结构倾向</div><div className="mt-1 font-semibold">{decision.technicalBias}</div><div className="mt-1 text-[11px] text-zinc-500">权重贡献 {decision.chanContribution} / {decision.chanWeight}</div></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-zinc-500">关键确认</div><div className="mt-1 font-semibold">{decision.confirmation?.toLocaleString() ?? "—"}</div></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-zinc-500">结构失效</div><div className="mt-1 font-semibold">{decision.invalidation?.toLocaleString() ?? "—"}</div></div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">{decision.reasons.map((reason) => <span key={reason} className="rounded-full border border-rose-300/25 bg-rose-300/[0.06] px-3 py-1 text-rose-200">{reasonLabels[reason] ?? reason}</span>)}</div>
    </section>

    <section className="mt-6 rounded-2xl border border-white/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">多周期共振矩阵 / Multi-timeframe Matrix</h2><p className="mt-1 text-xs text-zinc-500">捕获时间 {nowLabel}。四周期必须数据可用、结构完成且候选同向；任一失败都严格 WAIT。</p></div><form className="flex flex-wrap gap-2"><select name="symbol" defaultValue={symbol} className="rounded-lg bg-zinc-900 px-3 py-2"><option>BTCUSDT</option><option>ETHUSDT</option></select><select name="timeframe" defaultValue={selectedTimeframe} className="rounded-lg bg-zinc-900 px-3 py-2">{["30m", "1H", "4H", "1D"].map((value) => <option key={value}>{value}</option>)}</select><button className="rounded-lg bg-amber-300 px-4 py-2 font-semibold text-black">查看周期</button></form></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{decision.timeframeSignals.map((row) => {
        const frame = frames.find((item) => item.timeframe === row.timeframe);
        return <div key={row.timeframe} className={`rounded-xl border p-4 ${row.available && row.complete ? "border-white/10" : "border-rose-300/20 bg-rose-300/[0.03]"}`}><div className="flex items-center justify-between"><b>{row.timeframe}</b><span className="text-xs text-zinc-400">{row.signal}</span></div><div className="mt-3 space-y-1 text-xs text-zinc-400"><p>行情：{row.available ? "已读取闭合K" : `不可用 · ${frame?.error ?? "MISSING"}`}</p><p>结构：{row.complete ? "完成" : frame?.structure.trendState ?? "缺失"}</p><p>买点：{frame?.structure.buyPoint ?? "NONE"} · 卖点：{frame?.structure.sellPoint ?? "NONE"}</p></div></div>;
      })}</div>
    </section>

    <section className="mt-6"><div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{symbol} · {selectedTimeframe} 结构图</h2><p className="text-xs text-zinc-500">原始已闭合K线优先显示；归一结构只用于叠加计算。</p></div><Link href="/member/founder-cycle" className="text-sm text-amber-200">创始人周期研究 →</Link></div><ChanStructureChart candles={selectedMarket.candles} structure={selectedFrame.structure} timeframe={selectedTimeframe as ChanTimeframe} authoritativeDirection={authoritativeDirection} />{selectedMarket.error ? <p className="mt-2 text-sm text-rose-300">该周期行情读取失败：{selectedMarket.error}。不生成结构结论。</p> : null}</section>

    <details className="mt-6 rounded-2xl border border-white/10 p-5"><summary className="cursor-pointer font-semibold">方法、权重与局限 / Method & Limits</summary><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["结构执行", 35], ["传统方法交叉检查", 20], ["市场资金波动", 15], ["宏观与期权", 15], ["流动性事件", 15]].map(([name, weight]) => <div key={name} className="rounded-xl border border-white/10 p-4"><div className="text-sm text-zinc-400">{name}</div><div className="mt-2 text-xl font-bold">{weight}%</div><div className="mt-1 text-xs text-zinc-500">{name === "结构执行" ? `本轮真实贡献 ${decision.chanContribution}/35` : "缺少正式实时输入，不评分"}</div></div>)}</div><p className="mt-4 text-sm leading-6 text-zinc-400">结构执行 35 分由四周期真实结构计算。其余输入缺失时不填假分；结构未完成、周期冲突、正式方向缺失或无标准买卖点时，任何分数都不能越过 WAIT。当前背驰只使用已完成结构中的价格推进幅度收缩，不声称计算未接入的指标。</p></details>
    <details className="mt-4 rounded-2xl border border-white/10 p-5"><summary className="cursor-pointer font-semibold">{PUBLIC_INTERPRETATION_LABEL_ZH} · 方法说明</summary><div className="mt-4 text-sm leading-6 text-zinc-400"><p>{PUBLIC_ATTRIBUTION_DISCLOSURE_ZH}</p><p className="mt-2">版本化内部来源、原文、文件路径与身份信息仅供管理员审计，不在会员展示。</p></div></details>
    <TeacherMethodRulebookPanel rulebook={teacherRulebook} evaluation={teacherEvaluation} />
  </main></>;
}
