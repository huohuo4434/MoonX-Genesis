"use client";

import { useState } from "react";
import type { DailyProjectionData } from "@/lib/research/daily-candle-projection-core";
import { ResearchCandleTerminal } from "./ResearchCandleTerminal";

const price = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: n < .001 ? 10 : n < 1 ? 6 : 2 });
const directions: Record<string, string> = { 上涨: "Rising", 下跌: "Falling", 震荡: "Range-bound", 震荡上涨: "Choppy rise", 震荡下跌: "Choppy decline", 先涨后跌: "Rise, then pull back", 先跌后涨: "Dip, then recover" };

export function DailyCandleChart({ data, en }: { data: DailyProjectionData; en: boolean }) {
  const [level, setLevel] = useState<"MONTH" | "WEEK">(() => data.projections.some(p => p.level === 'MONTH') ? 'MONTH' : data.projections.some(p => p.level === 'WEEK') ? 'WEEK' : 'MONTH');
  const [source, setSource] = useState("");
  const [band, setBand] = useState(false);
  const choices = data.projections.filter(p => p.level === level);
  const projection = choices.find(p => p.sourceId === source) ?? choices[0];
  const last = data.bars.at(-1)!;
  const missing = data.unavailable?.[level] ?? 'NO_SOURCE';
  const missingText = missing === 'INSUFFICIENT_BARS'
    ? en ? `Only ${data.bars.length} closed candles or insufficient volatility history; at least 20 are needed.` : `闭合日K共${data.bars.length}根，尚不足20根或缺少有效波动样本，暂不推演。`
    : missing === 'CALENDAR' ? en ? 'Trading calendar for this period is pending verification.' : '该周期交易日历尚待核验。'
      : missing === 'NO_FUTURE_SESSION' ? en ? 'This published period has no remaining verified session.' : '该预测周期已无剩余可推演交易日。'
        : level === 'WEEK' ? en ? 'No independent weekly forecast. The monthly/stage chart remains available above.' : '暂无独立周预测，可切换上方月度／阶段图查看，不能把月卦冒充周卦。'
          : en ? 'No monthly/stage forecast. Check the weekly chart above.' : '暂无月度／阶段预测，可切换上方周度图查看。';
  const checkAt = new Date(data.checkedAt).toLocaleString(en ? "en-US" : "zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
  return <div className="mt-5 space-y-3" data-daily-candle-projection="v2">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2" role="group" aria-label={en ? "Forecast horizon" : "预测周期"}>
        {(["MONTH", "WEEK"] as const).map(v => <button key={v} type="button" aria-pressed={level === v} onClick={() => { setLevel(v); setSource(""); }} className={`rounded-lg border px-4 py-2 text-sm ${level === v ? "border-cyan-300 bg-cyan-400/15 text-cyan-100" : "border-slate-700 text-slate-400"}`}>{v === "MONTH" ? data.projections.some(p => p.level === 'MONTH' && p.sourceHorizon === 'STAGE') ? en ? 'Stage forecast candles' : '阶段预测K线' : en ? "Monthly candles" : "月度预测K线" : en ? "Weekly candles" : "周度预测K线"}{!data.projections.some(p => p.level === v) ? en ? ' · unavailable' : ' · 暂无' : ''}</button>)}
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={band} onChange={e => setBand(e.target.checked)} />{en ? "Volatility bounds (not probability)" : "波动边界（非概率区间）"}</label>
    </div>
    {choices.length > 1 ? <select aria-label={en ? "Published period" : "正式预测周期"} className="rounded-lg bg-slate-900 p-2 text-sm" value={projection?.sourceId} onChange={e => setSource(e.target.value)}>{choices.map(p => <option key={p.sourceId} value={p.sourceId}>{p.level} · {p.candles[0]?.date}—{p.candles.at(-1)?.date} · V{p.sourceVersion}</option>)}</select> : null}
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      <span>{en ? "Last daily close" : "最新日K收盘"} <strong>{price(last.close)}</strong> · {last.date}</span>
      {projection ? <strong className="text-cyan-200">{en ? directions[projection.direction] ?? projection.direction : projection.direction} · {projection.candles[0]?.date}—{projection.candles.at(-1)?.date}</strong> : null}
    </div>
    <p className="text-xs text-amber-200">{en ? "Future candles = one historical-shape simulation, not future quotes or validated daily targets." : "右侧是参考历史波动形态的未来模拟，不是真实报价；尚未验证准确率。"}</p>
    {data.stale ? <p className="rounded-lg border border-amber-400/30 p-3 text-sm text-amber-200">{en ? `Daily feed delayed: expected ${data.expectedAsOf}. Forecast withheld.` : `日K数据延迟：应更新至 ${data.expectedAsOf}，完整行情到达前暂停预测。`}</p> : !projection ? <p className="p-3 text-sm text-amber-200">{missingText}</p> : null}
    {data.assetId === 'spcx' ? <p className="text-xs text-amber-200">{en ? 'Mythos SPCX perpetual, quoted in USDC — not stock spot prices. Zero-volume candles may reflect order-book quotes, not trades.' : 'Mythos SPCX永续合约，USDC计价，并非股票现货报价；零成交量K线可能来自盘口报价，不代表实际成交。'}</p> : null}
    {data.assetId === 'asteroid' ? <p className="text-xs text-slate-400">{en ? 'ASTEROID token price in USD, not market capitalization; Ethereum contract 0xf280…694126.' : '这里是ASTEROID代币美元单价，不是市值；以太坊合约0xf280…694126。'}</p> : null}
    {['gold','silver','wti-crude'].includes(data.assetId) ? <p className="text-xs text-slate-400">{en ? 'Continuous futures reference, not spot; rollover can affect prices. September settlement-day calendar verified; no separate Sep 7 daily forecast candle.' : '连续期货参考行情，并非现货；换月可能影响价格。已核验9月结算交易日日历，9月7日不单独绘制预测日K。'}</p> : null}
    {projection && projection.risk !== "NORMAL" ? <p className="text-sm text-amber-200">{projection.risk === "NEAR_RESISTANCE" ? en ? "Near daily resistance: upside scenario reduced. Watch the breakout." : "接近日线压力：上行幅度已收敛，先看突破能否站稳。" : en ? "Below daily EMA60: recovery unconfirmed; upside scenario reduced." : "处于日线EMA60下方：修复待确认，上行幅度已收敛。"}</p> : null}
    <ResearchCandleTerminal data={data} projection={projection} en={en} band={band} />
    <p className="text-xs text-slate-400">{en ? "Daily data through" : "日K已更新至"} {data.asOf} · {en ? "Checked (Beijing)" : "检查时间（北京）"} {checkAt} · {data.source} · {data.timeZone}</p>
    {data.archiveStatus === "UNAVAILABLE" ? <p className="text-xs text-amber-200">{en ? "Archiving failed. Not a saved forward sample." : "版本存档未成功；当前测算不算已保存的前瞻样本。"}</p> : null}
    <details className="text-xs text-slate-400"><summary className="cursor-pointer">{en ? "Daily OHLC prices" : "逐日开高低收价格表"}</summary>
      <div className="mt-3 max-h-64 overflow-auto"><table className="w-full text-right"><caption className="p-2 text-left">{en ? "Observed and simulated prices are labeled separately." : "真实行情与未来模拟分别标记"}</caption><thead><tr>{[en ? "Type / Date" : "类型／日期", "O", "H", "L", "C"].map(s => <th scope="col" key={s} className="p-2">{s}</th>)}</tr></thead><tbody>{[...data.bars.slice(-10).map(b => ({ ...b, future: false })), ...(projection?.candles ?? []).map(b => ({ ...b, future: true }))].map(b => <tr key={b.date} className="border-t border-slate-800"><th scope="row" className={`p-2 ${b.future ? "text-amber-200" : "text-cyan-200"}`}>{b.future ? en ? "Sim" : "模拟" : en ? "Real" : "真实"} {b.date}</th>{[b.open, b.high, b.low, b.close].map((n, i) => <td key={i} className="p-2">{price(n)}</td>)}</tr>)}</tbody></table></div>
    </details>
    {projection ? <details className="text-xs text-slate-400"><summary className="cursor-pointer">{en ? "Simulation assumptions & saved version" : "模拟假设与存档版本"}</summary>
      <p className="mt-3">{en ? "Direction and dated windows constrain the central ATR14 scenario. A consecutive closed historical sample supplies detrended fluctuations, body sizes and unequal wicks. Residual moves are capped at 0.75 ATR and pinned to zero at explicit dates and the endpoint. Stock gap assumptions are capped at 0.5 ATR; crypto opens connect to the previous simulated close. This single deterministic sample is not a calibrated probability distribution or a day-by-day buy/sell call. Future volume is not generated." : "周期方向、明确日期约束ATR14主路径；取已闭合历史连续样本，去掉其趋势后参考波动、实体和不等长影线。主路径偏移上限0.75 ATR，明确日期与终点偏移归零；股票跳空假设上限0.5 ATR，加密开盘衔接前一模拟收盘。只是一个可复现的形态样本，不是经过校准的概率预测或逐日买卖判断，不生成未来成交量。"}</p>
      <p className="mt-2">{projection.dateBasis === "MODEL_PHASE_ALLOCATION" ? en ? "Undated phases are allocated across the original period, not newly predicted turning dates." : "无明确日期的节奏按原周期分段分配，不冒充新增转折日。" : en ? "Explicit dates remain watch windows, not guaranteed turns." : "明确日期是观察窗口，不保证当日转折。"}</p>
      <p className="mt-2">ATR14 {price(projection.atr14)} · EMA60 {projection.ema60 ? price(projection.ema60) : "—"} · V{projection.sourceVersion} · {projection.generatedAt} · {data.engine} · {data.archiveStatus === "STORED" ? en ? "Archived" : "已存档" : en ? "Not archived" : "未存档"}</p>
      <p className="mt-2">{en ? "Hourly checks; each new closed day generates a new version. Originals retained. Current-session calculations are not pre-open predictions. Optional bounds are ±ATR×√sessions, not confidence intervals." : "每小时检查，新增闭合日K后生成新版本，旧版保留。开盘后测算不冒充盘前预测；可选边界为±ATR×√交易日，不是置信区间。"}</p>
    </details> : null}
  </div>;
}
