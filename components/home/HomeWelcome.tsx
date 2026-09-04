import Link from "next/link";
import { localizeHref, type Locale } from "@/lib/i18n/config";

/** Public product explanation; no forecast, price or performance claims are generated here. */
export function HomeWelcome({ locale, canViewDaily = false }: { locale: Locale; canViewDaily?: boolean }) {
  const en = locale === "en";
  const href = (path: string) => localizeHref(path, locale);
  const register = href(`/register?next=${encodeURIComponent(href("/member/daily"))}`);
  const steps = en ? [
    ["MONTH", "See the bigger picture", "Understand the market outlook and the dates worth watching."],
    ["WEEK", "Build your watchlist", "Compare the weekly path, opportunities and risks for your chosen markets."],
    ["DAY", "Check before acting", "Review support, resistance and confirmation conditions. Know when a view no longer holds."],
  ] : [
    ["月", "看大方向", "先看本月走势与关键日期，分清机会窗口和风险阶段。"],
    ["周", "定关注清单", "看本周可能先怎么走、后怎么走，集中跟踪自己关心的标的。"],
    ["日", "找位置、看风险", "核对支撑、压力和确认条件，知道何时等待、何时原判断不再成立。"],
  ];
  return <div data-public-welcome className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-14">
    <section className="rounded-3xl border border-violet-300/20 bg-gradient-to-br from-violet-950/50 to-slate-950 p-6 sm:p-10">
      <p className="text-xs tracking-[0.2em] text-violet-200">MOOX INTELLIGENCE</p>
      <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{en ? "Know the outlook. Plan your next move." : "看清行情，再决定下一步。"}</h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-white/75">{en ? "Market research that connects the monthly outlook, weekly opportunities and daily price levels—so you can evaluate a setup instead of chasing every move." : "把月度方向、每周机会和每日关键价位放在一起。少翻信息、多看条件，做决定前先分清机会与风险。"}</p>
      <p className="mt-3 text-sm text-white/60">{en ? "Daily core coverage: Bitcoin · Ether · Nasdaq 100 · Gold · Silver" : "每日核心覆盖：比特币 · 以太坊 · 纳斯达克100 · 黄金 · 白银"}</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href={canViewDaily ? href("/member/daily") : register} className="inline-flex min-h-12 items-center rounded-full bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-500">{canViewDaily ? (en ? "Open today's research" : "查看今日研究") : (en ? "Create a free account" : "免费注册，先看今日观点")}</Link>
        <Link href={href("/pricing")} className="inline-flex min-h-12 items-center rounded-full border border-white/25 px-6 py-3 text-white hover:bg-white/10">{en ? "Compare membership" : "看看会员多了什么"}</Link>
      </div>
      <p className="mt-3 text-xs leading-5 text-white/60">{en ? "Free registration. No payment required. Today's basic view is available after 08:00 Beijing time (00:00 UTC)." : "注册免费，无需付款。北京时间08:00后可查看当日基础观点。"}</p>
    </section>
    <section aria-label={en ? "How MOOX helps" : "MOOX如何帮你判断"} className="grid gap-4 md:grid-cols-3">
      {steps.map(([period, title, body]) => <article key={period} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><p className="text-xs font-semibold text-violet-200">{period}</p><h2 className="mt-2 text-xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-white/70">{body}</p></article>)}
    </section>
    <section className="grid gap-5 md:grid-cols-2" aria-label={en ? "Free and paid access" : "免费与会员权益"}>
      <article className="rounded-2xl border border-white/10 p-6"><h2 className="text-xl font-semibold">{en ? "Start free" : "先免费体验"}</h2><p className="mt-3 text-sm leading-6 text-white/70">{en ? "Read today's basic direction after the daily release time. Explore public summaries and forecast reviews before deciding whether to subscribe." : "每日开放后查看当日基础方向，浏览公开摘要与预测回顾。先了解内容是否适合自己，再决定订阅。"}</p><Link href={register} className="mt-5 inline-flex min-h-11 items-center text-violet-200 underline underline-offset-4">{en ? "Create your account →" : "创建免费账户 →"}</Link></article>
      <article className="rounded-2xl border border-violet-300/25 bg-violet-500/[0.06] p-6"><h2 className="text-xl font-semibold">{en ? "Plan ahead with membership" : "会员：提前做计划"}</h2><p className="mt-3 text-sm leading-6 text-white/70">{en ? "Unlock next-session, weekly and monthly research, key dates, support and resistance, and conditions that would invalidate a setup. Research access—not a promise of profit or automatic trading." : "解锁下一交易日、周度与月度研究，以及关键日、支撑压力和失效条件。购买的是研究内容，不是盈利承诺或自动代客交易。"}</p><Link href={href("/pricing")} className="mt-5 inline-flex min-h-11 items-center text-violet-200 underline underline-offset-4">{en ? "See plans, prices and payment options →" : "查看方案、价格与付款方式 →"}</Link></article>
    </section>
    <section className="rounded-2xl border border-white/10 p-6">
      <h2 className="text-xl font-semibold">{en ? "Check the record before you subscribe" : "订阅前，先看预测回顾"}</h2>
      <p className="mt-3 text-sm leading-6 text-white/70">{en ? "Compare forecasts with subsequent market moves. Check the period, sample size and misses—not just successful examples. Agreement between methods is not a measured probability of success." : "把预测与后续走势对照，连同周期、样本量和未命中一起看。方法一致程度，不等于实际胜率。"}</p>
      <div className="mt-4 flex flex-wrap gap-6"><Link href={href("/verification")} className="inline-flex min-h-11 items-center text-violet-200 underline underline-offset-4">{en ? "Review forecast results" : "查看预测验证"}</Link><Link href={href("/guide")} className="inline-flex min-h-11 items-center text-white/80 underline underline-offset-4">{en ? "A one-minute guide" : "一分钟使用指南"}</Link></div>
    </section>
    <p className="text-xs leading-6 text-white/60">{en ? "MOOX includes traditional divination-based research alongside technical analysis. Its predictive value is not established. Forecasts can be wrong; trading can lose money. Research is not personalized investment advice or a guarantee of returns." : "MOOX包含传统术数研究与技术分析，预测有效性并未得到确证。预测可能出错，交易可能亏损；内容不构成个性化投资建议或收益保证。"}</p>
  </div>;
}
