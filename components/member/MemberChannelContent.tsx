import { HorizonReadingNav } from "@/components/member/HorizonReadingNav";
import Link from "next/link";
import { Badge, Button, Heading, Section, Text } from "@/components/ui";
import { MemberUpdateNotice } from "@/components/member/MemberUpdateNotice";
import { MEMBER_SEPTEMBER_ROTATION_REPORT_20260826 } from "@/lib/data/member-september-rotation-report-20260826";
import { localizeHref, type Locale } from "@/lib/i18n/config";
import { LATEST_MEMBER_UPDATE } from "@/lib/member-updates/catalog";

type ChannelCard = {
  href: string;
  title: string;
  description: string;
  eyebrow: string;
  action: string;
  links: Array<{ href: string; label: string }>;
};

function primaryTasks(en: boolean): ChannelCard[] { return [
  {
    href: "/member/daily",
    title: (en ? "Today's plan" : "今日决策"),
    eyebrow: (en ? "1 · Start with today" : "第一步 · 今天做什么"),
    description: (en ? "See today's and the next session's outlook, key levels and risks." : "先看今日与下一交易日方向、关键位置、风险窗口和最值得关注的市场。"),
    action: (en ? "Open today's plan" : "进入今日决策"),
    links: [
      { href: "/member/tomorrow", label: (en ? "Next session" : "下一交易日") },
      { href: "/member/key-dates", label: (en ? "Key dates" : "关键日") },
    ],
  },
  {
    href: "/member/weekly-report",
    title: (en ? "Forecasts" : "周期预测"),
    eyebrow: (en ? "2 · Choose your horizon" : "第二步 · 看清大方向"),
    description: (en ? "Compare the annual context, monthly path and this week's direction." : "把年度、月度和本周路线放在一条主线上，先看结论，需要时再展开依据。"),
    action: (en ? "Explore forecasts" : "查看周期预测"),
    links: [
      { href: "/member/annual-outlook", label: (en ? "Annual" : "年度") },
      { href: "/member/monthly", label: (en ? "Monthly" : "月度") },
      { href: "/member/weekly", label: (en ? "Weekly" : "周度") },
      { href: "/member/gann", label: (en ? "Gann confluence" : "江恩共振") },
    ],
  },
  {
    href: "/member/sector-resonance",
    title: (en ? "Focus assets" : "重点关注"),
    eyebrow: (en ? "3 · Build a watchlist" : "第三步 · 找值得看的标的"),
    description: (en ? "Compare sectors, then explore individual stocks and crypto." : "先按板块判断共振与分化，再进入股票或加密标的查看完整多周期研究。"),
    action: (en ? "Open the watchlist" : "打开重点关注"),
    links: [
      { href: "/member/stock-picks", label: (en ? "Stocks" : "股票") },
      { href: "/member/crypto-picks", label: (en ? "Crypto" : "加密") },
      { href: "/member/early-altcoin-radar", label: (en ? "Early signals" : "早期线索") },
    ],
  },
  {
    href: "/member/ai-trading",
    title: (en ? "AI trading" : "AI交易"),
    eyebrow: (en ? "4 · Check the setup" : "第四步 · 确认位置与执行"),
    description: (en ? "Check the official direction, entry conditions, stops, targets and execution status." : "统一查看正式方向、缠论阶段、入场条件、止损止盈、量化计划和风险状态。"),
    action: (en ? "Open AI trading" : "进入AI交易台"),
    links: [
      { href: "/member/technical-methods", label: (en ? "Chan structure" : "缠论位置") },
      { href: "/member/strategy", label: (en ? "Strategies" : "策略") },
      { href: "/member/market-structure", label: (en ? "Market charts" : "多源K线") },
    ],
  },
  {
    href: "/member/weekly-review",
    title: (en ? "Reviews" : "复盘验证"),
    eyebrow: (en ? "5 · Check the results" : "第五步 · 检查预测表现"),
    description: (en ? "Compare weekly forecasts with actual prices, including misses and partial hits." : "以周预测为核心，对照真实走势、路径偏差和后续规则改进，不隐藏失败样本。"),
    action: (en ? "Review the results" : "查看复盘验证"),
    links: [
      { href: "/verification", label: (en ? "Public verification" : "公开验证") },
      { href: "/member/alpha-feed", label: (en ? "Additional research" : "辅助观点") },
    ],
  },
  {
    href: "/member/consultations",
    title: (en ? "Member services" : "会员服务"),
    eyebrow: (en ? "Tools and support" : "需要时再使用"),
    description: (en ? "Find consultations, member videos, account settings and device management." : "集中进入会员卜卦、视频内容、账户与设备管理，不打断日常市场阅读。"),
    action: (en ? "Open member services" : "打开会员服务"),
    links: [
      { href: "/member/videos", label: (en ? "Member videos" : "会员视频") },
      { href: "/member/updates", label: (en ? "Updates" : "版本公告") },
      { href: "/account", label: (en ? "Account and devices" : "账户与设备") },
    ],
  },
]; }

