"use client";

import { forecastGeometry, type ForecastPath } from "@/lib/presentation/forecast-path";

const names = {
  上涨: ["向上延续", "Upward continuation"], 下跌: ["向下延续", "Downward continuation"],
  震荡: ["区间反复", "Range-bound swings"], 震荡上涨: ["回踩后逐步抬高", "Choppy advance"],
  震荡下跌: ["反弹后重心下移", "Choppy decline"],
  先涨后跌: ["先冲高，再防回落", "Rise first, then watch for a pullback"],
  先跌后涨: ["先消化压力，再看回升", "Weakness first, then a recovery"],
};
const marks = { strength: ["转强窗口", "Strength window"], risk: ["转弱风险窗口", "Pullback-risk window"], low: ["候选低点", "Potential low"], high: ["候选高点", "Potential high"], watch: ["节奏观察", "Timing watch"] };

export function ForecastPathPanel({ paths, assetId, asOfDate, en }: { paths: ForecastPath[]; assetId: string; asOfDate: string; en: boolean }) {
  const selected = paths.filter(path => path.assetId === assetId && path.periodEnd >= asOfDate);
  return <div className="mt-5 space-y-4" data-forecast-path="v1">
    <div><h3 className="text-lg font-semibold text-cyan-100">{en ? "Future outlook — monthly first" : "未来走势推演 · 先看月，再看周"}</h3>
      <p className="mt-1 text-xs text-slate-400">{en ? "Dashed lines show the published scenario, not future candles. Heights are illustrative, not price targets or return estimates." : "虚线画已发布的预期走势，不是假造未来K线。高低仅示意节奏，不对应目标价或涨跌幅。"}</p></div>
    {(["MONTH", "WEEK"] as const).map(level => {
      const rows = selected.filter(path => path.level === level);
      return <div key={level} className={`rounded-2xl border p-4 ${level === "MONTH" ? "border-cyan-300/30 bg-cyan-300/5" : "border-violet-300/20 bg-violet-300/5"}`}>
        <h4 className="font-semibold">{level === "MONTH" ? en ? "Monthly main scenario" : "月度主路径" : en ? "Weekly scenario" : "周度细化路径"}</h4>
        {!rows.length ? <p className="mt-3 text-sm text-amber-200">{en ? "No matching published forecast for this horizon. No path is invented." : "该周期暂无匹配的正式预测，暂不画线。"}</p> : null}
        {rows.map(path => {
          const geometry = forecastGeometry(path, asOfDate);
          const sx = (x: number) => 52 + x * 636;
          const sy = (v: number) => 120 - v * 55;
          const color = level === "MONTH" ? "#67e8f9" : "#c4b5fd";
          const anchor = geometry.anchor;
          const date = anchor ? (anchor.closed ? anchor.nextSessionDate! : anchor.focusDate) : null;
          const anchorX = date ? Math.max(0, Math.min(1, (Date.parse(date) - Date.parse(geometry.start)) / (Date.parse(geometry.end) - Date.parse(geometry.start)))) : null;
          return <div key={path.id} className="mt-3">
            <p className="text-base font-semibold" style={{ color }}>{names[path.direction][en ? 1 : 0]}</p>
            <p className="mt-1 text-xs text-slate-400">{path.periodStart} — {path.periodEnd} · {en ? "Published scenario" : "正式周期方向"}: {en ? names[path.direction][1] : path.direction}</p>
            <svg viewBox="0 0 740 230" className="mt-2 w-full" role="img" aria-label={`${level} ${names[path.direction][en ? 1 : 0]} ${geometry.mode === "DATED" ? geometry.start + '–' + geometry.end : en ? 'phase sequence, no dated turn' : '阶段顺序，不指定转折日期'}`}>
              <title>{en ? "Qualitative future scenario, no price scale" : "未来路径示意，无价格刻度"}</title>
              <rect x="36" y="40" width="668" height="145" rx="12" fill={color} opacity=".04" />
              <line x1="52" x2="688" y1="120" y2="120" stroke="#475569" strokeDasharray="2 6" />
              <text x="52" y="25" fill="#94a3b8" fontSize="12">{geometry.mode === "DATED" ? en ? "Dated scenario · watch for confirmation" : "按明确窗口推演 · 等走势确认" : en ? "Phase order only · turning date not established" : "仅示意阶段顺序 · 不指定转折日期"}</text>
              {anchorX !== null ? <line x1={sx(anchorX)} x2={sx(anchorX)} y1="43" y2="185" stroke="#fbbf24" strokeDasharray="3 5" /> : null}
              <polyline points={geometry.points.map(p => `${sx(p.x)},${sy(p.value)}`).join(" ")} fill="none" stroke={color} strokeWidth="4" strokeDasharray="9 6" strokeLinejoin="round" />
              {geometry.points.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.value)} r="4" fill={color} />)}
              <text x="52" y="209" fill="#cbd5e1" fontSize="12">{geometry.mode === "DATED" ? geometry.start.slice(5) : en ? "Earlier phase" : "前段"}</text>
              <text x="688" y="209" textAnchor="end" fill="#cbd5e1" fontSize="12">{geometry.mode === "DATED" ? geometry.end.slice(5) : en ? "Later phase" : "后段"}</text>
              {geometry.mode === "SEQUENCE" ? <text x="370" y="209" textAnchor="middle" fill="#94a3b8" fontSize="12">{en ? "Not a calendar axis" : "横轴不是具体日期"}</text> : null}
            </svg>
            {anchor ? <p className="text-sm text-amber-200">{anchor.focusDate} · {marks[anchor.kind][en ? 1 : 0]}{anchor.closed ? en ? ` · Market closed; observe from ${anchor.nextSessionDate}` : ` · 休市，${anchor.nextSessionDate}复市后观察` : ""}</p> : null}
            <p className="mt-2 text-xs text-slate-400">{geometry.mode === "DATED" ? en ? "Connecting segments are a scenario, not a new dated forecast or guaranteed reversal." : "连接线是路径示意，不代表新增逐日预测或保证在此反转。" : en ? "This is the full period's stage sequence. No exact location within that sequence is inferred for today." : "这是整个周期的阶段顺序，不据此断定今天已经走到哪一段。"}</p>
            <details className="mt-2 text-xs text-slate-400"><summary className="cursor-pointer">{en ? "Forecast version" : "查看预测版本"}</summary><p className="mt-2">V{path.version} · {en ? "Locked" : "锁定于"} {path.lockedAt}</p><p className="mt-1">{en ? "Existing publications are unchanged; this chart is a new visualization, not a historical forecast chart." : "原发布记录不变；本图为新增可视化，不作为此前已发布图表的证明。"}</p></details>
          </div>;
        })}
      </div>;
    })}
    <p className="text-sm text-slate-300">{en ? "Execution check: a rise needs a sustained breakout; a recovery needs support to hold. If support fails or a breakout is rejected, treat the path as unconfirmed and reassess risk—not as an automatic trade." : "执行确认：上涨要看突破站稳，回升要看支撑守住。若失守支撑或突破失败，先按路径未确认处理、重新评估风险，不照线下单。"}</p>
  </div>;
}
