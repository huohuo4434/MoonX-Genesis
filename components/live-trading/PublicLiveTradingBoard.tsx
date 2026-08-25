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
  closedAt?: string | null;
  closeReason?: string | null;
};

const horizonLabel: Record<string, string> = { SHORT: "超短线", MEDIUM: "中线", LONG: "长线" };
const statusLabel: Record<string, string> = {
  OPEN: "交易所持仓已确认",
  PARTIALLY_CLOSED: "已部分止盈",
  PENDING: "待交易所对账（不计当前持仓）",
  CLOSED: "已平仓",
  CLOSED_MANUAL: "交易所无对应仓位，已关闭记录",
  ERROR: "执行异常",
};

function RecordsTable({ rows, empty }: { rows: PublicPosition[]; empty: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-slate-400"><tr><th className="p-3">类型</th><th className="p-3">标的</th><th className="p-3">方向</th><th className="p-3">状态</th><th className="p-3">杠杆</th><th className="p-3">入场 / 保护</th><th className="p-3">体系依据</th></tr></thead>
        <tbody>
          {rows.map((position) => (
            <tr key={position.id} className="border-t border-white/10 align-top">
              <td className="p-3"><span className="rounded-full bg-violet-500/15 px-3 py-1 text-violet-200">{horizonLabel[position.horizon] ?? position.horizon}</span></td>
              <td className="p-3 font-medium">{position.symbol}</td>
              <td className="p-3">{position.side === "LONG" ? "做多" : "做空"}</td>
              <td className="p-3">{statusLabel[position.status] ?? position.status}</td>
              <td className="p-3">{position.leverage}x</td>
              <td className="p-3 text-slate-300">入场 {position.entryPrice}<br/>止损 {position.stopPrice ?? "待核对"}<br/>目标 {position.target1 ?? "—"} / {position.target2 ?? "—"}</td>
              <td className="p-3 text-slate-300">奇门：{position.qimenDirection ?? "未记录"}<br/>六爻：{position.liuyaoDirection ?? "未记录"}<br/>关系：{position.resonance ?? "待判断"}<br/>技术：{position.technicalEntry ?? "等待点位"}</td>
            </tr>
          ))}
          {!rows.length && <tr><td className="p-8 text-center text-slate-400" colSpan={7}>{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default function PublicLiveTradingBoard({ positions, pendingReconciliation, recentHistory }: {
  positions: PublicPosition[];
  pendingReconciliation: PublicPosition[];
  recentHistory: PublicPosition[];
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 text-white">
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl">
        <p className="text-xs tracking-[0.25em] text-violet-300">MOOX AI LIVE TRADING</p>
        <h1 className="mt-3 text-3xl font-semibold">AI实盘交易公示</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
          仅展示MOOX官方策略账户。短线、中线、长线分别记账；奇门与六爻负责方向，缠论与技术只负责入场、保护和退出位置。亏损与已结束记录不会删除。
        </p>

        <h2 className="mt-6 text-lg font-semibold">当前交易所已确认持仓</h2>
        <p className="mt-1 text-xs text-slate-400">只有 OPEN / PARTIALLY_CLOSED 才计入当前持仓；PENDING 不再冒充已开仓。</p>
        <div className="mt-3"><RecordsTable rows={positions} empty="当前没有已确认的官方实盘持仓。系统不会用模拟单或待对账记录填充这里。" /></div>

        {pendingReconciliation.length ? (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-amber-200">待交易所对账</h2>
            <p className="mt-1 text-xs text-amber-100/70">这些记录尚未被交易所持仓确认，不计作真实持仓；持续存在说明托管/对账链需要排查。</p>
            <div className="mt-3"><RecordsTable rows={pendingReconciliation} empty="无待对账记录。" /></div>
          </div>
        ) : null}

        {recentHistory.length ? (
          <details className="mt-8 rounded-2xl border border-white/10 p-4">
            <summary className="cursor-pointer font-semibold">最近结束与异常记录（{recentHistory.length}）</summary>
            <div className="mt-3"><RecordsTable rows={recentHistory} empty="暂无历史记录。" /></div>
          </details>
        ) : null}
      </div>
    </section>
  );
}
