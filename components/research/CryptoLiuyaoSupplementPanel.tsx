// MOOX_V720104_CRYPTO_LIUYAO_PANEL
import {
  listBtcAuxiliaryWeeklyLiuyao20260820,
  listEthPhaseLiuyao20260820,
} from "@/lib/data/crypto-liuyao-supplement-20260820";

function tone(direction: string): string {
  if (/下跌|转弱|风险/.test(direction)) return "border-rose-300/15 bg-rose-300/[.035]";
  if (/上涨|偏强|修复/.test(direction)) return "border-emerald-300/15 bg-emerald-300/[.035]";
  return "border-border/[.08] bg-card/45";
}

export function CryptoLiuyaoSupplementPanel() {
  const btc = listBtcAuxiliaryWeeklyLiuyao20260820();
  const eth = listEthPhaseLiuyao20260820();
  return (
    <section className="mt-8 space-y-5 rounded-3xl border border-violet-300/10 bg-card/30 p-5 sm:p-6">
      <div>
        <p className="text-caption font-semibold uppercase tracking-[0.16em] text-violet-200/70">2026-08-20 LOCKED ADDITIONS</p>
        <h2 className="mt-2 text-2xl font-semibold text-foreground">BTC / ETH 六爻补充</h2>
        <p className="mt-2 max-w-4xl text-body-sm leading-6 text-foreground-secondary">
          这些是用户所起的周卦/阶段卦，按老师金融六爻法复核：先看妻财，再看子孙生财后劲、兄弟/官鬼/父母、世应与目标月份旺衰；卦名只作辅助。若同周期存在老师原卦，以老师原卦为准。六爻与奇门分别独立预测：同向提高信心，分歧时并列展示并降低信心。本区内容不单独触发实盘。
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground">BTC 九月四段</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {btc.map((item) => (
            <article key={item.id} className={`rounded-2xl border p-4 ${tone(item.direction)}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-foreground">{item.periodStart} → {item.periodEnd}</strong>
                <span className="rounded-full border border-border/[.12] px-2.5 py-1 text-caption text-foreground-secondary">{item.direction}</span>
              </div>
              <p className="mt-3 text-body-sm leading-6 text-foreground-secondary">{item.teacherMethodSummary}</p>
              <p className="mt-2 text-body-sm leading-6 text-foreground"><b>路径：</b>{item.expectedPath}</p>
              <p className="mt-2 text-caption leading-5 text-foreground-tertiary"><b>目标月令：</b>{item.targetMonthEvidence}</p>
              <p className="mt-2 text-caption leading-5 text-foreground-tertiary"><b>卦：</b>{item.primaryHexagram}{item.changingHexagram ? ` → ${item.changingHexagram}` : ""}；{item.structureEvidence}</p>
            </article>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground">ETH 阶段背景</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {eth.map((item) => (
            <article key={item.id} className={`rounded-2xl border p-4 ${tone(item.direction)}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-foreground">{item.periodStart} → {item.periodEnd}</strong>
                <span className="rounded-full border border-border/[.12] px-2.5 py-1 text-caption text-foreground-secondary">阶段卦</span>
              </div>
              <p className="mt-3 text-body-sm font-medium leading-6 text-foreground">{item.direction}</p>
              <p className="mt-2 text-body-sm leading-6 text-foreground-secondary">{item.teacherMethodEvidence}</p>
              <p className="mt-2 text-body-sm leading-6 text-foreground"><b>月度节奏：</b>{item.monthCadence}</p>
              <p className="mt-2 text-caption leading-5 text-foreground-tertiary">{item.riskNote}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
