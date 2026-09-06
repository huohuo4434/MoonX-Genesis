"use client";

import { useState } from "react";
import type { DailyProjectionData } from "@/lib/research/daily-candle-projection-core";

const price = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: n < 1 ? 6 : 2 });
const directions: Record<string, string> = { 上涨: "Rising", 下跌: "Falling", 震荡: "Range-bound", 震荡上涨: "Choppy rise", 震荡下跌: "Choppy decline", 先涨后跌: "Rise, then pull back", 先跌后涨: "Dip, then recover" };

export function DailyCandleChart({ data, en }: { data: DailyProjectionData; en: boolean }) {
  const [level, setLevel] = useState<"MONTH" | "WEEK">("MONTH");
  const [source, setSource] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [band, setBand] = useState(false);
  const choices = data.projections.filter(p => p.level === level);
  const projection = choices.find(p => p.sourceId === source) ?? choices[0];
  const actual = data.bars.slice(-28).map(b => ({ ...b, future: false, rangeLow: b.low, rangeHigh: b.high }));
  const future = (projection?.candles ?? []).map(b => ({ ...b, future: true }));
  const bars = [...actual, ...future];
  const last = actual.at(-1)!;
  const selected = bars.find(b => `${b.future}:${b.date}` === hover) ?? future[0] ?? last;
  const extra = [data.support?.low, data.support?.high, data.resistance?.low, data.resistance?.high].filter((n): n is number => n !== undefined);
  const min = Math.min(...bars.map(b => band && b.future ? b.rangeLow : b.low), ...extra);
  const max = Math.max(...bars.map(b => band && b.future ? b.rangeHigh : b.high), ...extra);
  const pad = Math.max((max - min) * .1, max * .005);
  const step = 840 / Math.max(bars.length, 1);
  const x = (i: number) => 36 + (i + .5) * step;
  const y = (n: number) => 42 + (max + pad - n) / (max - min + 2 * pad) * 320;
  const split = 36 + actual.length * step;
  const checkAt = new Date(data.checkedAt).toLocaleString(en ? "en-US" : "zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
  return <div className="mt-5 space-y-3" data-daily-candle-projection="v1">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2" role="group" aria-label={en ? "Forecast horizon" : "预测周期"}>
        {(["MONTH", "WEEK"] as const).map(v => <button key={v} type="button" aria-pressed={level === v} onClick={() => { setLevel(v); setSource(""); setHover(null); }} className={`rounded-lg border px-4 py-2 text-sm ${level === v ? "border-cyan-300 bg-cyan-400/15 text-cyan-100" : "border-slate-700 text-slate-400"}`}>{v === "MONTH" ? en ? "Monthly candles" : "月度预测K线" : en ? "Weekly candles" : "周度预测K线"}</button>)}
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={band} onChange={e => setBand(e.target.checked)} />{en ? "Show volatility envelope" : "显示波动范围"}</label>
    </div>
    {choices.length > 1 ? <select aria-label={en ? "Published period" : "正式预测周期"} className="rounded-lg bg-slate-900 p-2 text-sm" value={projection?.sourceId} onChange={e => { setSource(e.target.value); setHover(null); }}>{choices.map(p => <option key={p.sourceId} value={p.sourceId}>{p.level} · {p.candles[0]?.date}—{p.candles.at(-1)?.date} · V{p.sourceVersion}</option>)}</select> : null}
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      <span>{en ? "Last daily close" : "最新日K收盘"} <strong className="text-slate-100">{price(last.close)}</strong> · {last.date}</span>
      {projection ? <span className="text-cyan-200">{en ? directions[projection.direction] ?? projection.direction : projection.direction} · {projection.candles[0]?.date}—{projection.candles.at(-1)?.date}</span> : null}
      <span className="text-amber-200">{en ? "Conditional model · uncalibrated" : "条件情景模型 · 尚未验证准确率"}</span>
    </div>
    {data.stale ? <p className="rounded-lg border border-amber-400/30 p-3 text-sm text-amber-200">{en ? `Daily feed delayed: expected ${data.expectedAsOf}. Forecast candles are withheld until the closed data arrives.` : `日K数据延迟：应更新至 ${data.expectedAsOf}。完整行情到达前暂不生成预测K线。`}</p> : !projection ? <p className="p-3 text-sm text-amber-200">{en ? "No usable published forecast, verified session calendar or enough closed candles for this horizon. Actual data only." : "该周期暂无可用正式预测、已核验交易日历或充足闭合K线；仅显示真实行情。"}</p> : null}
    {projection ? <p className={`text-sm ${projection.risk === "NORMAL" ? "text-slate-300" : "text-amber-200"}`}>{projection.risk === "NEAR_RESISTANCE" ? en ? "Near daily resistance: upside scenario reduced. Wait for a sustained breakout." : "已接近日线压力区：上行测算幅度已收敛，先看突破能否站稳。" : projection.risk === "BELOW_EMA60" ? en ? "Below daily EMA60: recovery remains unconfirmed; upside scenario reduced." : "仍处于日线EMA60下方：修复尚待确认，上行测算幅度已收敛。" : en ? "Watch support on pullbacks and resistance on rallies; model candles are not orders." : "回踩看支撑，冲高看压力；预测K线不等于下单指令。"}</p> : null}
    <div className="rounded-xl border border-slate-700/60 bg-[#080e17]">
      <p className="min-h-12 px-4 pt-3 font-mono text-xs text-slate-300" aria-live="polite"><span className={selected.future ? "text-amber-200" : "text-emerald-200"}>{selected.future ? en ? "MODEL" : "预测测算" : en ? "ACTUAL" : "真实日K"}</span> · {selected.date} · O {price(selected.open)} · H {price(selected.high)} · L {price(selected.low)} · C {price(selected.close)}</p>
      <div className="overflow-x-auto" role="region" tabIndex={0} aria-label={en ? "Dated and priced daily candles" : "带日期价格的日K预测图"}>
        <svg viewBox="0 0 990 430" className="w-full min-w-[860px]" role="img" aria-label={en ? "Solid candles: observed. Hollow amber and blue candles: conditional forecast OHLC." : "实心为真实日K，空心金蓝色为未来日K条件推演，横轴日期纵轴价格"}>
          <title>{data.quoteSymbol} · {en ? "Daily OHLC: actual / conditional forecast" : "真实日K / 未来日K条件推演"}</title>
          {future.length ? <rect x={split} y="30" width={876 - split} height="340" fill="#fbbf24" opacity=".04" /> : null}
          {Array.from({ length: 6 }, (_, i) => min + (max - min) * i / 5).map(n => <g key={n}><line x1="36" x2="876" y1={y(n)} y2={y(n)} stroke="#243143" strokeDasharray="3 5" /><text x="885" y={y(n) + 4} fontSize="12" fill="#cbd5e1">{price(n)}</text></g>)}
          {([['support', '#38bdf8'], ['resistance', '#fb7185']] as const).map(([key, color]) => { const zone = data[key]; return zone ? <g key={key}><rect x="36" width="840" y={y(zone.high)} height={Math.max(2, y(zone.low) - y(zone.high))} fill={color} opacity=".15" /><line x1="36" x2="876" y1={y(zone.low)} y2={y(zone.low)} stroke={color} strokeDasharray="6 5" /><text x="40" y={y(zone.high) - 5} fill={color} fontSize="10">{key === "support" ? en ? "Support" : "支撑" : en ? "Resistance" : "压力"} {price(zone.low)}–{price(zone.high)}</text></g> : null; })}
          {band && future.length ? <polygon points={[...future.map((b, i) => `${x(actual.length + i)},${y(b.rangeHigh)}`), ...future.map((b, i) => `${x(actual.length + i)},${y(b.rangeLow)}`).reverse()].join(" ")} fill="#fbbf24" opacity=".10" /> : null}
          {bars.map((b, i) => { const color = b.future ? b.close >= b.open ? "#fbbf24" : "#7dd3fc" : b.close >= b.open ? "#34d399" : "#fb7185"; return <g key={`${b.future}:${b.date}`} onMouseEnter={() => setHover(`${b.future}:${b.date}`)} onFocus={() => setHover(`${b.future}:${b.date}`)} onClick={() => setHover(`${b.future}:${b.date}`)} tabIndex={0} role="button" aria-label={`${b.future ? 'MODEL' : 'ACTUAL'} ${b.date} O ${price(b.open)} H ${price(b.high)} L ${price(b.low)} C ${price(b.close)}`} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setHover(`${b.future}:${b.date}`); } }}>
            <rect x={x(i) - step / 2} y="30" width={step} height="340" fill="transparent" />
            <line x1={x(i)} x2={x(i)} y1={y(b.high)} y2={y(b.low)} stroke={color} strokeDasharray={b.future ? "2 2" : undefined} />
            <rect x={x(i) - step * .28} y={y(Math.max(b.open, b.close))} width={step * .56} height={Math.max(2, Math.abs(y(b.open) - y(b.close)))} fill={b.future ? "#080e17" : color} stroke={color} strokeWidth={b.future ? 1.5 : 1} />
            {(i % Math.max(1, Math.ceil(bars.length / 11)) === 0 || i === bars.length - 1) ? <text x={x(i)} y="395" textAnchor="middle" fill="#94a3b8" fontSize="11">{b.date.slice(5)}</text> : null}
          </g>; })}
          <line x1={split} x2={split} y1="20" y2="375" stroke="#e2e8f0" strokeDasharray="4 4" />
          <text x={split - 8} y="17" textAnchor="end" fontSize="11" fill="#cbd5e1">{en ? "Actual" : "真实"}</text>
          {future.length ? <text x={split + 8} y="17" fontSize="11" fill="#fbbf24">{en ? "Forecast scenario →" : "未来预测情景 →"}</text> : null}
          {(projection?.windows ?? []).filter(w => w.evidence === "EXPLICIT").map(w => {
            const date = w.closed ? w.nextSessionDate : w.focusDate;
            const i = bars.findIndex(b => b.date === date);
            return i >= 0 ? <g key={w.id}><line x1={x(i)} x2={x(i)} y1="32" y2="370" stroke="#c4b5fd" strokeDasharray="2 7" /><text x={x(i)} y="417" textAnchor="middle" fill="#c4b5fd" fontSize="10">{w.focusDate.slice(5)}{w.closed ? en ? " closed" : "休市顺延" : en ? " watch" : "窗口"}</text></g> : null;
          })}
        </svg>
      </div>
    </div>
    <p className="text-xs text-slate-400">{en ? "Solid green/red = actual; hollow gold/blue = model up/down. Hover or tap a candle for date and OHLC." : "实心绿／红：真实涨／跌；空心金／蓝：测算涨／跌。鼠标移到或点击K线查看日期与开高低收。"}</p>
    <p className="text-xs text-slate-400">{en ? "Daily data through" : "日K已更新至"} {data.asOf} · {en ? "Checked (Beijing)" : "检查时间（北京）"} {checkAt} · {data.source} · {data.timeZone}</p>
    {data.archiveStatus === "UNAVAILABLE" ? <p className="text-xs text-amber-200">{en ? "Archiving failed. This live calculation is not a saved forward sample." : "版本存档暂未成功；当前测算不算已保存的前瞻样本。"}</p> : null}
    {projection ? <details className="text-xs text-slate-400"><summary className="cursor-pointer">{en ? "Daily prices, model assumptions & version" : "逐日价格、测算说明与版本"}</summary>
      <p className="mt-3">{en ? "This is a conditional scenario, not a statistically validated OHLC forecast. Prices are scaled from the last close using ATR14 and the published direction. Model open = previous model close; wick = 0.25 ATR. The optional envelope is ±1 ATR × √sessions, not a confidence interval. No overnight gaps are modeled." : "这是条件情景测算，尚不是经过统计验证的开高低收预测。以最近收盘价、ATR14波动和正式周期方向计算；假设次日开盘等于前一测算收盘，上下影各0.25 ATR。可选范围按±1 ATR×√交易日展开，不是概率置信区间，未模拟跳空。"}</p>
      <p className="mt-2">{projection.dateBasis === "MODEL_PHASE_ALLOCATION" ? en ? "Daily phase timing is model-allocated across the original period, not a newly locked turning-date call." : "此路径的逐日节奏按原周期分段分配，属于模型假设，不是新增锁定的转折日判断。" : en ? "The published dated watch window anchors the scenario; it is not a guaranteed turn." : "以原预测明确的观察窗口约束节奏，不代表保证在该日转折。"}</p>
      <p className="mt-2">ATR14 {price(projection.atr14)} · EMA60 {projection.ema60 ? price(projection.ema60) : "—"} · V{projection.sourceVersion} · {en ? "Calculated" : "测算生成于"} {projection.generatedAt} · {data.engine} · {data.archiveStatus === "STORED" ? en ? "Version archived" : "本版已存档" : en ? "Not archived" : "未存档"}</p>
      <p className="mt-2">{en ? "Hourly server checks; a new closed day creates a new version. Originals are retained. Current-session calculations are not pre-open predictions." : "服务器每小时检查；新增闭合日K后生成新版本，旧版保留。当日开盘后的测算不冒充盘前预测。"}</p>
      <div className="mt-3 max-h-64 overflow-auto"><table className="w-full text-right"><thead><tr>{[en ? "Date" : "日期", "O", "H", "L", "C"].map(s => <th key={s} className="p-2">{s}</th>)}</tr></thead><tbody>{future.map(b => <tr key={b.date} className="border-t border-slate-800"><td className="p-2 text-amber-200">{b.date}</td>{[b.open, b.high, b.low, b.close].map((n, i) => <td key={i} className="p-2">{price(n)}</td>)}</tr>)}</tbody></table></div>
    </details> : null}
  </div>;
}
