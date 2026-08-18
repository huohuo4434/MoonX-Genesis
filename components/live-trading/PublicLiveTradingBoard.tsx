type PublicPosition = {
  id: string;
  symbol: string;
  horizon: string;
  side: string;
  status: string;
  leverage: number;
  entryPrice: number;
  stopPrice?: number | null;
  target1?: number | null;
  target2?: number | null;
  qimenDirection?: string | null;
  liuyaoDirection?: string | null;
  resonance?: string | null;
  technicalEntry?: string | null;
  openedAt: string;
};

const horizonLabel: Record<string, string> = { SHORT: "短线", MEDIUM: "中线", LONG: "长线" };

export default function PublicLiveTradingBoard({ positions }: { positions: PublicPosition[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 text-white">
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl">
        <p className="text-xs tracking-[0.25em] text-violet-300">MOOX AI LIVE TRADING</p>
        <h1 className="mt-3 text-3xl font-semibold">AI实盘交易公示</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
          仅展示MOOX官方策略账户。短线、中线、长线分别记账；奇门与六爻负责方向，缠论与技术只负责入场、保护和退出位置。亏损与已结束记录不会删除。
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400"><tr><th className="p-3">类型</th><th className="p-3">标的</th><th className="p-3">方向</th><th className="p-3">状态</th><th className="p-3">杠杆</th><th className="p-3">入场 / 保护</th><th className="p-3">体系依据</th></tr></thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.id} className="border-t border-white/10 align-top">
                  <td className="p-3"><span className="rounded-full bg-violet-500/15 px-3 py-1 text-violet-200">{horizonLabel[position.horizon] ?? position.horizon}</span></td>
                  <td className="p-3 font-medium">{position.symbol}</td>
                  <td className="p-3">{position.side === "LONG" ? "做多" : "做空"}</td>
                  <td className="p-3">{position.status}</td>
                  <td className="p-3">{position.leverage}x</td>
                  <td className="p-3 text-slate-300">入场 {position.entryPrice}<br/>止损 {position.stopPrice ?? "待核对"}<br/>目标 {position.target1 ?? "—"} / {position.target2 ?? "—"}</td>
                  <td className="p-3 text-slate-300">奇门：{position.qimenDirection ?? "未记录"}<br/>六爻：{position.liuyaoDirection ?? "未记录"}<br/>关系：{position.resonance ?? "待判断"}<br/>技术：{position.technicalEntry ?? "等待点位"}</td>
                </tr>
              ))}
              {!positions.length && <tr><td className="p-8 text-center text-slate-400" colSpan={7}>当前没有可公示的官方实盘持仓。系统不会用模拟单填充这里。</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
