"use client";

import { useState } from "react";
import type { CandleProjection, DailyProjectionData } from "@/lib/research/daily-candle-projection-core";
import { ResearchCandleTerminal } from "./ResearchCandleTerminal";

const price = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: n < .001 ? 10 : n < 1 ? 6 : 2 });
const directions: Record<string, string> = { 上涨: "Rising", 下跌: "Falling", 震荡: "Range-bound", 震荡上涨: "Choppy rise", 震荡下跌: "Choppy decline", 先涨后跌: "Rise, then pull back", 先跌后涨: "Dip, then recover" };
const sourcePeriod = (p: CandleProjection, en: boolean) => p.sourcePeriodStart && p.sourcePeriodEnd
  ? `${p.sourcePeriodStart}—${p.sourcePeriodEnd}` : en ? 'Source period unavailable' : '原预测周期待核验';
const horizonLabel = (p: CandleProjection | undefined, en: boolean) => {
  if (p?.researchScenario && p.researchScenario.status !== 'WITHDRAWN') return en ? 'Consolidation, then pullback · conditional' : '高位整理后回调·条件情景';
  if (p?.horizonContext) return en ? '4-week view · phased scenario' : '四周视图·分阶段情景';
  if (p?.technical) return p.level === 'WEEK' ? (en ? 'Next 7 days · technical outlook' : '未来7天·技术推演') : (en ? 'Next 4 weeks · technical outlook' : '未来4周·技术推演');
  if (p?.level === 'WEEK') return en ? 'Weekly direction' : '周度方向';
  if (p?.sourceHorizon === 'STAGE') return en ? 'Stage background' : '阶段背景';
  const days = p?.sourcePeriodStart && p.sourcePeriodEnd ? (Date.parse(p.sourcePeriodEnd) - Date.parse(p.sourcePeriodStart)) / 86_400_000 : null;
  return days === null ? en ? 'Longer-term background' : '较长周期背景'
    : days > 45 ? en ? 'Multi-month background' : '多月背景' : en ? 'Monthly background' : '月度背景';
};

