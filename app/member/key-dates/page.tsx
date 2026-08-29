import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildKeyDateRadar, summarizeKeyDateRadar, type KeyDateAction, type KeyDateRadarViewItem } from "@/lib/data/key-date-radar-core";
import { MEMBER_KEY_DATE_RADAR_ITEMS } from "@/lib/data/member-key-date-radar";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/key-dates";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "关键日雷达 | MOOX Intelligence",
    titleEn: "Key-Date Radar | MOOX Intelligence",
    descriptionZh: "月卦关键日为主、周卦窗口为辅，集中查看抄底、逃顶和变盘观察日。",
    descriptionEn: "A member radar for bottom, exit and turning windows led by monthly readings and assisted by weekly paths.",
  });
}
const ACTION_META: Record<KeyDateAction, { title: string; subtitle: string; tone: string }> = {
  BOTTOM_WATCH: { title: "抄底观察", subtitle: "只在下跌释放后等技术止跌，不做左侧盲猜。", tone: "text-emerald-200" },
  TOP_EXIT_WATCH: { title: "逃顶 / 减仓", subtitle: "优先保护已有利润；没有顶部结构，不按日期裸空。", tone: "text-rose-200" },
  TURNING_RISK: { title: "变盘 / 风险", subtitle: "方向尚需行情确认，适合减仓位、缩杠杆、等突破。", tone: "text-amber-200" },
};

function dateLabel(item: KeyDateRadarViewItem) {
  return item.startDate === item.endDate ? item.startDate : `${item.startDate} 至 ${item.endDate}`;
}

function EventCard({ item }: { item: KeyDateRadarViewItem }) {
  const evidenceLabel = item.evidence === "MONTH_EXPLICIT" ? "月卦明确窗口" : item.evidence === "MONTH_PATH_DERIVED" ? "月路径推演" : "周卦辅助窗口";
  const statusLabel = item.status === "ACTIVE" ? "进行中" : item.status === "UPCOMING" ? "待观察" : "待复盘";
  return (
    <Card padding="lg" className="border-border/[0.09] bg-card/55">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="font-mono text-caption text-foreground-tertiary">{dateLabel(item)}</p><Heading as="h3" size="h3" className="mt-1">{item.assetName} <span className="font-mono text-body-sm font-normal text-foreground-tertiary">{item.symbol}</span></Heading></div>
        <div className="flex gap-2"><Badge variant={item.status === "ACTIVE" ? "warning" : "outline"}>{statusLabel}</Badge><Badge variant="outline">{evidenceLabel}</Badge></div>
      </div>
      <p className="mt-4 text-lg font-semibold text-foreground">{item.title}</p>
      <dl className="mt-4 space-y-3 text-body-sm leading-6">
        <div><dt className="font-semibold text-violet-200">月度 / 阶段主判</dt><dd className="text-foreground-secondary">{item.primaryView}</dd></div>
        <div><dt className="font-semibold text-sky-200">周度辅助</dt><dd className="text-foreground-secondary">{item.weeklyAssist}</dd></div>
        <div><dt className="font-semibold text-emerald-200">行动确认</dt><dd className="text-foreground-secondary">{item.confirmation}</dd></div>
        <div><dt className="font-semibold text-rose-200">失效 / 不做</dt><dd className="text-foreground-secondary">{item.invalidation}</dd></div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-3 border-t border-border/[0.08] pt-3 text-caption text-foreground-tertiary"><span>参考信心 {item.confidence}%</span><span>证据 {item.sourceIds.length} 条</span><span>观察窗 ≠ 自动下单</span></div>
    </Card>
  );
}

export default async function MemberKeyDatesPage() {
  noStore();
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED") redirect(`/login?next=${path}`);
  if (gate.status === "MEMBERSHIP_REQUIRED") redirect("/pricing");
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;

  const asOfDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const items = buildKeyDateRadar(MEMBER_KEY_DATE_RADAR_ITEMS, asOfDate);
  const summary = summarizeKeyDateRadar(items);

  return (
    <><MemberDeviceHeartbeat /><main><Section spacing="lg"><div className="mx-auto w-full max-w-7xl space-y-9">
      <header className="rounded-3xl border border-violet-300/15 bg-[radial-gradient(circle_at_88%_0%,rgba(124,92,255,.2),transparent_34%),linear-gradient(145deg,#11101b,#090a0e)] p-6 sm:p-8">
        <Badge variant="warning">会员关键日雷达</Badge>
        <Heading as="h1" size="h2" className="mt-4">哪天看抄底，哪天防逃顶</Heading>
        <Text variant="body" color="secondary" className="mt-3 block max-w-4xl">月卦和阶段卦负责主要时间框架，周卦细化节奏，缠论与真实K线负责最后确认。日期到了但结构没到，继续等；行情提前兑现，按实际结构处理，不死守日历。</Text>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[
          ["覆盖品种", summary.assetCount], ["正在观察", summary.activeCount], ["抄底窗口", summary.bottomCount], ["逃顶窗口", summary.topCount], ["变盘窗口", summary.riskCount],
        ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"><p className="text-caption text-foreground-tertiary">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div>
      </header>

      <Card padding="lg" className="border-amber-300/15 bg-amber-300/[0.035]"><Heading as="h2" size="h3">一分钟使用方法</Heading><div className="mt-3 grid gap-3 text-body-sm text-foreground-secondary md:grid-cols-3"><p><strong className="text-foreground">1. 先看日期：</strong>只筛选未来或正在进行的窗口。</p><p><strong className="text-foreground">2. 再看类别：</strong>抄底、减仓和变盘不能混成一个信号。</p><p><strong className="text-foreground">3. 最后等确认：</strong>技术结构完成才行动，未完成就是等待。</p></div></Card>

      {(["BOTTOM_WATCH", "TOP_EXIT_WATCH", "TURNING_RISK"] as KeyDateAction[]).map((action) => {
        const meta = ACTION_META[action];
        const sectionItems = items.filter((item) => item.action === action && item.status !== "REVIEW");
        return <section key={action}><div className="mb-4"><Heading as="h2" size="h3" className={meta.tone}>{meta.title}</Heading><Text variant="body-sm" color="secondary" className="mt-1 block">{meta.subtitle}</Text></div><div className="grid gap-4 xl:grid-cols-2">{sectionItems.length ? sectionItems.map((item) => <EventCard key={item.id} item={item} />) : <Card padding="lg"><Text variant="body-sm" color="secondary">当前没有有效窗口，不为了填满页面强造日期。</Text></Card>}</div></section>;
      })}

      <details className="rounded-2xl border border-border/[0.09] bg-card/35 p-5"><summary className="cursor-pointer font-semibold">已发生关键日 · 留作复盘</summary><div className="mt-4 grid gap-4 xl:grid-cols-2">{items.filter((item) => item.status === "REVIEW").map((item) => <EventCard key={item.id} item={item} />)}</div></details>
    </div></Section></main></>
  );
}

