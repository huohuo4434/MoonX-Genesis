import React from "react";

// Dated member clarification, not a replacement forecast or a scoring input.
export function SemiconductorTimingAnswer({ en }: { en: boolean }) {
  const points = en ? [
    ["Already holding", "Follow the stock's price structure, not the calendar alone. A failed breakout or a break below the latest confirmed higher low calls for reviewing risk; the date is not a reason to hold unconditionally."],
    ["Missed the first move", "Do not chase just to catch up. Assess a pullback that holds the breakout area, or a consolidation followed by a confirmed breakout. If the stop distance is too wide for the remaining upside, waiting is valid."],
    ["What comes next", "An earlier rally does not automatically mean an earlier top, nor guaranteed gains after Sep 7. SNDK, MU and NVDA have different paths; sector strength does not mean every stock rises together."],
  ] : [
    ["已经持有", "看个股走势，不只盯日期。冲高受阻、突破失败或跌破最近一次已确认的回踩低点时，重新评估风险；不能因为日期未到就无条件持有。"],
    ["还没买或卖早了", "不为追回踏空而追高。观察回踩突破区能否守住，或横盘消化后再次有效突破；如果止损距离太大、剩余空间不足，可以继续等。"],
    ["后面怎么看", "提前上涨不等于提前见顶，也不保证7日后继续大涨。闪迪、美光、英伟达各有自己的节奏，不能把板块偏强理解成所有个股一起涨。"],
  ];
  return <section id="semiconductor-timing-answer" data-member-note="SEMI-TIMING-20260907-V1" className="mb-6 scroll-mt-24 rounded-2xl border border-amber-300/25 bg-amber-300/[.045] p-5 sm:p-6">
    <p className="text-xs text-amber-100/70">{en ? "Member Q&A · September 7, 2026" : "会员答疑 · 2026年9月7日"}</p>
    <h2 className="mt-2 text-xl font-semibold text-white">{en ? "Semiconductors rallied before the window — what now?" : "半导体提前上涨了，还要等9月7日吗？"}</h2>
    <p className="mt-3 text-sm leading-7 text-white/85">{en
      ? "Members have reported that SNDK and other semiconductor names rose before our Sep 7 window. Our wording made that date sound too much like an exact starting point. An earlier confirmed move is a timing deviation, not a precise-date hit. Direction, timing and whether the setup was actionable must be assessed separately."
      : "针对会员反馈闪迪等在9月7日前已经上涨：此前把‘9月7日后转强’写得过于像精确启动日，容易让大家只等日期。已经提前确认的上涨，应承认时间判断偏晚，不能算作日期精准命中。方向是否正确、时间是否准确、是否能实际参与，要分开看。"}</p>
    <p className="mt-2 text-sm leading-7 text-amber-100">{en
      ? "Sep 5–7 are non-trading days for US cash equities; trading resumes Sep 8. Do not wait for a Sep 7 cash-equity session, and do not relabel an earlier rally as trading on that date."
      : "9月5—7日美股现货休市，9月8日恢复交易。不要等‘7日开盘再买’，也不能把此前的上涨算成7日当天的行情。"}</p>
    <div className="mt-4 grid gap-4 lg:grid-cols-3">{points.map(([title, body]) => <article key={title} className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-4"><h3 className="font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-white/70">{body}</p></article>)}</div>
    <details className="mt-4 text-xs leading-6 text-white/55"><summary className="cursor-pointer">{en ? "Record and calendar" : "记录与日历"}</summary><p>{en ? "This is a dated clarification prompted by member feedback, not a verified return calculation. Original forecasts remain available; no historical hit rate or confidence score is raised. No claim is made about the cause of the early move. Research only, not a guaranteed outcome." : "本条是针对会员反馈的当期答疑，不是涨幅核验报告。原预测保留，不上调历史命中率或信心值，也不把提前上涨的原因说成已证实的资金抢跑。仅供研究参考，不保证结果。"}</p><a className="underline" href="https://www.nasdaqtrader.com/Trader.aspx?id=calendar" target="_blank" rel="noreferrer">{en ? "Nasdaq trading calendar" : "纳斯达克交易日历"}</a></details>
  </section>;
}