function septemberSpotlight(en: boolean) { return [
  {
    symbol: "SOXL",
    name: (en ? "Semiconductors" : "半导体板块"),
    direction: (en ? "Relative strength after Sep 7" : "9月7日后相对转强"),
    window: (en ? "Sep 7 – Oct 6" : "9月7日—10月6日"),
    path: (en ? "Watch buying support when US markets reopen Sep 8. Watch for profit-taking Sep 14–20 and reassess positions before Sep 21; an October peak window is not a reason to hold longs throughout." : "9/8美股复市后看承接，14—20日防兑现，21日前检查仓位；不能因高位候选延续到10月就一直持多。"),
    href: "/member/sector-resonance",
  },
  {
    symbol: "SNDK",
    name: (en ? "Sandisk" : "闪迪"),
    direction: (en ? "Decline, then recovery" : "先跌后涨"),
    window: (en ? "Sep 7 – Oct 7" : "9月7日—10月7日"),
    path: (en ? "Watch for strength after Sep 8. Confirmation requires stabilization on daily and 4-hour charts plus a higher low on the 30-minute chart. Watch for profit-taking Sep 14–20." : "9/8复市后观察转强；日线、4H止跌且30分钟形成更高低点才确认。14—20日同步检查兑现风险。"),
    href: "/featured-stocks/sandisk",
  },
  {
    symbol: "MU",
    name: (en ? "Micron" : "美光"),
    direction: (en ? "Phased rotation" : "分段轮动"),
    window: (en ? "Relative strength Sep 7–13" : "9月7日—13日偏强"),
    path: (en ? "An early-month rise then pullback, a choppy advance Sep 7–13, and renewed weakness risk Sep 14–20. Local strength does not imply a one-way month." : "月初先涨后跌，7—13日震荡抬高，14—20日重新防转弱；不把局部强势外推成整月单边。"),
    href: "/featured-stocks/mu",
  },
] as const; }

