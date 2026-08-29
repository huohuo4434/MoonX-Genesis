import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Heading, Section, Text } from "@/components/ui";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/member",
    titleZh: "会员频道 | MOOX Intelligence",
    titleEn: "Member Channel | MOOX Intelligence",
    descriptionZh: "从今日决策、周期预测、重点关注到AI交易和复盘验证的统一会员决策台。",
    descriptionEn: "A focused member decision desk for today's plan, multi-horizon forecasts, priority assets, AI trading and reviews.",
  });
}

type ChannelCard = {
  href: string;
  title: string;
  description: string;
  eyebrow: string;
  action: string;
  links: Array<{ href: string; label: string }>;
};

const PRIMARY_TASKS: ChannelCard[] = [
  {
    href: "/member/daily",
    title: "今日决策",
    eyebrow: "第一步 · 今天做什么",
    description: "先看今日与下一交易日方向、关键位置、风险窗口和最值得关注的市场。",
    action: "进入今日决策",
    links: [
      { href: "/member/tomorrow", label: "下一交易日" },
      { href: "/member/key-dates", label: "关键日" },
    ],
  },
  {
    href: "/member/weekly-report",
    title: "周期预测",
    eyebrow: "第二步 · 看清大方向",
    description: "把年度、月度和本周路线放在一条主线上，先看结论，需要时再展开依据。",
    action: "查看周期预测",
    links: [
      { href: "/member/annual-outlook", label: "年度" },
      { href: "/member/monthly", label: "月度" },
      { href: "/member/weekly", label: "周度" },
    ],
  },
  {
    href: "/member/sector-resonance",
    title: "重点关注",
    eyebrow: "第三步 · 找值得看的标的",
    description: "先按板块判断共振与分化，再进入股票或加密标的查看完整多周期研究。",
    action: "打开重点关注",
    links: [
      { href: "/member/stock-picks", label: "股票" },
      { href: "/member/crypto-picks", label: "加密" },
      { href: "/member/early-altcoin-radar", label: "早期线索" },
    ],
  },
  {
    href: "/member/ai-trading",
    title: "AI交易",
    eyebrow: "第四步 · 确认位置与执行",
    description: "统一查看正式方向、缠论阶段、入场条件、止损止盈、量化计划和风险状态。",
    action: "进入AI交易台",
    links: [
      { href: "/member/technical-methods", label: "缠论位置" },
      { href: "/member/strategy", label: "策略" },
      { href: "/member/market-structure", label: "多源K线" },
    ],
  },
  {
    href: "/member/weekly-review",
    title: "复盘验证",
    eyebrow: "第五步 · 检查预测表现",
    description: "以周预测为核心，对照真实走势、路径偏差和后续规则改进，不隐藏失败样本。",
    action: "查看复盘验证",
    links: [
      { href: "/verification", label: "公开验证" },
      { href: "/member/alpha-feed", label: "辅助观点" },
    ],
  },
  {
    href: "/member/consultations",
    title: "会员服务",
    eyebrow: "需要时再使用",
    description: "集中进入会员卜卦、视频内容、账户与设备管理，不打断日常市场阅读。",
    action: "打开会员服务",
    links: [
      { href: "/member/videos", label: "会员视频" },
      { href: "/account", label: "账户与设备" },
    ],
  },
];

function TaskGrid({ cards }: { cards: ChannelCard[] }) {
  return (
    <section aria-labelledby="member-main-tasks">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Heading id="member-main-tasks" as="h2" size="h3">六个入口，按顺序看</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 block">旧功能没有删除，全部收进对应入口的二级链接。</Text>
        </div>
        <Text variant="caption" color="tertiary">今天 → 周期 → 关注 → 交易 → 复盘</Text>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.href} className="group rounded-3xl border border-border/[0.09] bg-card/55 p-5 transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-card sm:p-6">
            <span className="text-caption font-semibold uppercase tracking-[0.14em] text-primary/75">{card.eyebrow}</span>
            <h3 className="mt-3 text-2xl font-semibold text-foreground">{card.title}</h3>
            <p className="mt-2 min-h-12 text-body-sm leading-6 text-foreground-secondary">{card.description}</p>
            <Link href={card.href} className="mt-5 inline-flex rounded-full bg-primary px-4 py-2 text-body-sm font-semibold text-primary-foreground transition hover:opacity-90">
              {card.action} →
            </Link>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border/[0.08] pt-4">
              {card.links.map((item) => (
                <Link key={item.href} href={item.href} className="text-caption text-foreground-tertiary underline decoration-border underline-offset-4 transition hover:text-primary">
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

export default async function MemberChannelPage() {
  const gate = await getMemberDevicePageAccess();
  const active = gate.status === "ALLOWED";
  return (
    <>
      {active ? <MemberDeviceHeartbeat /> : null}
      <main>
        <Section spacing="lg">
          <div className="mx-auto w-full max-w-6xl space-y-10">
            <header className="overflow-hidden rounded-3xl border border-violet-300/15 bg-[radial-gradient(circle_at_85%_0%,rgba(124,92,255,.18),transparent_34%),linear-gradient(145deg,#0f1220,#090a0e)] p-6 sm:p-8">
              <Badge variant={active ? "success" : "outline"}>{active ? "会员频道已解锁" : "会员频道"}</Badge>
              <Text variant="caption" className="mt-5 block uppercase tracking-[0.2em] text-violet-200/65">MOOX MEMBER DECISION DESK</Text>
              <Heading as="h1" size="h2" className="mt-2">打开就知道今天看什么</Heading>
              <Text variant="body" color="secondary" className="mt-3 block max-w-3xl">
                先看今日决策，再看周期方向和重点标的，最后确认技术位置与AI执行；卦象、缠论和辅助证据需要时再展开。
              </Text>
              {!active ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild><Link href="/pricing">查看会员价格</Link></Button>
                  <Button asChild variant="outline"><Link href="/login?next=/member">登录</Link></Button>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild><Link href="/member/daily">打开今日决策</Link></Button>
                  <Button asChild variant="outline"><Link href="/member/key-dates">查看最近关键日</Link></Button>
                  <Button asChild variant="ghost"><Link href="/member/ai-trading">查看AI交易状态</Link></Button>
                </div>
              )}
            </header>

            <TaskGrid cards={PRIMARY_TASKS} />
          </div>
        </Section>
      </main>
    </>
  );
}
