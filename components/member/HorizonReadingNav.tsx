import Link from "next/link";

// Reading instructions, not execution status or a new forecast.
export function HorizonReadingNav({ en = false, active }: { en?: boolean; active?: "MONTH" | "WEEK" | "DAY" }) {
  const rows = [
    { id: "MONTH", href: "/member/monthly", title: en ? "Monthly background" : "月度背景", text: en ? "Read the wider path and risk windows, not a one-month holding instruction." : "看大方向与风险窗口，不代表必须持仓一个月。" },
    { id: "WEEK", href: "/member/weekly", title: en ? "Weekly path" : "本周节奏", text: en ? "Read the sequence for this dated week. Entry still requires a separate trade plan." : "看本周先后节奏；入场仍需单独的交易计划。" },
    { id: "DAY", href: "/member/daily?research=1", title: en ? "Session outlook" : "当天走势", text: en ? "Read today's scenario. Stops, targets and holding limits come from the plan." : "看当天情景；止盈止损、持有时限以具体计划为准。" },
  ] as const;
  return <nav aria-label={en ? "Research timeframe" : "研究观察周期"} data-horizon-reading="1" className="my-5 grid gap-3 lg:grid-cols-3">
    {rows.map((row) => <Link key={row.id} prefetch={false} aria-current={row.id === active ? "page" : undefined} href={`${en ? "/en" : ""}${row.href}`} className={`rounded-xl border p-4 ${row.id === active ? "border-primary/40 bg-primary/5" : "border-white/10"}`}>
      <h2 className="text-base font-semibold text-primary">{row.title} →</h2>
      <p className="mt-2 text-sm leading-6 text-foreground-secondary">{row.text}</p>
    </Link>)}
  </nav>;
}
