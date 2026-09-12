import Link from "next/link";
import { localizeHref, type Locale } from "@/lib/i18n/config";
import { pickStatus, REVIEW_INTERVAL_MS, type FreePicksCatalog } from "@/lib/free-picks/core";

export function FreePicks({ catalog, locale, now }: { catalog: FreePicksCatalog; locale: Locale; now: number }) {
  const en = locale === "en";
  const href = (path: string) => localizeHref(path, locale);
  const tr = (t: { zh: string; en: string }) => en ? t.en : t.zh;
  const stamp = (value: string | number) => new Intl.DateTimeFormat(en ? "en-GB" : "zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
  const next = Date.parse(catalog.lastCheckedAt) + REVIEW_INTERVAL_MS;
  const picks = catalog.picks.filter(p => Date.parse(p.publishedAt) <= now).sort((a,b) => Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
  const outcomes = en ? { TARGET: "Target reached", STOP: "Stop reached", PARTIAL: "Partial", NOT_TRIGGERED: "Not triggered", CANCELLED: "Cancelled" } : { TARGET: "到达目标", STOP: "触及止损", PARTIAL: "部分兑现", NOT_TRIGGERED: "未触发", CANCELLED: "取消" };
  return <main data-free-picks className="mx-auto max-w-4xl space-y-6 px-4 py-10 text-slate-100">
    <header><p className="text-sm font-semibold text-cyan-200">{en ? "MOOX · FREE PICKS" : "MOOX · 免费精选"}</p><h1 className="mt-3 text-3xl font-semibold">{en ? "One clear plan. Try it before subscribing." : "先看一条完整计划，再决定要不要订阅。"}</h1><p className="mt-4 text-sm leading-7 text-slate-300">{en ? "Reviewed every three days, with at most one new pick per round. Entry conditions, stop, targets and expiry are free to read. No suitable setup means no pick—not a promise of profit." : "每三天复核，合适时精选一条。参与条件、止损、目标和有效期免费查看；没有合适机会就不发，不承诺盈利。"}</p></header>
    <section className="rounded-2xl border border-cyan-300/25 bg-cyan-400/[0.04] p-5" aria-label={en ? "Release status" : "发布状态"}><p className="font-semibold">{en ? "Latest check" : "最近检查"} · {stamp(catalog.lastCheckedAt)} UTC+8</p><p className="mt-2 text-sm leading-6 text-slate-300">{tr(catalog.checkNote)}</p><p className="mt-2 text-xs text-slate-400">{now > next ? (en ? "Review due · waiting for a verified update; old plans are not extended." : "已到复核时间，等待核验更新；旧计划不会自动延期。") : `${en ? "Next review target" : "下次计划复核"} · ${stamp(next)} UTC+8`}</p></section>
    {picks.length === 0 ? <section className="rounded-2xl border border-white/10 p-6"><h2 className="text-xl font-semibold">{en ? "Waiting for the first qualifying setup" : "首期等待合格机会"}</h2><p className="mt-3 text-sm leading-6 text-slate-300">{en ? "No active free trade plan is available yet. In the meantime, learn to read a plan with the clearly labelled fictional walkthrough." : "目前没有可执行的免费精选。可以先用明确标注的教学样例，熟悉计划怎么读。"}</p><Link className="mt-4 inline-flex min-h-11 items-center text-cyan-200 underline" href={href("/guide#free-example")}>{en ? "Read the teaching example" : "先看教学样例"}</Link></section> : null}
    {picks.map(p => {
      const status = pickStatus(p, now);
      const review = catalog.reviews.find(r => r.pickId === p.id && Date.parse(r.reviewedAt) <= now);
      const price = (n: number) => new Intl.NumberFormat(en ? "en-US" : "zh-CN", { maximumFractionDigits: 8 }).format(n);
      return <article key={p.id} id={p.id} className="rounded-2xl border border-white/15 p-5 sm:p-6">
        <div className="flex flex-wrap justify-between gap-3"><p className="text-sm text-cyan-200">{p.symbol} · {p.venue} · {p.currency}</p><strong className="text-sm text-amber-200">{review ? outcomes[review.outcome] : status === "EXPIRED" ? (en ? "Expired · review pending" : "已到期 · 待复盘") : status === "SCHEDULED" ? (en ? "Not started" : "尚未开始") : (en ? "Observe conditions · not a live signal" : "观察条件 · 非实时信号")}</strong></div>
        <h2 className="mt-3 text-xl font-semibold">{tr(p.title)}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{tr(p.summary)}</p>
        <p className="mt-3 text-xs text-slate-400">{en ? "Published" : "发布"} {stamp(p.publishedAt)} · {tr(p.horizon)} · UTC+8</p>
        {status === "EXPIRED" || review ? <p className="mt-3 text-sm text-amber-200">{en ? "Archive only. Do not use these old levels as a new entry." : "以下仅为原计划存档，不可作为新的入场指令。"}</p> : null}
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">{[
          [en ? "Conditional entry" : "条件入场", `${p.side === "LONG" ? (en ? "Long" : "做多") : (en ? "Short" : "做空")} ${price(p.entry[0])}–${price(p.entry[1])}`],
          [en ? "Stop" : "止损", price(p.stop)], [en ? "Targets 1 / 2" : "目标一／二", p.targets.map(price).join(" / ")],
          [en ? "Window · UTC+8" : "有效期 · 北京时间", `${stamp(p.validFrom)} → ${stamp(p.validUntil)}`],
        ].map(([label, value]) => <div key={label} className="rounded-xl bg-white/[0.04] p-3"><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>
        <p className="mt-4 text-sm leading-6"><strong>{en ? "Only if: " : "满足才参与："}</strong>{tr(p.trigger)}</p><p className="mt-2 text-sm leading-6"><strong>{en ? "Cancel if: " : "失效就取消："}</strong>{tr(p.invalidation)}</p>
        <p className="mt-3 text-xs leading-5 text-slate-400">{en ? "No live price or fill monitoring. Check the named instrument and current conditions yourself. A support touch is not confirmation. Stops may slip." : "本页不监控实时价格或成交。请核对所列品种与当前条件，触及支撑不等于确认，止损也可能产生滑点。"}</p>
        {review ? <div className="mt-4 rounded-xl border border-white/10 p-4"><p className="font-semibold">{en ? "Review" : "复盘"} · {stamp(review.reviewedAt)} UTC+8</p><p className="mt-2 text-sm leading-6">{tr(review.note)}</p><a href={review.evidenceUrl} className="mt-3 inline-flex min-h-11 items-center text-cyan-200 underline" rel="noreferrer">{en ? "Review evidence" : "查看复盘依据"}</a></div> : null}
      </article>;
    })}
    <section className="rounded-2xl border border-violet-300/25 bg-violet-400/[0.04] p-6"><h2 className="text-xl font-semibold">{en ? "Useful? Start with a free account." : "觉得有帮助，先免费注册。"}</h2><p className="mt-3 text-sm leading-6 text-slate-300">{en ? "Free picks remain readable without payment. A free account also gives today's basic view after 08:00 Beijing time. Membership adds the multi-asset, multi-timeframe workspace and available detailed research." : "精选不要求付款。免费账户还可在北京时间08:00后看当日基础观点；需要多标的、长中短线工作台和完整研究时，再考虑会员。"}</p><div className="mt-5 flex flex-wrap gap-3"><Link href={href(`/register?next=${encodeURIComponent(href("/free-picks"))}`)} className="rounded-xl bg-violet-600 px-5 py-3 font-semibold">{en ? "Create a free account" : "免费注册"}</Link><Link href={href("/pricing#membership-plans")} className="rounded-xl border border-white/20 px-5 py-3">{en ? "Compare membership" : "比较会员权益"}</Link></div></section>
    <details className="rounded-xl border border-white/10 p-4 text-sm"><summary className="cursor-pointer font-semibold">{en ? "How picks are selected and reviewed" : "怎样筛选与复盘"}</summary><p className="mt-3 leading-7 text-slate-300">{en ? "Published, locked sources; matching instrument and timeframe; verified technical conditions; complete entry/stop/targets; at least 2:1 planned reward/risk to the first target at the least favorable entry after estimated costs. This filter is not a measured win rate. New picks must be published before their observation starts. Every published pick stays in the record, including stops, partial outcomes and untriggered plans. No return or win-rate claim is made without a complete verified sample." : "正式锁定来源、品种和周期一致、技术条件已核验、入场止损目标齐全；按最不利入场价并预留成本计算，第一目标的计划收益风险比至少2:1。这是筛选门槛，不代表胜率。观察开始前发布，触及止损、部分兑现、未触发都保留，没有完整核验样本不宣传收益率或命中率。"}</p></details>
    <p className="text-xs leading-6 text-slate-400">{en ? "Research only, not personalized investment advice. Technical and traditional cycle analysis can be wrong. No guaranteed returns or automatic execution." : "仅供研究参考，不是个性化投资建议。技术与传统周期分析都可能出错，不保证收益，也不会自动下单。"}</p>
  </main>;
}
