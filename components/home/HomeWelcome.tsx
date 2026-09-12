import Link from "next/link";
import { localizeHref, type Locale } from "@/lib/i18n/config";

/** Public product explanation; no forecast, price or performance claims are generated here. */
export function HomeWelcome({ locale, canViewDaily = false }: { locale: Locale; canViewDaily?: boolean }) {
  const en = locale === "en";
  const href = (path: string) => localizeHref(path, locale);
  const register = href(`/register?next=${encodeURIComponent(href("/member/daily"))}`);
  const steps = en ? [
    ["POSITION", "Is this a longer-term opportunity?", "Read the broader outlook and risk windows before committing to a longer holding period."],
    ["SWING", "Where is the next setup?", "Compare entry conditions, targets and invalidation for a multi-day move."],
    ["INTRADAY", "Act now, or wait?", "Check price confirmation and the plan's expiry. No valid setup means waiting."],
  ] : [
    ["长线", "值不值得拿久一点？", "先看大方向与风险窗口，不把几天的反弹当成长线机会。"],
    ["中线", "下一段行情怎么参与？", "看入场条件、分段目标和失效位，提前安排几天内的应对。"],
    ["短线", "现在能做，还是等？", "看价格确认和计划有效期。条件没到就等待，不强行找单。"],
  ];
  return <div data-public-welcome className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-14">
    <section className="grid gap-8 rounded-3xl border border-violet-300/20 bg-gradient-to-br from-violet-950/50 to-slate-950 p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
      <div>
      <p className="text-xs tracking-[0.2em] text-violet-200">MOOX INTELLIGENCE</p>
      <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{en ? "Less noise. A clearer trading plan." : "少翻消息，\n看懂下一步怎么做。"}</h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-white/75">{en ? "Choose a market. See the timeframe, entry conditions, stop and targets together—with candlestick charts and multiple support and resistance levels." : "选一个标的，把长中短线、入场条件、止盈止损放在一起。配合K线和多级支撑压力，少靠感觉做决定。"}</p>
      <p className="mt-3 text-sm text-white/60">{en ? "Daily core coverage: Bitcoin · Ether · Nasdaq 100 · Gold · Silver" : "每日核心覆盖：比特币 · 以太坊 · 纳斯达克100 · 黄金 · 白银"}</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href={canViewDaily ? href("/member/daily") : register} className="inline-flex min-h-12 items-center rounded-full bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-500">{canViewDaily ? (en ? "Open today's research" : "查看今日研究") : (en ? "Create a free account" : "免费注册，先看今日观点")}</Link>
        <Link href={href("/guide#free-example")} className="inline-flex min-h-12 items-center rounded-full border border-white/25 px-6 py-3 text-white hover:bg-white/10">{en ? "Try a free walkthrough" : "先看免费样例"}</Link>
      </div>
      <p className="mt-3 text-xs leading-5 text-white/60">{en ? "Free registration. No payment required. Today's basic view is available after 08:00 Beijing time (00:00 UTC)." : "注册免费，无需付款。北京时间08:00后可查看当日基础观点。"}</p>
      <Link href={href("/pricing#membership-plans")} className="mt-3 inline-flex min-h-11 items-center text-sm text-violet-200 underline underline-offset-4">{en ? "Already know what you need? View membership →" : "想看完整计划？查看会员价格 →"}</Link>
      </div>
      <div data-plan-preview className="min-w-0 rounded-2xl border border-white/15 bg-[#0b1020] p-4 shadow-2xl sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{en ? "Your plan, at a glance" : "一张卡，看清一笔计划"}</h2><span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-200">{en ? "Layout preview · not live data" : "布局示意 · 非实时数据"}</span></div>
        <svg viewBox="0 0 400 190" role="img" aria-label={en ? "Illustrative candles with two resistance levels, a support zone and an invalidation line. Not a forecast." : "示意K线：两档压力、支撑区和失效线。不是行情预测。"} className="mt-4 w-full">
          <rect x="12" y="112" width="300" height="26" fill="#22d3ee" fillOpacity="0.09" />
          {[[35,"#a78bfa",en ? "R2" : "压力2"],[68,"#a78bfa",en ? "R1" : "压力1"],[125,"#22d3ee",en ? "Support" : "支撑区"],[162,"#fb7185",en ? "Invalidation" : "失效线"]].map(([y,color,label]) => <g key={y}><line x1="12" x2="300" y1={y} y2={y} stroke={String(color)} strokeDasharray="4 5" opacity="0.65" /><text x="310" y={Number(y)+4} fill={String(color)} fontSize="12">{label}</text></g>)}
          {([[32,72,103,61,116],[60,99,88,77,109],[88,91,120,82,137],[116,121,108,95,139],[144,110,96,86,121],[172,95,83,71,109],[200,82,93,73,104],[228,94,71,61,105],[256,71,57,46,87]] as const).map(([x,open,close,high,low]) => <g key={x} stroke={close < open ? "#34d399" : "#fb7185"}><line x1={x} x2={x} y1={high} y2={low}/><rect x={x-6} y={Math.min(open,close)} width="12" height={Math.abs(open-close)} fill={close < open ? "#34d399" : "#fb7185"}/></g>)}
        </svg>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {(en ? [["Entry", "After confirmation"],["Stop", "Defined before entry"],["Targets", "First → next resistance"],["Timing", "Timeframe + expiry"]] : [["什么位置参与", "满足确认条件后"],["错了在哪里退出", "入场前明确止损"],["涨到哪里应对", "第一目标 → 下一目标"],["准备拿多久", "周期 + 有效期"]]).map(([label,value]) => <div key={label} className="rounded-xl bg-white/[0.04] p-3"><dt className="text-xs text-white/55">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}
        </dl>
        <p className="mt-3 text-xs leading-5 text-white/55">{en ? "Actual plans show prices only when complete and current. Otherwise: wait. This illustration is not a trade signal." : "实际计划完整且有效时才展示点位，否则显示等待。此图仅示意布局，不是买卖信号。"}</p>
      </div>
    </section>
    <section aria-label={en ? "How MOOX helps" : "MOOX如何帮你判断"} className="grid gap-4 md:grid-cols-3">
      {steps.map(([period, title, body]) => <article key={period} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><p className="text-xs font-semibold text-violet-200">{period}</p><h2 className="mt-2 text-xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-white/70">{body}</p></article>)}
    </section>
    <section className="grid gap-5 md:grid-cols-2" aria-label={en ? "Free and paid access" : "免费与会员权益"}>
      <article className="rounded-2xl border border-white/10 p-6"><h2 className="text-xl font-semibold">{en ? "Start free" : "先免费体验"}</h2><p className="mt-3 text-sm leading-6 text-white/70">{en ? "Read today's basic direction after the daily release time. Explore public summaries and forecast reviews before deciding whether to subscribe." : "每日开放后查看当日基础方向，浏览公开摘要与预测回顾。先了解内容是否适合自己，再决定订阅。"}</p><Link href={register} className="mt-5 inline-flex min-h-11 items-center text-violet-200 underline underline-offset-4">{en ? "Create your account →" : "创建免费账户 →"}</Link></article>
      <article className="rounded-2xl border border-violet-300/25 bg-violet-500/[0.06] p-6"><h2 className="text-xl font-semibold">{en ? "Membership: the complete workspace" : "会员：从看方向，到看完整计划"}</h2><p className="mt-3 text-sm leading-6 text-white/70">{en ? "Use the multi-timeframe desk, candlestick charts and detailed plans when available. Read next-session, weekly and monthly research, member notes and videos in one place. Research access—not a promise of profit or automatic trading." : "在操作台查看长中短线、K线图和可用的完整计划；提前阅读下一交易日、周月研究，再结合会员随笔与视频。购买的是研究内容，不是盈利承诺或自动代客交易。"}</p><Link href={href("/pricing")} className="mt-5 inline-flex min-h-11 items-center text-violet-200 underline underline-offset-4">{en ? "See plans, prices and payment options →" : "查看方案、价格与付款方式 →"}</Link></article>
    </section>
    <section className="rounded-2xl border border-white/10 p-6">
      <h2 className="text-xl font-semibold">{en ? "Check the record before you subscribe" : "订阅前，先看预测回顾"}</h2>
      <p className="mt-3 text-sm leading-6 text-white/70">{en ? "Compare forecasts with subsequent market moves. Check the period, sample size and misses—not just successful examples. Agreement between methods is not a measured probability of success." : "把预测与后续走势对照，连同周期、样本量和未命中一起看。方法一致程度，不等于实际胜率。"}</p>
      <div className="mt-4 flex flex-wrap gap-6"><Link href={href("/verification")} className="inline-flex min-h-11 items-center text-violet-200 underline underline-offset-4">{en ? "Review forecast results" : "查看预测验证"}</Link><Link href={href("/guide")} className="inline-flex min-h-11 items-center text-white/80 underline underline-offset-4">{en ? "A one-minute guide" : "一分钟使用指南"}</Link></div>
    </section>
    <p className="text-xs leading-6 text-white/60">{en ? "MOOX includes traditional divination-based research alongside technical analysis. Its predictive value is not established. Forecasts can be wrong; trading can lose money. Research is not personalized investment advice or a guarantee of returns." : "MOOX包含传统术数研究与技术分析，预测有效性并未得到确证。预测可能出错，交易可能亏损；内容不构成个性化投资建议或收益保证。"}</p>
  </div>;
}
