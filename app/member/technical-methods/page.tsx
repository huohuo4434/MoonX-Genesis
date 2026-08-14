import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { ChanStructureChart } from "@/components/member/ChanStructureChart";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { loadChanCandles } from "@/lib/market-data/chan-market-data";
import { decideChanExecution } from "@/lib/trading-signals/chan-execution-decision-core";
import { analyzeChanStructure } from "@/lib/trading-signals/chan-structure-core";

export const metadata = { title: "缠论技术执行台｜MOOX会员研究", description: "玄学正式方向优先，缠论只负责真实结构、执行位置和等待条件。" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

const labels: Record<string, string> = { WAIT: "等待", BUY_CANDIDATE: "候选买点", SELL_CANDIDATE: "候选卖点", HOLD: "持有/观察", TAKE_PROFIT: "条件式止盈", DO_NOT_CHASE: "不要追价" };

export default async function MemberTechnicalMethodsPage({ searchParams }: { searchParams: Promise<{ symbol?: string; timeframe?: string }> }) {
  noStore();
  const access = await getAccessUser();
  if (!access.authenticated) redirect("/login?next=/member/technical-methods");
  if (!access.isAdmin && !access.isActiveMember) redirect("/account/membership");
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "DEVICE_REQUIRED") return <main className="mx-auto max-w-5xl px-4 py-10"><MemberDeviceGate decision={gate.device} nextPath="/member/technical-methods" /></main>;

  const query = await searchParams;
  const symbol = query.symbol === "ETHUSDT" ? "ETHUSDT" : "BTCUSDT";
  const timeframe = ["30m", "1H", "4H", "1D"].includes(query.timeframe ?? "") ? query.timeframe! : "4H";
  const [{ getChanExecutionEvidence20260814 }, market] = await Promise.all([import("@/lib/data/chan-execution-evidence-20260814"), loadChanCandles({ symbol, timeframe })]);
  const evidence = getChanExecutionEvidence20260814();
  const structure = analyzeChanStructure(market.candles);
  // V1 intentionally does not infer or accept a direction from page controls.
  // Until a formally locked direction is wired in a separately reviewed phase,
  // the console remains WAIT and cannot create an order.
  const decision = decideChanExecution({ authoritativeDirection: "NEUTRAL", directionConflict: false, structure, chanScore: structure.sufficient ? 50 : null, qiaoqiaoScore: null, marketFlowScore: null, nanaScore: null, liquidityEventScore: null, atTopZone: false, standardPullback: false });

  return <><MemberDeviceHeartbeat /><main className="mx-auto max-w-7xl px-4 py-8 text-zinc-100">
    <section className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-300/[0.08] to-violet-400/[0.05] p-6">
      <div className="text-xs font-semibold tracking-[.18em] text-amber-300">MOOX CHAN EXECUTION CONSOLE · V1 · RESEARCH ONLY</div>
      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_auto]"><div><h1 className="text-3xl font-bold">最终结论：{labels[decision.action]}</h1><p className="mt-3 text-base text-zinc-200">现在怎么做：{decision.explanation}</p><p className="mt-2 text-sm text-zinc-400">玄学正式方向仍是唯一方向 authority；当前未取得正式方向与全部独立输入，因此严格 WAIT。</p></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center"><div className="text-xs text-zinc-500">执行可行度</div><div className="mt-1 text-3xl font-bold">{decision.feasibilityScore ?? "—"}</div><div className="text-xs text-zinc-500">/ 100</div></div></div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">{decision.hardWaitReasons.map((r) => <span key={r} className="rounded-full border border-rose-300/20 px-3 py-1 text-rose-200">{r}</span>)}</div>
    </section>

    <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><form className="flex flex-wrap gap-2"><select name="symbol" defaultValue={symbol} className="rounded-lg bg-zinc-900 px-3 py-2"><option>BTCUSDT</option><option>ETHUSDT</option></select><select name="timeframe" defaultValue={timeframe} className="rounded-lg bg-zinc-900 px-3 py-2">{["30m","1H","4H","1D"].map((v)=><option key={v}>{v}</option>)}</select><button className="rounded-lg bg-amber-300 px-4 py-2 font-semibold text-black">读取真实K线</button></form><Link href="/member/founder-cycle" className="text-sm text-amber-200">创始人周期研究 →</Link></div>
    <section className="mt-4"><ChanStructureChart structure={structure} />{market.error ? <p className="mt-2 text-sm text-rose-300">行情读取失败：{market.error}；不生成结构结论。</p> : null}</section>

    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["缠论",35],["乔乔",20],["市场资金波动",15],["NANA宏观期权",15],["流动性事件",15]].map(([name,weight])=><div key={name} className="rounded-xl border border-white/10 p-4"><div className="text-sm text-zinc-400">{name}</div><div className="mt-2 text-xl font-bold">{weight}%</div><div className="mt-1 text-xs text-zinc-500">缺数据不评分</div></div>)}</section>

    <details className="mt-6 rounded-2xl border border-white/10 p-5"><summary className="cursor-pointer font-semibold">结构审计：分型、笔、线段、中枢、背驰与买卖点</summary><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><p>分型 {structure.fractals.length} · 笔 {structure.strokes.length}</p><p>完成线段 {structure.segments.length}</p><p>三段重叠中枢 {structure.zones.length}</p><p>走势 {structure.trendState}</p><p>背驰联合确认 {structure.divergence ? "是" : "否"}</p><p>价格创新高/低 {structure.divergenceEvidence.priceExtended ? "是" : "否"}</p><p>价格推进幅度收缩 {structure.divergenceEvidence.momentumContracted ? "是" : "否"}</p><p>中枢/线段确认 {structure.divergenceEvidence.zoneConfirmed && structure.divergenceEvidence.segmentComplete ? "是" : "否"}</p><p>买点 {structure.buyPoint}</p><p>卖点 {structure.sellPoint}</p><p>正式方向未接入，NEUTRAL 不显示单向失效位、TP 或保本触发。</p></div><p className="mt-4 text-xs leading-5 text-zinc-500">V1 是可审计解释器，不声称完整实现正统缠论。包含关系先归一；分型有最低间隔；三笔不会机械构成完成线段；中枢至少三段重叠；当前背驰仅使用价格推进幅度，MACD 与量能留待未来样本验证；一买只作低权重研究，优先二买/三买及对称卖点。</p></details>
    <details className="mt-4 rounded-2xl border border-white/10 p-5"><summary className="cursor-pointer font-semibold">版本化来源证据</summary><div className="mt-4 text-sm leading-6 text-zinc-400">{evidence.sourceArtifacts.map((a)=><p key={a.id}>{a.id} · {a.name} · sourcePublishedAt: null</p>)}<p className="mt-2">{evidence.mooxPolicy}</p><p>已读文字稿课程：{evidence.transcribedLessons} 份（{evidence.transcriptRange}）。未转写 m4a 不声称学过；疑似转写词不进入正式术语。</p>{evidence.notes.map((n)=><p key={n.source} className="mt-2"><b className="text-zinc-200">{n.source}</b> · artifact={n.sourceArtifact} · {n.claim} · {n.status}</p>)}</div></details>
  </main></>;
}