function TechnicalReadout({ projection, en }: { projection?: CandleProjection; en: boolean }) {
  const t = projection?.technical;
  if (!t) return null;
  const scenario = projection?.researchScenario;
  const context = projection?.horizonContext;
  const zone = (z: typeof t.support) => z ? `${price(z.low)}${z.high !== z.low ? `–${price(z.high)}` : ''}` : (en ? 'No confirmed historical pivot' : '暂无可确认的历史位置');
  return <div className="space-y-2 rounded-xl border border-cyan-400/25 bg-cyan-950/15 p-3 text-sm" data-technical-outlook="v5">
    <p><strong>{context ? (en ? 'Stage context + weekly phases + technical price structure' : '阶段背景＋周段节奏＋技术价格结构') : scenario && scenario.status !== 'WITHDRAWN' ? (en ? 'Consolidation, then pullback · conditional research scenario' : '高位整理后回调 · 条件研究情景') : (en ? 'Technical analysis leads; timing windows assist.' : '技术走势主导，关键时间窗口辅助。')}</strong></p>
    {context ? <div className="space-y-2 text-cyan-100" data-horizon-context="v1">
      <p>{en ? 'Published background' : '已发布阶段背景'}：{context.originalStart}—{context.originalEnd} · {en ? directions[projection!.direction] ?? projection!.direction : projection!.direction} · V{context.sourceVersion}。</p>
      <p>{en ? 'Remaining windows and their original source directions' : '剩余时间段及所沿用的原周期方向'}：</p>
      {context.phases.map(p => <p key={`${p.sourceId}:${p.start}`} className="text-xs">{p.start}—{p.end}：{en ? directions[p.direction] ?? p.direction : p.direction} · V{p.version}</p>)}
      <p className="text-xs">{en ? 'Elapsed phases are not restarted: an original rise-then-pullback period may now have only its pullback leg left. These windows are not exact turning dates.' : '已经走过的阶段不重新起算：原周期若为先涨后跌，当前可能只剩回调段，并不代表所列每一段都再次先涨后跌。时间窗不是精确转折日。'}</p>
      {context.partial ? <p className="text-amber-200">{en ? `Source coverage ends ${context.coverageEnd}; no invented candles through ${context.requestedEnd}. Await new evidence. The separate technical baseline is not a published stage forecast.` : `资料仅覆盖至${context.coverageEnd}，不补画到${context.requestedEnd}；后段待新资料。另选的技术基线不代表老师已发布的阶段预测。`}</p> : null}
      <p className="text-xs">{en ? 'Independent momentum baseline' : '独立技术动量基线'}：{en ? directions[context.technicalDirection] ?? context.technicalDirection : context.technicalDirection}。{en ? 'Differences are retained, not averaged away. Prices and ATR set the illustrative scale; no source supplies these daily target prices.' : '分歧保留，不用短期评分抹掉较长周期背景。价格与ATR决定示意幅度，图中逐日价位并不是原文给出的目标。'}</p>
      <p className="text-xs">{en ? 'A support break and failed retest are needed to confirm a pullback; a resistance break and successful retest challenge it. A recovery is not automatically a trend reversal. Intraphase candle timing is a model allocation, not a new forecast or order.' : '回调须看支撑失守及反抽受限，压力突破并回踩站稳则挑战回调情景；反弹也不直接等于趋势反转。段内蜡烛时间为模型分配，不是新增预测或下单指令。'}</p>
    </div> : null}
    {scenario ? <div className="space-y-2 text-amber-100" data-btc-pullback-scenario={scenario.status}>
      <p>{scenario.status === 'WITHDRAWN'
        ? (en ? 'The September 20 pullback path is withdrawn: price crossed 82,300 or reached 74,967.97. The chart now shows the technical baseline; fresh review is required.' : '9月20日回调路径已停用：价格越过82,300或到达74,967.97边界。当前图恢复技术基线，需重新评估，不继续硬画回调。')
        : (en ? 'September 20 review: first consolidate near resistance, then test lower supports if the rally fails. This is a user-requested hypothesis, not a confirmed reversal or a new teacher forecast.' : '9月20日修订：先在压力附近整理，反弹失败后再检验下方支撑。这是用户指定的研究假设，不是已经确认的反转，也不是老师新增的预测。')}</p>
      {scenario.status !== 'WITHDRAWN' ? <>
        <p>{en ? 'Reference levels (BTCUSDT spot, Sep 20): resistance 81,273–81,479 / 82,300; loss-of-support watch 79,500; lower references 76,888 / 76,047–76,264 / 74,968.' : '9月20日参考位（BTCUSDT现货）：压力81,273—81,479／82,300；失守观察79,500；下方依次观察76,888／76,047—76,264／74,968。'}</p>
        <p>{scenario.status === 'SUPPORT_LOST' ? (en ? 'Daily close below 79,500; a failed retest still needs confirmation.' : '日收盘已在79,500下方，反抽不能收回仍需另外确认。') : (en ? 'Support loss is not yet confirmed. The drawn decline assumes a failed rally and failed retest below 79,500.' : '支撑失守尚未确认。图中下跌段以反弹失败、跌破79,500后反抽不能收回为前提。')}</p>
        <p>{en ? 'Phase dates and candle shapes are model assumptions, not dated signals. The fixed review ends Oct 17 and does not restart each day. A closed 4h price at/above 82,300 suspends this path; a daily breach or completion at 74,967.97 requires a new review.' : '阶段日期与蜡烛形态是模型假设，不是机械转折日；本次固定到10月17日，不每天重新开始。闭合4小时价格达到82,300即暂停此路径；日线越界或回落至74,967.97后需新评估。'}</p>
      </> : null}
    </div> : null}
    <p>{en ? 'Support / loss-of-support watch' : '支撑／失守观察'}：{zone(t.support)} · {en ? 'Resistance / breakout watch' : '压力／突破观察'}：{zone(t.resistance)}</p>
    <p>{t.nearResistance ? (en ? 'Already near resistance: a rally is not a confirmed breakout. Wait for a close above and a successful retest.' : '已到压力附近：上涨不等于突破，先看收盘站上、回踩守住。')
      : t.nearSupport ? (en ? 'Near support: a close below weakens the recovery case; do not assume a bottom.' : '接近支撑：收盘跌破则修复预期减弱，不直接认定见底。')
        : (en ? 'Watch support hold and resistance break. A failed breakout or lost support requires reassessment.' : '看支撑能否守住、压力能否突破；冲高回落或支撑失守后重新评估。')}</p>
    <p className="text-xs text-slate-300">{en ? 'Scenario anchor' : '推演起点'} {price(t.anchorPrice)} · {t.fourHour ? (en ? 'latest closed 4h candle' : '最新闭合4小时K线') : (en ? 'last daily close' : '最近日收盘')}
      {t.fourHour ? ` · ${new Date(t.fourHour.through).toLocaleString(en ? 'en-US' : 'zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })} (UTC+8)` : ''}</p>
    <p className="text-xs text-slate-400">{en ? 'Daily EMA60' : '日线EMA60'} {price(t.daily.ema60)} · MACD {t.daily.dif >= 0 ? (en ? 'DIF above zero' : 'DIF在零轴上') : (en ? 'DIF below zero' : 'DIF在零轴下')} · {t.daily.histogram >= 0 ? (en ? 'positive histogram' : '正动能柱') : (en ? 'negative histogram' : '负动能柱')}
      {t.fourHour ? ` · 4h EMA60 ${price(t.fourHour.ema60)} · ${t.intradaySource}` : ''}</p>
    {t.intradayStatus === 'UNAVAILABLE' ? <p className="text-xs text-amber-200">{en ? '4h update unavailable: daily-only scenario; the current intraday move is not confirmed here.' : '4小时更新暂不可用：当前仅按日线推演，尚未确认最新盘中变化。'}</p> : null}
    <p className="text-xs text-slate-400">{en ? 'New forward scenario, not a revision of saved forecasts or an automatic order. Prices drive updates; a Fed hold or legislative progress does not guarantee a rally.' : '这是随行情更新的新推演，不修改历史预测，也不自动下单。不加息、法案进展都不等于价格必涨。'}</p>
  </div>;
}