function SeptemberSemiconductorSpotlight({ locale }: { locale: Locale }) {
  const en = locale === "en";
  return (
    <section aria-labelledby="september-semiconductor-spotlight" className="overflow-hidden rounded-3xl border border-emerald-300/25 bg-[radial-gradient(circle_at_88%_0%,rgba(52,211,153,.18),transparent_35%),linear-gradient(145deg,#0c1715,#090a0e)] p-6 shadow-[0_0_60px_rgba(16,185,129,.07)] sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success">{en ? "September focus" : "9月高信心专题"}</Badge>
        <Badge variant="outline">{en ? "Sector consensus " : "板块共振指数 "}{MEMBER_SEPTEMBER_ROTATION_REPORT_20260826.confidenceCalibration.items.find((item) => item.id === "TECH-SEPTEMBER-ROTATION")?.index ?? 4}/5</Badge>
        <Badge variant="outline">{en ? "Priority watchlist" : "建议会员重点关注"}</Badge>
        <span className="text-caption text-emerald-100/55">{en ? "Direction, consensus and execution are separate" : "方向、信心与执行条件分别判断"}</span>
      </div>
      <Heading id="september-semiconductor-spotlight" as="h2" size="h2" className="mt-4">{en ? "Semiconductors & memory: watch the window after Sep 7" : "半导体与存储：9月7日后进入重点窗口"}</Heading>
      <Text variant="body" color="secondary" className="mt-3 block max-w-4xl leading-7">
        {en ? "The sector outlook and Sandisk forecast align, making this a higher-consensus September theme. Timing differs by asset; follow each setup's confirmation and invalidation conditions." : "板块阶段路线与闪迪专项预测同向，属于9月目前信心较高的前瞻主题；但不同标的节奏并不相同，必须按各自确认与失效条件跟踪。"}
      </Text>
      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {septemberSpotlight(en).map((item) => (
          <Link key={item.symbol} href={localizeHref(item.href, locale)} className="group rounded-2xl border border-emerald-200/15 bg-black/20 p-5 transition hover:-translate-y-0.5 hover:border-emerald-200/35 hover:bg-emerald-300/[.05]">
            <div className="flex items-start justify-between gap-3">
              <div><span className="font-mono text-caption text-emerald-200/65">{item.symbol}</span><h3 className="mt-1 text-xl font-semibold text-foreground">{item.name}</h3></div>
              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/[.08] px-3 py-1 text-caption font-semibold text-emerald-100">{item.direction}</span>
            </div>
            <p className="mt-4 text-sm font-semibold text-emerald-100/85">{en ? "Watch window: " : "重点窗口："}{item.window}</p>
            <p className="mt-2 text-body-sm leading-6 text-foreground-secondary">{item.path}</p>
            <span className="mt-4 inline-flex text-caption font-semibold text-emerald-200/75 group-hover:text-emerald-100">{en ? "Full outlook and key dates →" : "查看完整路径与关键日 →"}</span>
          </Link>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-200/10 pt-5">
        <p className="max-w-3xl text-caption leading-5 text-foreground-tertiary">{en ? "Consensus is not a probability of profit or a guaranteed rise. Dates are observation windows; execution still requires technical confirmation and an acceptable risk/reward." : "高信心指正式周期证据的共振程度，不代表保证上涨；关键日期是观察窗口，真实执行仍需技术结构和风险回报确认。"}</p>
        <Button asChild variant="outline"><Link href={localizeHref("/member/sector-resonance", locale)}>{en ? "Explore the semiconductor outlook" : "打开半导体板块共振"}</Link></Button>
      </div>
    </section>
  );
}

function TaskGrid({ cards, locale }: { cards: ChannelCard[]; locale: Locale }) {
  const en = locale === "en";
  return (
    <section aria-labelledby="member-main-tasks">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Heading id="member-main-tasks" as="h2" size="h3">{en ? "Your six starting points" : "六个入口，按顺序看"}</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 block">{en ? "Choose your horizon, then your assets and entry conditions." : "先选持有周期，再看关注标的和交易条件。"}</Text>
        </div>
        <Text variant="caption" color="tertiary">{en ? "Today → Forecasts → Focus → Trading → Reviews" : "今天 → 周期 → 关注 → 交易 → 复盘"}</Text>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.href} className="group rounded-3xl border border-border/[0.09] bg-card/55 p-5 transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-card sm:p-6">
            <span className="text-caption font-semibold uppercase tracking-[0.14em] text-primary/75">{card.eyebrow}</span>
            <h3 className="mt-3 text-2xl font-semibold text-foreground">{card.title}</h3>
            <p className="mt-2 min-h-12 text-body-sm leading-6 text-foreground-secondary">{card.description}</p>
            <Link href={localizeHref(card.href, locale)} className="mt-5 inline-flex rounded-full bg-primary px-4 py-2 text-body-sm font-semibold text-primary-foreground transition hover:opacity-90">
              {card.action} →
            </Link>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border/[0.08] pt-4">
              {card.links.map((item) => (
                <Link key={item.href} href={localizeHref(item.href, locale)} className="text-caption text-foreground-tertiary underline decoration-border underline-offset-4 transition hover:text-primary">
                  {item.label}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MemberChannelContent({ locale, active }: { locale: Locale; active: boolean }) {
  const en = locale === "en";
  return (
    <>
      <main>
        <Section spacing="lg">
          <div className="mx-auto w-full max-w-6xl space-y-10">
            <header className="overflow-hidden rounded-3xl border border-violet-300/15 bg-[radial-gradient(circle_at_85%_0%,rgba(124,92,255,.18),transparent_34%),linear-gradient(145deg,#0f1220,#090a0e)] p-6 sm:p-8">
              <Badge variant={active ? "success" : "outline"}>{active ? (en ? "Member access unlocked" : "会员频道已解锁") : (en ? "Member channel" : "会员频道")}</Badge>
              <Text variant="caption" className="mt-5 block uppercase tracking-[0.2em] text-violet-200/65">MOOX MEMBER DECISION DESK</Text>
              <Heading as="h1" size="h2" className="mt-2">{en ? "Know what to watch today" : "打开就知道今天看什么"}</Heading>
              <Text variant="body" color="secondary" className="mt-3 block max-w-3xl">
                {en ? "Start with today's outlook. Check the wider trend and your watchlist, then confirm the setup and risks." : "先看今日决策，再看周期方向和重点标的，最后确认技术位置与AI执行；卦象、缠论和辅助证据需要时再展开。"}
              </Text>
              {!active ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild><Link href={localizeHref("/pricing", locale)}>{en ? "View membership" : "查看会员价格"}</Link></Button>
                  <Button asChild variant="outline"><Link href={`${localizeHref("/login", locale)}?next=${encodeURIComponent(localizeHref("/member", locale))}`}>{en ? "Sign in" : "登录"}</Link></Button>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild><Link href={localizeHref("/member/daily", locale)}>{en ? "Open today's plan" : "打开今日决策"}</Link></Button>
                  <Button asChild variant="outline"><Link href={localizeHref("/member/key-dates", locale)}>{en ? "Upcoming key dates" : "查看最近关键日"}</Link></Button>
                  <Button asChild variant="ghost"><Link href={localizeHref("/member/ai-trading", locale)}>{en ? "AI trading status" : "查看AI交易状态"}</Link></Button>
                </div>
              )}
            </header>

            <HorizonReadingNav en={en} />
            {active ? <SeptemberSemiconductorSpotlight locale={locale} /> : null}

            <MemberUpdateNotice note={LATEST_MEMBER_UPDATE} locale={locale} compact />

            <TaskGrid cards={primaryTasks(en)} locale={locale} />
          </div>
        </Section>
      </main>
    </>
  );
}
