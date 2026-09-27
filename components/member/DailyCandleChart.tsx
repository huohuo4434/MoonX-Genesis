"use client";

import { useState } from 'react';
import type { DailyProjectionData } from '@/lib/research/daily-candle-projection-core';
import { SOURCE_RESEARCH_POLICY, researchWindow } from '@/lib/research/source-research-view';
import { ResearchCandleTerminal } from './ResearchCandleTerminal';

const price = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: n < .001 ? 10 : n < 1 ? 6 : 2 });
const directions: Record<string, string> = { 上涨: 'Rising', 下跌: 'Falling', 震荡: 'Range-bound', 震荡上涨: 'Choppy rise', 震荡下跌: 'Choppy decline', 先涨后跌: 'Rise, then pull back', 先跌后涨: 'Dip, then recover' };
const dates: Record<string, [string, string]> = { strength: ['转强观察', 'Strength watch'], risk: ['回撤风险观察', 'Pullback risk watch'], low: ['低点候选', 'Candidate low'], high: ['高点候选', 'Candidate high'], watch: ['节奏观察', 'Timing watch'] };

export function DailyCandleChart({ data, en, compact = false }: { data: DailyProjectionData; en: boolean; compact?: boolean }) {
  const [level, setLevel] = useState<'WEEK' | 'MONTH'>('WEEK');
  // Fail closed for old API/cache payloads; never interpret synthetic projections as sources.
  const research = data.research?.policy === SOURCE_RESEARCH_POLICY && data.research.assetId === data.assetId
    && data.research.asOfDate === data.projectionDate ? data.research : undefined;
  const view = research ? researchWindow(research, level) : null;
  const last = data.bars.at(-1);
  const checkAt = new Date(data.checkedAt).toLocaleString(en ? 'en-US' : 'zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  return <div className="mt-4 space-y-3" data-source-research={SOURCE_RESEARCH_POLICY} data-compact-candles={compact ? 'true' : 'false'}>
    <p className="rounded-lg border border-amber-400/30 bg-amber-950/15 p-3 text-sm text-amber-100">{en
      ? 'Unsupported future price simulations have been removed. Observed candles only; research retains its original periods and versions. No invented daily prices or automatic orders.'
      : '已撤下无依据的未来价格模拟。图中只保留真实行情；研究按原周期和版本展示，不编造逐日价位，不自动下单。'}</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label={en ? 'Research window' : '研究窗口'}>
      {(['WEEK', 'MONTH'] as const).map(value => <button type="button" key={value} aria-pressed={level === value} onClick={() => setLevel(value)} className={`rounded-lg border px-4 py-2 text-sm ${level === value ? 'border-cyan-300 text-cyan-100' : 'border-slate-700 text-slate-400'}`}>
        {value === 'WEEK' ? en ? 'Next 7 days · sources' : '近7天 · 研究依据' : en ? 'Next 4 weeks · sources' : '近4周 · 研究依据'}
      </button>)}
    </div>
    <section className="space-y-3 rounded-xl border border-slate-700 p-4 text-sm" aria-label={en ? 'Source-backed research' : '有来源的研究展示'}>
      <h3 className="font-semibold">{en ? 'Published research · original periods' : '已发布研究 · 保留原周期'}{view ? ` · ${view.start}—${view.end}` : ''}</h3>
      {view && data.assetId === 'btc' && data.editorialContext ? <div className="space-y-2 rounded-lg bg-cyan-950/30 p-3" data-editorial-context={data.editorialContext.version}>
        <h4 className="font-semibold text-cyan-200">{en ? 'Yi current research context · annual background, not a new weekly forecast' : '易老师最新研究背景 · 年度背景，不冒充新周预测'} · {data.editorialContext.reviewDate}</h4>
        {data.editorialContext.months.filter(m => m.month >= view.start.slice(0, 7) && m.month <= view.end.slice(0, 7)).map(m => <div key={m.month}><p>{m.month} · {en ? m.en : m.zh}</p><p className="text-xs text-slate-300">{en ? m.watchEn : m.watchZh}</p></div>)}
        <p className="text-xs text-slate-400">{en ? 'Older locked records below remain for comparison and review; they do not replace this later context.' : '下方旧版锁定记录保留作分歧对照与复盘，不用旧记录替代本次较新背景。'}</p>
      </div> : null}
      <p className="text-xs text-slate-400">{en ? 'A source reading list, not one merged forecast. Weekly/stage direction and longer-term context remain separate; disagreements are retained. No probability or win rate is inferred.' : '这是本窗口对应的资料清单，不是把所有资料合成一条预测。周／阶段方向与较长周期背景分开，分歧保留；不生成概率或胜率。'}</p>
      {!view ? <p className="text-amber-200">{en ? 'Source data is not verified in this response. Refresh to retry; old price simulations will not be reused.' : '本次响应的研究来源待核验，请刷新重试；不沿用旧价格模拟。'}</p> : <>
        {!view.records.length ? <p className="text-amber-200">{en ? 'No verified published source covers this window. Direction and price targets are left unspecified.' : '本窗口暂无可核验的已发布资料，方向与目标价留空。'}</p> : null}
        {view.records.map(p => <article key={`${p.id}:${p.version}`} className="space-y-1 border-l-2 border-cyan-600 pl-3">
          <p><strong>{p.sourceHorizon === 'STAGE' ? en ? 'Stage direction' : '阶段方向' : p.level === 'WEEK' ? en ? 'Weekly direction' : '周度方向' : en ? 'Monthly / multi-month background' : '月度／多月背景'}</strong> · {en ? directions[p.direction] : p.direction} · V{p.version}</p>
          <p>{en ? 'Original period' : '原周期'}：{p.periodStart}—{p.periodEnd} · {p.periodStart > research!.asOfDate ? en ? 'Not started' : '尚未开始' : en ? 'Period in progress' : '周期进行中'}</p>
          <p className="text-xs text-slate-400">{en ? 'Locked (UTC+8)' : '锁定时间（北京）'}：{new Date(p.lockedAt).toLocaleString(en ? 'en-US' : 'zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}</p>
          {p.phases?.filter(s => s.periodStart <= view.end && s.periodEnd >= view.start).map(s => <p key={`${s.periodStart}:${s.periodEnd}`}>{en ? 'Recorded phase' : '原文分段'}：{s.periodStart}—{s.periodEnd} · {en ? directions[s.direction] : s.direction}</p>)}
          {p.windows.filter(w => w.focusDate <= view.end).map(w => <p key={w.id}>{w.focusDate} · {dates[w.kind]?.[en ? 1 : 0]}{w.closed ? en ? ' · closed / verify session' : ' · 休市／交易时段待核实' : ''}</p>)}
        </article>)}
        {view.gaps.length ? <p className="text-amber-200">{en ? (level === 'WEEK' ? 'No independent weekly/stage coverage: ' : 'No source coverage: ') : (level === 'WEEK' ? '缺少独立周／阶段资料的日期：' : '资料未覆盖日期：')}{view.gaps.map(g => `${g.start}—${g.end}`).join('；')}。{en ? 'Await sources; no invented daily path.' : '等待新资料，不补画每日路径。'}</p> : null}
        <p className="text-xs text-slate-400">{en ? 'Period direction does not mean every day moves the same way. Passed phases do not restart; windows are not guaranteed turns. A support break and failed retest support a pullback case; a held breakout challenges it, without rewriting locked research.' : '周期方向不代表每天同向，已经走过的阶段不重新起算；关键日不是必然转折。支撑失守且反抽受限可增强回调情景，突破并回踩守住则构成反证，但都不改写已锁定研究。'}</p>
      </>}
      {data.assetId === 'btc' ? <p>{en ? 'September / January annual windows are background, not seven-day or four-week price targets.' : '9月／跨年1月高点候选窗口属于年度背景，不等于七天或四周目标价。'} <a className="text-cyan-300 underline" href={`${en ? '/en' : ''}/member/monthly#btc-annual-20260927`}>{en ? 'Yi annual review · 2026-09-27 V1' : '易老师年度研究解读 · 2026-09-27 V1'}</a></p> : ['eth', 'sol', 'hype'].includes(data.assetId) ? <p>{en ? 'BTC annual windows do not establish this asset’s direction or targets.' : 'BTC年度窗口不能直接变成本币种的方向或目标价。'} <a className="text-cyan-300 underline" href={`${en ? '/en' : ''}/member/monthly#btc-annual-20260927`}>{en ? 'Cross-asset limits' : '查看跨币种参考边界'}</a></p> : null}
      <a className="inline-block text-cyan-300 underline" href={`${en ? '/en' : ''}/member/key-dates?research=1`}>{en ? 'Source records and timing context' : '查看来源记录与关键日说明'}</a>
    </section>
    {data.stale ? <p className="text-amber-200">{en ? `Delayed market data; expected ${data.expectedAsOf}. Historical display only, not a current entry basis.` : `行情延迟，应更新至${data.expectedAsOf}。仅展示历史数据，不作为当前入场依据。`}</p> : null}
    {last ? <><p className="text-sm">{en ? 'Last closed daily candle' : '最近闭合日K'}：{last.date} · {en ? 'Close' : '收盘'} {price(last.close)} · {data.quoteSymbol}</p>
      <ResearchCandleTerminal data={data} en={en} band={false} />
      <details className="text-xs text-slate-400"><summary className="cursor-pointer">{en ? 'Historical daily OHLC table' : '历史逐日价格表'}</summary><div className="mt-2 max-h-64 overflow-auto"><table className="w-full text-right"><thead><tr>{[en ? 'Observed date' : '真实行情日期', 'O', 'H', 'L', 'C'].map(label => <th scope="col" key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{data.bars.slice(-30).map(bar => <tr key={bar.date}><th scope="row" className="p-2">{bar.date}</th>{[bar.open, bar.high, bar.low, bar.close].map((value, index) => <td key={index} className="p-2">{price(value)}</td>)}</tr>)}</tbody></table></div></details></> : <p>{en ? 'Observed candles unavailable.' : '暂无真实K线。'}</p>}
    <p className="text-xs text-slate-400">{data.quoteSymbol} · {data.source} · {data.timeZone} · {en ? 'Checked (UTC+8)' : '检查时间（北京）'} {checkAt}</p>
    {data.assetId === 'spcx' ? <p className="text-xs text-amber-200">{en ? 'USDC perpetual, not stock. Zero-volume candles may reflect quoted prices.' : 'USDC永续，非股票；零成交量K线可能来自盘口报价。'}</p> : data.assetId === 'asteroid' ? <p className="text-xs text-amber-200">{en ? 'USD token price, not market cap.' : '美元单价，非市值。'}</p> : null}
    <p className="text-xs text-slate-400">{en ? 'Visible pages check every 5 minutes. Crypto daily candles close at 08:00 UTC+8. Historical bars and indicators are not live ticks or entry instructions.' : '页面可见时每5分钟检查，重新切回页面也会刷新。加密日K北京时间08:00收完；闭合日K及指标不是实时逐笔报价，日线位置不等于日内入场已确认。'}</p>
  </div>;
}