export function DailyCandleChart({ data, en, compact = false }: { data: DailyProjectionData; en: boolean; compact?: boolean }) {
  const [level, setLevel] = useState<"MONTH" | "WEEK">(() => data.projections.some(p => p.level === 'WEEK') ? 'WEEK' : 'MONTH');
  const [source, setSource] = useState("");
  const [band, setBand] = useState(false);
  const choices = data.projections.filter(p => p.level === level);
  const projection = choices.find(p => p.sourceId === source) ?? choices[0];
  const last = data.bars.at(-1)!;
  const missing = data.unavailable?.[level] ?? 'NO_SOURCE';
  const minimumBars = data.engine.startsWith('technical-first') ? 65 : 20;
  const missingText = missing === 'INSUFFICIENT_BARS'
    ? en ? `${data.bars.length} closed candles; at least ${minimumBars} valid candles are needed for this engine.` : `闭合日K共${data.bars.length}根，本引擎至少需要${minimumBars}根有效样本，暂不推演。`
    : missing === 'CALENDAR' ? en ? 'Trading calendar for this period is pending verification.' : '该周期交易日历尚待核验。'
      : missing === 'NO_FUTURE_SESSION' ? en ? 'This published period has no remaining verified session.' : '该预测周期已无剩余可推演交易日。'
        : level === 'WEEK' ? en ? 'No independent weekly forecast. The monthly/stage chart remains available above.' : '暂无独立周预测，可切换上方月度／阶段图查看，不能把月卦冒充周卦。'
          : en ? 'No monthly/stage forecast. Check the weekly chart above.' : '暂无月度／阶段预测，可切换上方周度图查看。';
  const checkAt = new Date(data.checkedAt).toLocaleString(en ? "en-US" : "zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
  if (compact) return <div className="mt-4 space-y-3" data-compact-candles="true">
    <div className="flex flex-wrap gap-2">{(["WEEK", "MONTH"] as const).map(value => <button key={value} type="button" aria-pressed={level === value} onClick={() => { setLevel(value); setSource(""); }} className={`rounded-lg border px-4 py-2 text-sm ${level === value ? "border-cyan-300 text-cyan-100" : "border-slate-700 text-slate-400"}`}>{value === "WEEK" ? (en ? "Next 7 days" : "未来7天") : (en ? "Next 4 weeks" : "未来4周")}</button>)}</div>
    {choices.length > 1 ? <select aria-label={en ? "Forecast period" : "预测周期"} value={projection?.sourceId} onChange={e => setSource(e.target.value)} className="max-w-full rounded-lg bg-slate-900 p-2">{choices.map(p => <option key={p.sourceId} value={p.sourceId}>{horizonLabel(p, en)} · {sourcePeriod(p, en)} · V{p.sourceVersion}</option>)}</select> : null}
    <p className="text-sm"><strong>{data.stale || !projection ? (en ? "No current scenario" : "暂无有效走势推演") : (en ? directions[projection.direction] ?? projection.direction : projection.direction)}</strong>{projection && !data.stale ? ` · ${sourcePeriod(projection, en)}` : ""} · {en ? "Daily close" : "日收盘"} {price(last.close)} ({last.date})</p>
    {data.stale ? <p className="text-sm text-amber-200">{en ? `Delayed feed; expected ${data.expectedAsOf}. Scenario withheld.` : `行情延迟，应更新至${data.expectedAsOf}；暂停推演。`}</p> : !projection ? <p className="text-sm text-amber-200">{missingText}</p> : null}
    <p className="text-xs text-amber-100">{en ? "Left: real daily OHLC. Right: illustrative future scenario, not quotes or promised targets. Daily levels do not confirm an intraday entry." : "左侧真实日K，右侧未来情景模拟，不是真实报价或保证目标；日线位置不等于日内入场已确认。"}</p>
    {!data.stale ? <TechnicalReadout projection={projection} en={en} /> : null}
    {projection?.risk !== "NORMAL" && projection && !data.stale ? <p className="text-sm text-amber-200">{projection.risk === "NEAR_RESISTANCE" ? (en ? "Near resistance: wait for a confirmed breakout." : "已接近日线压力，先看能否有效突破。") : (en ? "Below EMA60: recovery remains unconfirmed." : "仍在EMA60下方，修复尚未确认。")}</p> : null}
    <ResearchCandleTerminal data={data} projection={data.stale ? undefined : projection} en={en} band={false} />
    <details className="text-xs text-slate-400"><summary className="cursor-pointer">{en ? "Daily OHLC table" : "逐日价格表"}</summary><div className="mt-2 max-h-64 overflow-auto"><table className="w-full text-right"><thead><tr>{[en ? "Type / Date" : "类型／日期", "O", "H", "L", "C"].map(label => <th scope="col" key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{[...data.bars.slice(-10).map(bar => ({ ...bar, simulated: false })), ...(data.stale ? [] : projection?.candles ?? []).map(bar => ({ ...bar, simulated: true }))].map(bar => <tr key={bar.date}><th scope="row" className="p-2">{bar.simulated ? (en ? "Sim" : "模拟") : (en ? "Real" : "真实")} {bar.date}</th>{[bar.open, bar.high, bar.low, bar.close].map((value, index) => <td key={index} className="p-2">{price(value)}</td>)}</tr>)}</tbody></table></div></details>
    <p className="text-xs text-slate-400">{data.quoteSymbol} · {data.source} · {data.timeZone} · {en ? "Checked (UTC+8)" : "检查时间（北京）"} {checkAt}{data.assetId === "asteroid" ? (en ? " · USD token price, not market cap" : " · 美元单价，非市值") : ""}{data.assetId === "spcx" ? (en ? " · USDC perpetual, not stock" : " · USDC永续，非股票") : ""}</p>
    <p className="text-xs text-slate-400">{en ? 'Refresh check every 5 minutes while visible. Crypto daily candles close at 08:00 UTC+8; closed 4h bars refresh the short-term scenario between daily closes.' : '页面可见时每5分钟检查，重新切回页面也会刷新。加密日K北京时间08:00收完，两次日收盘之间用已闭合4小时K更新短期推演。'}</p>
    {data.archiveStatus === "UNAVAILABLE" ? <p className="text-xs text-amber-200">{en ? "Not archived; not a saved forward sample." : "存档未成功，不计为已保存前瞻样本。"}</p> : null}
  </div>;
  return <div className="mt-5 space-y-3" data-daily-candle-projection="v2">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2" role="group" aria-label={en ? "Forecast horizon" : "预测周期"}>
        {(["WEEK", "MONTH"] as const).map(v => <button key={v} type="button" aria-pressed={level === v} onClick={() => { setLevel(v); setSource(""); }} className={`rounded-lg border px-4 py-2 text-sm ${level === v ? "border-cyan-300 bg-cyan-400/15 text-cyan-100" : "border-slate-700 text-slate-400"}`}>{v === "MONTH" ? data.projections.some(p => p.level === 'MONTH' && p.sourceHorizon === 'STAGE') ? en ? 'Stage forecast candles' : '阶段预测K线' : en ? "Longer-term background" : "较长周期背景" : en ? "Weekly candles" : "周度预测K线"}{!data.projections.some(p => p.level === v) ? en ? ' · unavailable' : ' · 暂无' : ''}</button>)}
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={band} onChange={e => setBand(e.target.checked)} />{en ? "Volatility bounds (not probability)" : "波动边界（非概率区间）"}</label>
    </div>
    {!data.stale ? <TechnicalReadout projection={projection} en={en} /> : null}
    <div className="space-y-1 rounded-lg border border-slate-700 p-3 text-sm" aria-label={en ? 'Outlooks by horizon' : '分周期走势'}>
      {data.projections.map(p => <p key={p.sourceId}>{horizonLabel(p, en)} · {sourcePeriod(p, en)}：<strong>{en ? directions[p.direction] ?? p.direction : p.direction}</strong></p>)}
      {data.projections.some(p => p.level === 'WEEK') && data.projections.some(p => p.level === 'MONTH') ? <p className="text-xs text-slate-400">{en ? 'Short-term moves and the longer-term trend can differ; check the selected horizon.' : '短期反弹与较长周期趋势可能不同，请按所选周期看。'}</p> : null}
    </div>
    {choices.length > 1 ? <select aria-label={en ? "Published period" : "正式预测周期"} className="rounded-lg bg-slate-900 p-2 text-sm" value={projection?.sourceId} onChange={e => setSource(e.target.value)}>{choices.map(p => <option key={p.sourceId} value={p.sourceId}>{horizonLabel(p, en)} · {sourcePeriod(p, en)} · V{p.sourceVersion}</option>)}</select> : null}
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      <span>{en ? "Last daily close" : "最新日K收盘"} <strong>{price(last.close)}</strong> · {last.date}</span>
      {projection ? <strong className="text-cyan-200" data-selected-forecast={projection.sourceId}>{horizonLabel(projection, en)}：{en ? directions[projection.direction] ?? projection.direction : projection.direction} · {sourcePeriod(projection, en)}</strong> : null}
    </div>
    {projection ? <p className="text-xs text-slate-400">{en ? 'Plotted simulation dates (not the full source period)' : '图中模拟日期（不等于完整预测周期）'}：{projection.candles[0]?.date}—{projection.candles.at(-1)?.date}</p> : null}
    {projection?.direction === '震荡' ? <p className="text-sm text-amber-200">{en ? 'Range-bound does not specify a dip-then-recovery sequence or a bottom date. Candle fluctuations are illustrative only.' : '震荡不代表先跌后涨，也不指定见底日期；蜡烛起伏仅为模拟。'}</p> : null}
    <p className="text-xs text-amber-200">{en ? "Future candles = one historical-shape simulation, not future quotes or validated daily targets." : "右侧是参考历史波动形态的未来模拟，不是真实报价；尚未验证准确率。"}</p>
    {data.stale ? <p className="rounded-lg border border-amber-400/30 p-3 text-sm text-amber-200">{en ? `Daily feed delayed: expected ${data.expectedAsOf}. Forecast withheld.` : `日K数据延迟：应更新至 ${data.expectedAsOf}，完整行情到达前暂停预测。`}</p> : !projection ? <p className="p-3 text-sm text-amber-200">{missingText}</p> : null}
    {data.assetId === 'spcx' ? <p className="text-xs text-amber-200">{en ? 'Mythos SPCX perpetual, quoted in USDC — not stock spot prices. Zero-volume candles may reflect order-book quotes, not trades.' : 'Mythos SPCX永续合约，USDC计价，并非股票现货报价；零成交量K线可能来自盘口报价，不代表实际成交。'}</p> : null}
    {data.assetId === 'asteroid' ? <p className="text-xs text-slate-400">{en ? 'ASTEROID token price in USD, not market capitalization; Ethereum contract 0xf280…694126.' : '这里是ASTEROID代币美元单价，不是市值；以太坊合约0xf280…694126。'}</p> : null}
    {['gold','silver','wti-crude'].includes(data.assetId) ? <p className="text-xs text-slate-400">{en ? 'Continuous futures reference, not spot; rollover can affect prices. September settlement-day calendar verified; no separate Sep 7 daily forecast candle.' : '连续期货参考行情，并非现货；换月可能影响价格。已核验9月结算交易日日历，9月7日不单独绘制预测日K。'}</p> : null}
    {projection && projection.risk !== "NORMAL" ? <p className="text-sm text-amber-200">{projection.risk === "NEAR_RESISTANCE" ? en ? "Near daily resistance: upside scenario reduced. Watch the breakout." : "接近日线压力：上行幅度已收敛，先看突破能否站稳。" : en ? "Below daily EMA60: recovery unconfirmed; upside scenario reduced." : "处于日线EMA60下方：修复待确认，上行幅度已收敛。"}</p> : null}
    <ResearchCandleTerminal data={data} projection={data.stale ? undefined : projection} en={en} band={band} />
    <p className="text-xs text-slate-400">{en ? "Daily data through" : "日K已更新至"} {data.asOf} · {en ? "Checked (Beijing)" : "检查时间（北京）"} {checkAt} · {data.source} · {data.timeZone}</p>
    {data.archiveStatus === "UNAVAILABLE" ? <p className="text-xs text-amber-200">{en ? "Archiving failed. Not a saved forward sample." : "版本存档未成功；当前测算不算已保存的前瞻样本。"}</p> : null}
    <details className="text-xs text-slate-400"><summary className="cursor-pointer">{en ? "Daily OHLC prices" : "逐日开高低收价格表"}</summary>
      <div className="mt-3 max-h-64 overflow-auto"><table className="w-full text-right"><caption className="p-2 text-left">{en ? "Observed and simulated prices are labeled separately." : "真实行情与未来模拟分别标记"}</caption><thead><tr>{[en ? "Type / Date" : "类型／日期", "O", "H", "L", "C"].map(s => <th scope="col" key={s} className="p-2">{s}</th>)}</tr></thead><tbody>{[...data.bars.slice(-10).map(b => ({ ...b, future: false })), ...(projection?.candles ?? []).map(b => ({ ...b, future: true }))].map(b => <tr key={b.date} className="border-t border-slate-800"><th scope="row" className={`p-2 ${b.future ? "text-amber-200" : "text-cyan-200"}`}>{b.future ? en ? "Sim" : "模拟" : en ? "Real" : "真实"} {b.date}</th>{[b.open, b.high, b.low, b.close].map((n, i) => <td key={i} className="p-2">{price(n)}</td>)}</tr>)}</tbody></table></div>
    </details>
    {projection?.technical ? <details className="text-xs text-slate-400"><summary className="cursor-pointer">{en ? 'Technical scenario methodology' : '技术推演与版本'}</summary>
      <p>{en ? 'The technical baseline uses EMA, MACD and prior-range structure, with closed 4h weights of 30% (7 days) and 10% (4 weeks), not probabilities. A separately labelled conditional review instead uses its disclosed phase assumptions and reference levels; the technical baseline stays selectable. Neither path is a calibrated forecast or order instruction.' : '技术基线使用EMA、MACD与前期区间结构，4小时技术分占7天30%、4周10%，不是概率。另行标注的条件研究情景采用其公开说明的阶段假设和参考位，技术基线保留供切换对照。两者都不是经校准的预测或下单指令。'}</p>
      <p>{data.engine} · {projection.generatedAt}</p>
    </details> : projection ? <details className="text-xs text-slate-400"><summary className="cursor-pointer">{en ? "Simulation assumptions & saved version" : "模拟假设与存档版本"}</summary>
      <p className="mt-3">{en ? "Direction and dated windows constrain the central ATR14 scenario. A consecutive closed historical sample supplies detrended fluctuations, body sizes and unequal wicks. Residual moves are capped at 0.75 ATR and pinned to zero at explicit dates and the endpoint. Stock gap assumptions are capped at 0.5 ATR; crypto opens connect to the previous simulated close. This single deterministic sample is not a calibrated probability distribution or a day-by-day buy/sell call. Future volume is not generated." : "周期方向、明确日期约束ATR14主路径；取已闭合历史连续样本，去掉其趋势后参考波动、实体和不等长影线。主路径偏移上限0.75 ATR，明确日期与终点偏移归零；股票跳空假设上限0.5 ATR，加密开盘衔接前一模拟收盘。只是一个可复现的形态样本，不是经过校准的概率预测或逐日买卖判断，不生成未来成交量。"}</p>
      <p className="mt-2">{projection.dateBasis === "MODEL_PHASE_ALLOCATION" ? en ? "Undated phases use the original period's verified trading sessions where fully available, not newly predicted turning dates." : "无明确日期的节奏在完整日历可核验时按原周期交易日分配，不冒充新增转折日。" : en ? "Explicit dates remain watch windows, not guaranteed turns." : "明确日期是观察窗口，不保证当日转折。"}</p>
      <p className="mt-2">ATR14 {price(projection.atr14)} · EMA60 {projection.ema60 ? price(projection.ema60) : "—"} · V{projection.sourceVersion} · {projection.generatedAt} · {data.engine} · {data.archiveStatus === "STORED" ? en ? "Archived" : "已存档" : en ? "Not archived" : "未存档"}</p>
      <p className="mt-2">{en ? "Hourly checks; each new closed day generates a new version. Originals retained. Current-session calculations are not pre-open predictions. Optional bounds are ±ATR×√sessions, not confidence intervals." : "每小时检查，新增闭合日K后生成新版本，旧版保留。开盘后测算不冒充盘前预测；可选边界为±ATR×√交易日，不是置信区间。"}</p>
    </details> : null}
  </div>;
}
