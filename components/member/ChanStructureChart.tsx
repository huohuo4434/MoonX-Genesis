import type { ChanCandle, ChanDirection, ChanStructure, ChanTimeframe } from "@/types/chan-execution";
import { buildChanChartAnnotations } from "@/lib/trading-signals/chan-structure-core";

function compactPrice(value: number): string {
  return value >= 1_000 ? value.toLocaleString("en-US", { maximumFractionDigits: 0 }) : value.toFixed(2);
}

function timeLabel(timestamp: number, timeframe: ChanTimeframe): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    ...(timeframe === "1D" || timeframe === "1W" ? {} : { hour: "2-digit", minute: "2-digit", hour12: false }),
  }).format(new Date(timestamp));
}

export function ChanStructureChart({
  candles,
  structure,
  timeframe,
  authoritativeDirection,
}: {
  candles: ChanCandle[];
  structure: ChanStructure;
  timeframe: ChanTimeframe;
  authoritativeDirection: ChanDirection;
}) {
  const rows = candles;
  if (!rows.length) {
    return <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-500">该周期闭合行情不可用。为避免误导，图表、结构和未来路径均不绘制。</div>;
  }
  const width = 1040;
  const height = 430;
  const left = 24;
  const right = 76;
  const top = 24;
  const bottom = 48;
  const low = Math.min(...rows.map((row) => row.low));
  const high = Math.max(...rows.map((row) => row.high));
  const x = (index: number) => left + index * (width - left - right) / Math.max(1, rows.length - 1);
  const y = (price: number) => height - bottom - (price - low) * (height - top - bottom) / Math.max(1e-9, high - low);
  const structuralX = (index: number) => {
    const timestamp = structure.normalizedCandles[index]?.timestamp;
    if (timestamp == null) return x(Math.min(index, rows.length - 1));
    const rawIndex = rows.findIndex((row) => row.timestamp === timestamp);
    return x(rawIndex >= 0 ? rawIndex : Math.min(index, rows.length - 1));
  };
  const strokePoints = structure.strokes.flatMap((stroke, index) => index
    ? [[structuralX(stroke.endIndex), y(stroke.endPrice)]]
    : [[structuralX(stroke.startIndex), y(stroke.startPrice)], [structuralX(stroke.endIndex), y(stroke.endPrice)]])
    .map((point) => point.join(","))
    .join(" ");
  const latestStroke = structure.strokes.at(-1);
  const annotations = buildChanChartAnnotations(structure, authoritativeDirection);
  const marker = annotations.marker
    ? { ...annotations.marker, color: annotations.marker.side === "BUY" ? "#34d399" : "#fb7185" }
    : null;
  const risk = annotations.risk;
  const ticks = Array.from({ length: 5 }, (_, index) => low + (high - low) * index / 4);
  const timeIndices = [...new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1])];

  return <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-3">
    <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[900px]" role="img" aria-label={`${timeframe}真实闭合K线与缠论结构叠加`}>
      {ticks.map((price) => <g key={price}><line x1={left} x2={width - right} y1={y(price)} y2={y(price)} stroke="rgba(255,255,255,.07)" /><text x={width - right + 8} y={y(price) + 4} fill="#a1a1aa" fontSize="11">{compactPrice(price)}</text></g>)}
      {structure.zones.map((zone, index) => {
        const start = structure.strokes[zone.startStroke];
        const end = structure.strokes[zone.endStroke];
        if (!start || !end) return null;
        return <rect key={`${zone.startStroke}-${zone.endStroke}-${index}`} x={structuralX(start.startIndex)} y={y(zone.high)} width={Math.max(2, structuralX(end.endIndex) - structuralX(start.startIndex))} height={Math.max(1, y(zone.low) - y(zone.high))} fill="rgba(168,85,247,.16)" stroke="rgba(196,181,253,.62)" />;
      })}
      {rows.map((row, index) => {
        const up = row.close >= row.open;
        return <g key={row.timestamp}><line x1={x(index)} x2={x(index)} y1={y(row.high)} y2={y(row.low)} stroke={up ? "#34d399" : "#fb7185"} /><rect x={x(index) - 2} y={y(Math.max(row.open, row.close))} width="4" height={Math.max(1, y(Math.min(row.open, row.close)) - y(Math.max(row.open, row.close)))} fill={up ? "#34d399" : "#fb7185"} /></g>;
      })}
      {strokePoints ? <polyline points={strokePoints} fill="none" stroke="#fbbf24" strokeWidth="2" /> : null}
      {structure.segments.map((segment, index) => {
        const start = structure.strokes[segment.startStroke];
        const end = structure.strokes[segment.endStroke];
        if (!start || !end) return null;
        return <line key={`${segment.startStroke}-${segment.endStroke}-${index}`} x1={structuralX(start.startIndex)} y1={y(start.startPrice)} x2={structuralX(end.endIndex)} y2={y(end.endPrice)} stroke="#38bdf8" strokeWidth="3" strokeDasharray="7 4" />;
      })}
      {structure.fractals.map((fractal) => <circle key={`${fractal.index}-${fractal.kind}`} cx={structuralX(fractal.index)} cy={y(fractal.price)} r="4" fill={fractal.kind === "TOP" ? "#fb7185" : "#60a5fa"} />)}
      {marker && latestStroke ? <g><circle cx={structuralX(latestStroke.endIndex)} cy={y(latestStroke.endPrice)} r="7" fill={marker.color} /><text x={structuralX(latestStroke.endIndex) + 9} y={y(latestStroke.endPrice) - 8} fill={marker.color} fontSize="12" fontWeight="700">{marker.label}</text></g> : null}
      {structure.divergence && latestStroke ? <text x={structuralX(latestStroke.endIndex)} y={Math.max(top + 12, y(latestStroke.endPrice) - 24)} fill="#f0abfc" fontSize="12">价格推进背驰联合确认</text> : null}
      {risk ? <><line x1={left} x2={width - right} y1={y(risk.invalidation)} y2={y(risk.invalidation)} stroke="#fb7185" strokeDasharray="4 4" /><text x={left + 4} y={y(risk.invalidation) - 5} fill="#fb7185" fontSize="11">失效 {compactPrice(risk.invalidation)}</text><line x1={left} x2={width - right} y1={y(risk.breakevenTrigger)} y2={y(risk.breakevenTrigger)} stroke="#34d399" strokeDasharray="4 4" /><text x={left + 4} y={y(risk.breakevenTrigger) - 5} fill="#34d399" fontSize="11">确认 {compactPrice(risk.breakevenTrigger)}</text></> : null}
      {timeIndices.map((index) => <text key={index} x={x(index)} y={height - 14} textAnchor={index === 0 ? "start" : index === rows.length - 1 ? "end" : "middle"} fill="#a1a1aa" fontSize="11">{timeLabel(rows[index]!.timestamp, timeframe)}</text>)}
    </svg>
    <div className="flex min-w-[900px] flex-wrap gap-x-4 gap-y-1 px-2 pb-2 text-xs text-zinc-400"><span className="text-emerald-300">■ 上涨K</span><span className="text-rose-300">■ 下跌K</span><span className="text-amber-300">— 笔</span><span className="text-sky-300">-- 完成线段</span><span className="text-violet-300">▧ 中枢</span><span>● 分型/买卖点</span></div>
    <p className="px-2 pb-2 text-xs leading-5 text-zinc-500">蜡烛为交易所返回且已闭合的原始 K 线；黄色笔、蓝色线段与紫色中枢来自包含关系归一后的结构计算。图中不绘制未来蜡烛，不伪造 MACD 或成交量结论。</p>
  </div>;
}
