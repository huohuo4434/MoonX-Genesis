import type { ChanStructure } from "@/types/chan-execution";

export function ChanStructureChart({ structure }: { structure: ChanStructure }) {
  const rows = structure.normalizedCandles;
  if (!rows.length) return <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-500">闭合行情不可用，不绘制结构或未来路径。</div>;
  const width = 900, height = 360, pad = 24;
  const low = Math.min(...rows.map((r) => r.low)), high = Math.max(...rows.map((r) => r.high));
  const x = (i: number) => pad + i * (width - pad * 2) / Math.max(1, rows.length - 1);
  const y = (p: number) => height - pad - (p - low) * (height - pad * 2) / Math.max(1e-9, high - low);
  const strokePoints = structure.strokes.flatMap((s, i) => i ? [[x(s.endIndex), y(s.endPrice)]] : [[x(s.startIndex), y(s.startPrice)], [x(s.endIndex), y(s.endPrice)]]).map((p) => p.join(",")).join(" ");
  return <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-3"><svg viewBox={`0 0 ${width} ${height}`} className="min-w-[720px]" role="img" aria-label="真实K线与缠论结构叠加">
    {structure.zones.map((z, i) => <rect key={i} x={x(structure.strokes[z.startStroke]!.startIndex)} y={y(z.high)} width={Math.max(2, x(structure.strokes[z.endStroke]!.endIndex) - x(structure.strokes[z.startStroke]!.startIndex))} height={Math.max(1, y(z.low) - y(z.high))} fill="rgba(168,85,247,.16)" stroke="rgba(196,181,253,.55)" />)}
    {rows.map((r, i) => { const up = r.close >= r.open; return <g key={r.timestamp}><line x1={x(i)} x2={x(i)} y1={y(r.high)} y2={y(r.low)} stroke={up ? "#34d399" : "#fb7185"} /><rect x={x(i)-2} y={y(Math.max(r.open,r.close))} width="4" height={Math.max(1,y(Math.min(r.open,r.close))-y(Math.max(r.open,r.close)))} fill={up ? "#34d399" : "#fb7185"} /></g>; })}
    {strokePoints ? <polyline points={strokePoints} fill="none" stroke="#fbbf24" strokeWidth="2" /> : null}
    {structure.fractals.map((f) => <circle key={`${f.index}-${f.kind}`} cx={x(f.index)} cy={y(f.price)} r="4" fill={f.kind === "TOP" ? "#fb7185" : "#60a5fa"} />)}
  </svg><p className="px-2 pb-2 text-xs text-zinc-500">蜡烛来自已闭合交易所行情，经包含关系处理后作为结构合成 K 展示；不冒充逐根原始 K，也不会绘制未来蜡烛。</p></div>;
}
