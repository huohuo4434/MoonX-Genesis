import Link from "next/link";
import { localizeHref, type Locale } from "@/lib/i18n/config";

/** Fixed teaching prices, never a live forecast or a backtested result. No market-data dependency. */
export function FreeResearchExample({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const href = (path: string) => localizeHref(path, locale);
  const rows = en ? [
    ["Timeframe", "A hypothetical 2–3 day bounce within a weak monthly market. This is not a long-term bullish call."],
    ["Location", "Assume BTC is $80,000. Support: $78,000–79,000. Resistance: $82,000, then $84,000."],
    ["Confirmation", "A touch of support is not enough. In this example, wait for a completed 4-hour candle to reclaim $79,000 and a subsequent retest to hold."],
    ["Risk / invalidation", "A completed 4-hour close below $78,000 invalidates this example. An open position still needs its own protective exit; waiting for a candle close does not cap losses."],
  ] : [
    ["做什么周期", "假设月度仍偏弱，只观察未来2—3天的反弹，不当成长线看涨。"],
    ["看什么位置", "假设BTC现价80,000美元。支撑78,000—79,000；第一压力82,000，下一压力84,000。"],
    ["何时才考虑", "碰到支撑不等于企稳。本例等待4小时K线收回79,000上方，后续回踩守住，再评估是否有合适机会。"],
    ["什么情况失效", "本例以4小时收盘跌破78,000为判断失效；已有仓位仍需独立保护退出，不能靠等待收盘来限制亏损。"],
  ];
  const branches = en ? [
    ["If support holds", "Reassess the setup after confirmation. Check the distance to resistance, potential loss and costs; a bullish scenario does not require a trade."],
    ["If price runs straight to $82,000", "Do not assume the first resistance has disappeared. Wait for a confirmed breakout and retest before treating $84,000 as the next reference."],
    ["If $78,000 fails", "End the original bounce scenario. Record the failure; do not move the boundary just to keep a bullish story alive."],
  ] : [
    ["回踩支撑后企稳", "确认后再比较上方空间、潜在亏损和费用。条件不合适就等待，不因为看涨而必须做单。"],
    ["直接冲到82,000", "先按第一压力观察，不盲目追涨。突破并回踩确认后，才把84,000作为下一处参考。"],
    ["跌破78,000并失效", "结束原反弹观察，记录判断失败。不能为了维持看涨结论，不断往下移动失效线。"],
  ];
  return <section id="free-example" className="scroll-mt-24 rounded-2xl border border-primary/25 bg-primary/[0.035] p-5 sm:p-7" aria-labelledby="free-example-title">
    <p className="text-sm font-semibold text-primary">{en ? "Free walkthrough · No account needed" : "免费阅读样例 · 无需注册"}</p>
    <h2 id="free-example-title" className="mt-2 text-2xl font-semibold">{en ? "BTC: bullish bounce, but buy now?" : "BTC看反弹，现在就能买？"}</h2>
    <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-sm leading-6">{en ? "FICTIONAL TEACHING EXAMPLE. All prices and scenarios below are invented to explain how to read a plan. They are not current quotes, published forecasts, trade signals or historical results." : "虚构价格教学：下面所有价格和情景仅用于演示读法，不是当前报价、正式预测、交易信号或历史成绩。"}</p>
    <dl className="mt-5 grid gap-4 md:grid-cols-2">{rows.map(([title, body]) => <div key={title} className="rounded-xl border border-border/10 bg-surface/50 p-4"><dt className="font-semibold">{title}</dt><dd className="mt-2 text-sm leading-6 text-foreground-secondary">{body}</dd></div>)}</dl>
    <h3 className="mt-6 font-semibold">{en ? "Follow the price, not just the label" : "遇到不同走势，分别怎么办"}</h3>
    <div className="mt-3 space-y-2">{branches.map(([title, body]) => <details key={title} className="rounded-xl border border-border/10 p-4"><summary className="cursor-pointer font-medium">{title}</summary><p className="mt-3 text-sm leading-6 text-foreground-secondary">{body}</p></details>)}</div>
    <p className="mt-5 text-sm leading-6 text-foreground-secondary">{en ? "Review rule: keep the original plan and publication time; compare it with completed candles over the stated 2–3 days. Mark unmet entry conditions as no entry, not a profitable trade. Keep failures as well as successes. This walkthrough itself has no performance score." : "复盘读法：保留原计划和发布时间，对照约定2—3天内的闭合K线。条件没触发就记“未入场”，不是“赚到了”；失败也保留。本教学样例不计命中率。"}</p>
    <div className="mt-5 flex flex-wrap gap-3"><Link className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href={href("/member/daily")}>{en ? "See today's actual view" : "去看今日真实观点"}</Link><Link className="inline-flex min-h-11 items-center px-2 text-sm underline underline-offset-4" href={href("/verification")}>{en ? "Check actual forecast results" : "查看真实预测回顾"}</Link></div>
  </section>;
}
