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
    descriptionZh: "会员日报、周月走势、股票与加密推荐、缠论数据、量化交易、会员卜卦和实验功能的统一入口。",
    descriptionEn: "One clean entrance for daily and weekly research, stock and crypto picks, Chan data, quant trading, member divination and experimental tools.",
  });
}

type ChannelCard = {
  href: string;
  title: string;
  description: string;
  eyebrow: string;
  experimental?: boolean;
};

const FORECASTS: ChannelCard[] = [
  { href: "/member/daily", title: "会员日报", eyebrow: "今天先看", description: "九大市场当日与下一交易日结论、关键位和失效条件。" },
  { href: "/member/weekly", title: "会员周走势预测", eyebrow: "逐个市场", description: "本周方向、周内路径、关键日期与支撑压力。" },
  { href: "/member/monthly", title: "会员月走势预测", eyebrow: "中期结构", description: "月度主方向、关键周与月内高低窗口。" },
  { href: "/member/weekly-report", title: "会员周报", eyebrow: "本周重点", description: "把本周最值得关注的机会、风险和行动清单集中到一页。" },
];

const PICKS: ChannelCard[] = [
  { href: "/member/stock-picks", title: "会员专享股票推荐", eyebrow: "股票精选", description: "多周期方向、人物周期、关键位置和历史验证。" },
  { href: "/member/crypto-picks", title: "会员专享加密货币推荐", eyebrow: "加密精选", description: "主流币与重点山寨币的多周期研究和执行位置。" },
];

const TOOLS: ChannelCard[] = [
  { href: "/member/technical-methods", title: "会员缠论数据", eyebrow: "执行位置", description: "分型、笔、线段、中枢、背驰与关键支撑压力。" },
  { href: "/member/ai-trading", title: "会员量化交易系统", eyebrow: "规则执行", description: "查看量化计划、持仓管理、保护单与风险状态。" },
  { href: "/member/consultations", title: "会员卜卦系统", eyebrow: "老师解答", description: "静心起卦、六次钱币录入、老师复核并发送到邮箱。" },
];

const EXPERIMENTS: ChannelCard[] = [
  { href: "/member/early-altcoin-radar", title: "山寨币雷达", eyebrow: "早期线索", description: "观察候选资产、热点与资金异动；暂不直接触发实盘。", experimental: true },
  { href: "/member/market-structure", title: "多源K线", eyebrow: "行情实验室", description: "多交易所K线与市场微观结构，用于技术确认和风险过滤。", experimental: true },
  { href: "/member/alpha-feed", title: "多方观点", eyebrow: "匿名观点", description: "匿名汇总关注博主的核心观点、方向、周期、关键点位与理论方法；随现有X情报自动更新。", experimental: true },

];

function CardGrid({ title, subtitle, cards }: { title: string; subtitle: string; cards: ChannelCard[] }) {
  return (
    <section>
      <div className="mb-4">
        <Heading as="h2" size="h3">{title}</Heading>
        <Text variant="body-sm" color="secondary" className="mt-1 block">{subtitle}</Text>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="group rounded-2xl border border-border/[0.09] bg-card/55 p-5 transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-card">
            <div className="flex items-center justify-between gap-3">
              <span className="text-caption font-semibold uppercase tracking-[0.16em] text-primary/75">{card.eyebrow}</span>
              {card.experimental ? <Badge variant="warning">实验</Badge> : null}
            </div>
            <h3 className="mt-3 text-xl font-semibold text-foreground">{card.title}</h3>
            <p className="mt-2 text-body-sm leading-6 text-foreground-secondary">{card.description}</p>
            <span className="mt-4 inline-flex text-body-sm text-primary">进入 →</span>
          </Link>
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
              <Heading as="h1" size="h2" className="mt-4">今天先看最重要的内容</Heading>
              <Text variant="body" color="secondary" className="mt-3 block max-w-3xl">
                日报看今天，周报抓重点，股票与加密推荐看具体机会；深度依据进入标的详情后再展开。
              </Text>
              {!active ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild><Link href="/pricing">查看会员价格</Link></Button>
                  <Button asChild variant="outline"><Link href="/login?next=/member">登录</Link></Button>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild><Link href="/member/daily">打开会员日报</Link></Button>
                  <Button asChild variant="outline"><Link href="/member/weekly-report">查看本周重点</Link></Button>
                </div>
              )}
            </header>

            <CardGrid title="市场预测" subtitle="不同周期各司其职，不重复堆同一段说明。" cards={FORECASTS} />
            <CardGrid title="专享推荐" subtitle="列表先给结论，完整多周期研究在标的详情页。" cards={PICKS} />
            <CardGrid title="交易与服务" subtitle="技术找位置，量化执行规则，卜卦由老师最终复核。" cards={TOOLS} />
            <CardGrid title="实验室" subtitle="保留有价值的早期功能，先积累样本，再决定是否升级为正式能力。" cards={EXPERIMENTS} />
          </div>
        </Section>
      </main>
    </>
  );
}
