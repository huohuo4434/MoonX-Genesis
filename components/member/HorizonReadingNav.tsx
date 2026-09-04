import Link from "next/link";

// Reading instructions, not execution status or a new forecast.
export function HorizonReadingNav({ en = false, active }: { en?: boolean; active?: "MONTH" | "WEEK" | "DAY" }) {
  const rows = [
    { id: "MONTH", href: "/member/monthly", title: en ? "This month · longer-term" : "一个月内 · 长线", text: en ? "Check annual high/low windows and the monthly path. A 1–4 week trade still needs weekly alignment and a confirmed entry." : "先对年度高低位窗口，再看月内先后节奏。1—4周长线只在窗口内评估，还要周方向同向、入场确认。" },
    { id: "WEEK", href: "/member/weekly", title: en ? "This week · swing" : "一周内 · 中线", text: en ? "Use this week's direction and timing. Plan 2–3 days; new trades expire within 72 hours or earlier when the forecast ends." : "按本周方向和关键日找2—3天波段。新仓最多72小时；预测先到期，就先结束，不拖到下一周。" },
    { id: "DAY", href: "/member/daily", title: en ? "Today · intraday" : "一天内 · 短线", text: en ? "Check today's session and entry/exit levels. Evaluate daily; trade only confirmed setups, typically 30–90 minutes." : "看当天交易时段、入场和退出条件。每天评估，确认后才做，通常30—90分钟；没有信号就等待。" },
  ] as const;
  return <nav aria-label={en ? "Plan by holding horizon" : "按持有周期阅读"} data-horizon-reading="1" className="my-5 grid gap-3 lg:grid-cols-3">
    {rows.map((row) => <Link key={row.id} aria-current={row.id === active ? "page" : undefined} href={`${en ? "/en" : ""}${row.href}`} className={`rounded-xl border p-4 ${row.id === active ? "border-primary/40 bg-primary/5" : "border-white/10"}`}>
      <h2 className="text-base font-semibold text-primary">{row.title} →</h2>
      <p className="mt-2 text-sm leading-6 text-foreground-secondary">{row.text}</p>
    </Link>)}
  </nav>;
}
