"use client";

import Link from "next/link";
import { Button, Card, Heading, Section, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { FounderDiscountQuote } from "@/lib/payments/founder-discount-shared";
import type { MembershipPlan } from "@/types/membership";
import { PricingPlansClient } from "@/components/payments/PricingPlansClient";

const BENEFITS = [
  ["当日核心市场预测", "北京时间08:00后查看", "全天提前查看", "Daily core-market forecasts", "Available after 08:00 Beijing time", "Early access all day"],
  ["下一交易日方向", "—", "完整展示", "Next-session direction", "—", "Full access"],
  ["年度路线与关键月", "—", "重点资产完整展示", "Yearly roadmaps and key months", "—", "Full coverage for focus assets"],
  ["上涨／震荡／下跌情景权重", "基础版", "完整展示", "Bullish / range / bearish scenario weights", "Basic", "Full access"],
  ["运行路径", "基础版", "完整展示", "Expected path", "Basic", "Full access"],
  ["支撑、压力与确认位", "—", "完整展示", "Support, resistance and confirmation", "—", "Full access"],
  ["技术风控参考与风险提示", "—", "完整展示", "Technical risk references and risk notes", "—", "Full access"],
  ["月、周、逐日路径", "—", "完整展示", "Monthly, weekly and daily paths", "—", "Full access"],
  ["板块共振矩阵", "—", "逐周与逐日完整展示", "Sector-resonance matrices", "—", "Full weekly and daily views"],
  ["六爻、奇门、缠论与完整卦象", "—", "完整展示", "Liu Yao, Qimen, Chan structure and full readings", "—", "Full access"],
  ["多方观点涨跌矩阵", "近10天摘要", "同向、分歧与来源代号", "Multi-source direction matrix", "10-day summary", "Alignment, disagreement and source aliases"],
  ["重点资产完整研究", "摘要", "完整展示", "Focused-asset research", "Summary", "Full access"],
  ["策略中心与AI交易试运行", "公开摘要", "计划、理由、进出场与记录", "Strategy Center and AI trading trial", "Public summary", "Plans, rationale, levels and records"],
  ["六爻 / 八字咨询权益", "—", "月度1次、季度3次、年度12次", "Liuyao / Bazi consultations", "—", "1 monthly, 3 quarterly, 12 yearly"],
] as const;

const MEMBER_MODULES = [
  {
    path: "/member/annual-outlook",
    eyebrowZh: "年卦",
    eyebrowEn: "YEARLY",
    titleZh: "年度路线与关键月",
    titleEn: "Yearly roadmap and key months",
    descriptionZh: "按重点资产展示全年阶段、未来关键月及高低点候选月，历史月份不回填。",
    descriptionEn: "Yearly regimes, future key months and candidate high/low months for focus assets, without rewriting history.",
  },
  {
    path: "/member/daily",
    eyebrowZh: "日 · 周 · 月",
    eyebrowEn: "DAY · WEEK · MONTH",
    titleZh: "跨周期行情预测",
    titleEn: "Cross-horizon forecasts",
    descriptionZh: "从整月主路径到每周方向、关键日和当日风险，分清上级周期与执行周期。",
    descriptionEn: "Monthly paths, weekly direction, key dates and daily risk with clear horizon ownership.",
  },
  {
    path: "/member/sector-resonance",
    eyebrowZh: "板块",
    eyebrowEn: "SECTORS",
    titleZh: "逐周与逐日板块共振",
    titleEn: "Weekly and daily sector resonance",
    descriptionZh: "半导体、科技、加密、美股指数、贵金属和能源并排对照，一眼看出趋同与分化。",
    descriptionEn: "Compare semiconductors, tech, crypto, US indices, metals and energy at a glance.",
  },
  {
    path: "/member/stock-picks",
    eyebrowZh: "重点资产",
    eyebrowEn: "FOCUS ASSETS",
    titleZh: "完整卦象与模拟走势",
    titleEn: "Full readings and projected paths",
    descriptionZh: "查看年卦、月卦、逐周卦象、生克关系、关键时间，以及实际K线和模拟路径。",
    descriptionEn: "Yearly, monthly and weekly readings, key timing, relationships, actual candles and projected paths.",
  },
  {
    path: "/member/alpha-feed",
    eyebrowZh: "外部验证",
    eyebrowEn: "CROSS-CHECK",
    titleZh: "多方观点涨跌矩阵",
    titleEn: "Multi-source direction matrix",
    descriptionZh: "按资产汇总匿名分析师观点，并标注与网站正式方向同向、分歧或信息不足。",
    descriptionEn: "Anonymous analyst views grouped by asset and marked as aligned, divergent or insufficient.",
  },
  {
    path: "/member/strategy",
    eyebrowZh: "试运行",
    eyebrowEn: "TRIAL",
    titleZh: "策略中心与AI交易记录",
    titleEn: "Strategy Center and AI trading records",
    descriptionZh: "展示短、中、长线计划及理由、进场、止盈止损与运行记录；当前仍为试运行。",
    descriptionEn: "Short-, medium- and long-horizon plans, rationale, entries, exits and records; currently in trial operation.",
  },
] as const;

export function PricingPageContent({
  plans,
  supportEmail,
  trc20Address,
  bep20Address,
  isLoggedIn,
  isAdmin,
  isActiveMember,
  inviteHref,
  founderQuote,
}: {
  plans: MembershipPlan[];
  supportEmail: string;
  trc20Address: string;
  bep20Address: string;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isActiveMember: boolean;
  inviteHref: string;
  founderQuote: FounderDiscountQuote;
}) {
  const { locale, href } = useLocale();
  const en = locale === "en";

  return (
    <main>
      <Section spacing="lg" className="flex flex-col items-center gap-6">
        <div className="max-w-3xl text-center">
          <Heading as="h1" size="h2" className="break-keep text-[clamp(2rem,8vw,3.75rem)] leading-tight">
            {en ? "MOOX Membership" : "MOOX会员方案"}
          </Heading>
          <Text variant="body" color="secondary" className="mt-3 block">
            {en
              ? "Start free with today's market view, then unlock next-session, weekly, monthly and full research when needed."
              : "先免费注册查看今日观点，再按需要解锁下一交易日、周度、月度和完整研究。"}
          </Text>
        </div>

        <div className="grid w-full max-w-4xl gap-3 md:grid-cols-2">
          <Card padding="md">
            <Text variant="body" weight="semibold">{en ? "Free registered user" : "免费注册用户"}</Text>
            <Text variant="body-sm" color="secondary" className="mt-2 block">
              {en
                ? "View today's basic market direction after 08:00 Beijing time, public focused-asset summaries and verification records."
                : "北京时间08:00后查看今日基础观点、重点资产公开摘要与公开验证。"}
            </Text>
            <Button asChild className="mt-4" variant="outline"><Link href={isLoggedIn ? href("/member/daily") : href(`/register?next=${encodeURIComponent(href("/member/daily"))}`)}>{en ? (isLoggedIn ? "Read today's view" : "Start free — no payment required") : (isLoggedIn ? "查看今日观点" : "免费注册，无需付款")}</Link></Button>
          </Card>
          <Card padding="md" className="border-primary/25 bg-primary/[0.03]">
            <Text variant="body" weight="semibold">{en ? "Paid member" : "付费会员"}</Text>
            <Text variant="body-sm" color="secondary" className="mt-2 block">
              {en
                ? "Get early access to full daily forecasts plus next-session, weekly, monthly, technical levels and member signals."
                : "全天提前查看今日完整预测，并解锁下一交易日、周度、月度、关键价位和会员信号。"}
            </Text>
            <a href="#membership-plans" className="mt-4 inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">{en ? "See prices and choose a plan" : "查看价格与套餐"}</a>
          </Card>
        </div>

        <details className="w-full max-w-4xl rounded-2xl border border-cyan-300/15 p-5">
          <summary className="cursor-pointer font-semibold">{en ? "Explore the included research tools" : "展开查看包含哪些研究工具"}</summary>
          <div className="max-w-3xl">
            <Text variant="caption" className="tracking-[0.16em] text-cyan-200/70">
              {en ? "MEMBER RESEARCH MODULES" : "当前会员研究模块"}
            </Text>
            <Heading as="h2" size="h3" className="mt-2">
              {en ? "One membership, six connected research views" : "一份会员，六个互相校验的研究入口"}
            </Heading>
            <Text variant="body-sm" color="secondary" className="mt-2 block">
              {en
                ? "Read the yearly regime first, then the monthly and weekly route, daily rhythm, sector alignment and outside cross-checks. Evidence gaps and disagreements stay visible."
                : "先看年度环境，再看月、周、日节奏，最后用板块共振和多方观点交叉验证；证据缺口和分歧不会被隐藏。"}
            </Text>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MEMBER_MODULES.map((module) => (
              <Link
                key={module.path}
                href={href(module.path)}
                className="group rounded-xl border border-border/[0.1] bg-background/25 p-4 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.035]"
              >
                <span className="text-[11px] font-medium tracking-[0.14em] text-cyan-200/60">
                  {en ? module.eyebrowEn : module.eyebrowZh}
                </span>
                <span className="mt-2 block text-body-sm font-semibold text-foreground transition group-hover:text-cyan-100">
                  {en ? module.titleEn : module.titleZh}
                </span>
                <span className="mt-2 block text-caption leading-5 text-foreground-secondary">
                  {en ? module.descriptionEn : module.descriptionZh}
                </span>
              </Link>
            ))}
          </div>
        </details>

        <Card padding="lg" className="w-full max-w-4xl border-amber-400/25 bg-amber-400/[0.04]">
          <Text variant="body" weight="semibold">
            {en ? "Founding member offer" : "创始会员连续续订优惠"}
          </Text>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border/[0.08] p-3">
              <Text variant="body-sm" weight="semibold">
                {en ? "First 10 paid members" : "前10名付费会员"}
              </Text>
              <Text variant="body-sm" color="secondary" className="mt-1 block">
                {en ? "20% off uninterrupted renewals: 64 / 160 / 560 USDT at the current list price." : "连续续订期间永久8折：按当前标价分别为64／160／560 USDT。"}
              </Text>
            </div>
            <div className="rounded-lg border border-border/[0.08] p-3">
              <Text variant="body-sm" weight="semibold">
                {en ? "Members 11–50" : "第11至50名付费会员"}
              </Text>
              <Text variant="body-sm" color="secondary" className="mt-1 block">
                {en ? "10% off uninterrupted renewals: 72 / 180 / 630 USDT at the current list price." : "连续续订期间永久9折：按当前标价分别为72／180／630 USDT。"}
              </Text>
            </div>
          </div>
          <Text variant="caption" color="tertiary" className="mt-3 block">
            {en
              ? "Eligibility is attached to one account and is not transferable or stackable. A renewal order must be submitted before the current membership expires; once interrupted, the founding discount is permanently forfeited. Test or rejected orders do not qualify."
              : "资格仅限本人账户，不可转让、不可与其他折扣叠加。必须在当前会员到期前提交续费订单；一旦中断，创始会员折扣永久失效。测试订单和审核拒绝订单不计入名额。"}
          </Text>
        </Card>

        <div id="membership-plans" className="w-full max-w-4xl scroll-mt-24">
        <p className="mb-4 text-sm text-foreground-secondary">{en ? "Membership pays for research access, not guaranteed profits. Payments are in USDT; check the supported network before transferring." : "会员费购买研究内容，不保证盈利。当前以USDT付款，转账前请核对支持的网络。"}</p>
        {isAdmin ? (
          <Card padding="lg" className="w-full max-w-4xl">
            <Text variant="body-sm" color="secondary">
              {en ? "Administrators do not need to purchase membership." : "管理员不需要购买会员。"}
            </Text>
            <div className="mt-4">
              <Button asChild size="sm"><Link href={href("/admin")}>{en ? "Open admin" : "进入后台"}</Link></Button>
            </div>
          </Card>
        ) : (
          <PricingPlansClient
            plans={plans}
            supportEmail={supportEmail}
            trc20Address={trc20Address}
            bep20Address={bep20Address}
            isLoggedIn={isLoggedIn}
            founderQuote={founderQuote}
          />
        )}
        </div>

        <div className="grid w-full max-w-4xl gap-4 md:hidden">
          {(["free", "member"] as const).map((tier) => (
            <Card key={tier} padding="lg" className={tier === "member" ? "border-primary/25 bg-primary/[0.03]" : undefined}>
              <Text variant="body" weight="semibold">
                {tier === "free" ? (en ? "Free Account" : "免费账户") : (en ? "Member" : "付费会员")}
              </Text>
              <ul className="mt-4 space-y-3">
                {BENEFITS.map((row) => (
                  <li key={`${tier}-${row[0]}`} className="border-t border-border/[0.07] pt-3 first:border-t-0 first:pt-0">
                    <Text variant="body-sm" weight="medium">{en ? row[3] : row[0]}</Text>
                    <Text variant="caption" color="secondary" className="mt-1 block">
                      {tier === "free" ? (en ? row[4] : row[1]) : (en ? row[5] : row[2])}
                    </Text>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <Card padding="none" className="hidden w-full max-w-4xl overflow-hidden md:block">
          <table className="w-full border-collapse text-left text-body-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3">{en ? "Feature" : "功能"}</th>
                <th className="px-4 py-3">{en ? "Free user" : "免费注册用户"}</th>
                <th className="px-4 py-3">{en ? "Paid member" : "付费会员"}</th>
              </tr>
            </thead>
            <tbody>
              {BENEFITS.map((row) => (
                <tr key={row[0]} className="border-t border-border/[0.07]">
                  <td className="px-4 py-3 text-foreground">{en ? row[3] : row[0]}</td>
                  <td className="px-4 py-3 text-foreground-secondary">{en ? row[4] : row[1]}</td>
                  <td className="px-4 py-3 text-foreground-secondary">{en ? row[5] : row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card padding="lg" className="w-full max-w-4xl">
          <Text variant="body" weight="semibold">{en ? "Order status" : "订单状态说明"}</Text>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-body-sm text-foreground-secondary">
            {(en
              ? ["Order created", "Transfer submitted", "On-chain verification", "Activated", "Notification sent"]
              : ["生成订单", "提交转账", "链上自动核验", "自动开通", "通知已送达"]
            ).map((item, index, array) => (
              <span key={item} className="contents">
                <span>{item}</span>{index < array.length - 1 ? <span aria-hidden>→</span> : null}
              </span>
            ))}
          </div>
          <Text variant="caption" color="tertiary" className="mt-3 block">
            {en
              ? "Submitting a transaction hash starts automatic verification. Membership activates only after the configured token, network, recipient, amount and confirmations all match."
              : "提交交易哈希后系统自动核验；只有代币合约、网络、收款地址、精确金额及链上确认数全部匹配，会员才会自动开通。"}
          </Text>
        </Card>

        <Card padding="lg" className="w-full max-w-4xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <Text variant="body" weight="semibold">{en ? "Referral rewards" : "邀请奖励"}</Text>
              <Text variant="body-sm" color="secondary" className="mt-2 block">
                {en
                  ? "Successful referrals continue to receive the existing reward days. Referral rewards do not change the founding discount tier."
                  : "邀请成功后继续按现有规则获得奖励天数；邀请奖励不会改变创始会员折扣档位。"}
              </Text>
            </div>
            <Button asChild size="sm"><Link href={inviteHref}>{en ? "Open referral page" : "进入邀请页面"}</Link></Button>
          </div>
        </Card>

        <Card padding="lg" className="w-full max-w-4xl border-primary/20 bg-primary/[0.025]">
          <Text variant="body" weight="semibold">{en ? "Start here after activation" : "开通后按这个顺序看"}</Text>
          <Text variant="body-sm" color="secondary" className="mt-2 block">
            {en ? "Membership activation is automatic after all on-chain checks pass. Use these links instead of searching through every page." : "链上核验全部通过后会自动开通会员；不需要把全站从头看一遍，按下面顺序使用即可。"}
          </Text>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: en ? "Today" : "今天先看这里", path: "/#moonx-view" },
              { label: en ? "Yearly roadmap" : "年度路线", path: "/member/annual-outlook" },
              { label: en ? "Weekly outlook" : "周走势", path: "/member/weekly" },
              { label: en ? "Sector resonance" : "板块共振", path: "/member/sector-resonance" },
              { label: en ? "Strategy Center" : "策略中心", path: "/member/strategy" },
              { label: en ? "Public verification" : "历史验证", path: "/verification" },
            ].map(({ label, path }) => (
              <Link key={path} href={href(path)} className="rounded-lg border border-border/[0.1] p-3 text-body-sm font-medium transition-colors hover:border-primary/30 hover:bg-primary/[0.03]">
                {label}
              </Link>
            ))}
          </div>
        </Card>

        <div className="flex flex-wrap justify-center gap-4">
          {isActiveMember ? <Link href={href("/account")} className="text-body-sm text-primary hover:underline">{en ? "My account" : "我的账户"}</Link> : null}
          {!isLoggedIn ? <Link href={href("/login?next=/pricing")} className="text-body-sm text-primary hover:underline">{en ? "Already have an account? Sign in" : "已有账户？登录"}</Link> : null}
        </div>
      </Section>
    </main>
  );
}
