import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import {
  buildKeyDateRadar,
  splitCurrentKeyDateRadar,
  summarizeKeyDateRadar,
  type KeyDateAction,
  type KeyDateRadarViewItem,
} from "@/lib/data/key-date-radar-core";
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

const ACTION_META: Record<KeyDateAction, { title: string; short: string; subtitle: string; tone: string }> = {
  BOTTOM_WATCH: { title: "抄底观察", short: "抄底", subtitle: "只在下跌释放后等技术止跌，不做左侧盲猜。", tone: "text-emerald-200" },
  TOP_EXIT_WATCH: { title: "逃顶 / 减仓", short: "逃顶", subtitle: "优先保护已有利润；没有顶部结构，不按日期裸空。", tone: "text-rose-200" },
  TURNING_RISK: { title: "变盘 / 风险", short: "变盘", subtitle: "方向尚需行情确认，适合减仓位、缩杠杆、等突破。", tone: "text-amber-200" },
};

function chineseDate(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function dateLabel(item: KeyDateRadarViewItem) {
  return item.startDate === item.endDate ? chineseDate(item.startDate) : `${chineseDate(item.startDate)}—${chineseDate(item.endDate)}`;
}

function statusLabel(item: KeyDateRadarViewItem) {
  return item.status === "ACTIVE" ? "进行中" : item.status === "UPCOMING" ? "待观察" : "待复盘";
}

function AgendaCard({ item, level }: { item: KeyDateRadarViewItem; level: "MONTH_EXACT" | "MONTH_PATH" | "WEEK" }) {
  const action = ACTION_META[item.action];
  const isMonthlyExact = level === "MONTH_EXACT";
  const mainDate = item.focusDate ? chineseDate(item.focusDate) : dateLabel(item);
  const levelLabel = isMonthlyExact ? "月卦明确关键日" : level === "MONTH_PATH" ? "月路径窗口 · 非精确日" : "周卦关键日 / 窗口";
  return (
    <Card padding="lg" className={isMonthlyExact ? "border-amber-300/25 bg-amber-300/[0.055]" : "border-border/[0.09] bg-card/55"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`font-mono font-semibold ${isMonthlyExact ? "text-3xl text-amber-100" : "text-xl text-foreground"}`}>{mainDate}</p>
          {item.focusDate && item.startDate !== item.endDate ? <p className="mt-1 text-caption text-foreground-tertiary">容差窗口：{dateLabel(item)}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2"><Badge variant={item.status === "ACTIVE" ? "warning" : "outline"}>{statusLabel(item)}</Badge><Badge variant="outline">{levelLabel}</Badge></div>
      </div>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Heading as="h3" size="h3">{item.assetName} <span className="font-mono text-body-sm font-normal text-foreground-tertiary">{item.symbol}</span></Heading>
        <span className={action.tone}>{action.short}</span>
      </div>
      <p className="mt-2 font-semibold text-foreground">{item.title}</p>
      <p className="mt-3 text-body-sm leading-6 text-foreground-secondary">{isMonthlyExact ? item.primaryView : item.weeklyAssist}</p>
      <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2 text-body-sm"><span className="font-semibold text-emerald-200">到日后看：</span><span className="text-foreground-secondary">{item.confirmation}</span></div>
    </Card>
  );
}

function EventCard({ item }: { item: KeyDateRadarViewItem }) {
  const evidenceLabel = item.evidence === "MONTH_EXPLICIT" ? "月卦明确关键日" : item.evidence === "MONTH_PATH_DERIVED" ? "月路径推演" : "周卦辅助窗口";
  return (
    <Card padding="lg" className="border-border/[0.09] bg-card/55">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="font-mono text-caption text-foreground-tertiary">{item.focusDate ? `${chineseDate(item.focusDate)} · 窗口 ${dateLabel(item)}` : dateLabel(item)}</p><Heading as="h3" size="h3" className="mt-1">{item.assetName} <span className="font-mono text-body-sm font-normal text-foreground-tertiary">{item.symbol}</span></Heading></div>
        <div className="flex gap-2"><Badge variant={item.status === "ACTIVE" ? "warning" : "outline"}>{statusLabel(item)}</Badge><Badge variant="outline">{evidenceLabel}</Badge></div>
      </div>
      <p className="mt-4 text-lg font-semibold text-foreground">{item.title}</p>
      <dl className="mt-4 space-y-3 text-body-sm leading-6">
        <div><dt className="font-semibold text-violet-200">月度 / 阶段主判</dt><dd className="text-foreground-secondary">{item.primaryView}</dd></div>
        <div><dt className="font-semibold text-sky-200">周度辅助</dt><dd className="text-foreground-secondary">{item.weeklyAssist}</dd></div>
        <div><dt className="font-semibold text-emerald-200">行动确认</dt><dd className="text-foreground-secondary">{item.confirmation}</dd></div>
        <div><dt className="font-semibold text-rose-200">失效 / 不做</dt><dd className="text-foreground-secondary">{item.invalidation}</dd></div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-3 border-t border-border/[0.08] pt-3 text-caption text-foreground-tertiary"><span>参考信心 {item.confidence}%</span><span>证据 {item.sourceIds.length} 条</span><span>日期提醒 ≠ 自动下单</span></div>
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
  const agenda = splitCurrentKeyDateRadar(items);

  return (
    <><MemberDeviceHeartbeat /><main><Section spacing="lg"><div className="mx-auto w-full max-w-7xl space-y-9">
      <header className="rounded-3xl border border-violet-300/15 bg-[radial-gradient(circle_at_88%_0%,rgba(124,92,255,.2),transparent_34%),linear-gradient(145deg,#11101b,#090a0e)] p-6 sm:p-8">
        <Badge variant="warning">会员关键日雷达</Badge>
        <Heading as="h1" size="h2" className="mt-4">先看月关键日，再看周关键日</Heading>
        <Text variant="body" color="secondary" className="mt-3 block max-w-4xl">月卦明确到某一天时，该日为第一优先级；月卦只给路径时，仅展示窗口，不冒充精确日。周关键日用于细化当周节奏，最后仍由缠论与真实K线确认。</Text>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
          ["月关键日 · 最重要", summary.monthlyExactCount], ["月路径窗口", summary.monthlyPathCount], ["周关键日 / 窗口", summary.weeklyCount], ["覆盖品种", summary.assetCount],
        ].map(([label, value], index) => <div key={String(label)} className={`rounded-2xl border px-4 py-3 ${index === 0 ? "border-amber-300/25 bg-amber-300/[0.07]" : "border-white/10 bg-black/20"}`}><p className="text-caption text-foreground-tertiary">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div>
      </header>

      <section>
        <div className="mb-4"><Badge variant="warning">第一优先级</Badge><Heading as="h2" size="h2" className="mt-3 text-amber-100">月关键日 · 第一优先级</Heading><Text variant="body" color="secondary" className="mt-2 block">这里只放原始月卦或阶段记录明确点名的日期；大号日期就是需要记住的关键日。</Text></div>
        <div className="grid gap-4 xl:grid-cols-2">{agenda.monthlyExact.length ? agenda.monthlyExact.map((item) => <AgendaCard key={item.id} item={item} level="MONTH_EXACT" />) : <Card padding="lg"><Text variant="body-sm" color="secondary">当前没有来源明确的月关键日，不为了填满页面强造单日。</Text></Card>}</div>
      </section>

      <section>
        <div className="mb-4"><Heading as="h2" size="h3" className="text-violet-200">月路径窗口 · 次一级</Heading><Text variant="body-sm" color="secondary" className="mt-1 block">月卦只给前中后段路径时，保留明确起止窗口，但不把窗口中心包装成精确关键日。</Text></div>
        <div className="grid gap-4 xl:grid-cols-2">{agenda.monthlyPath.map((item) => <AgendaCard key={item.id} item={item} level="MONTH_PATH" />)}</div>
      </section>

      <section>
        <div className="mb-4"><Badge variant="outline">第二优先级</Badge><Heading as="h2" size="h2" className="mt-3 text-sky-100">周关键日 · 辅助</Heading><Text variant="body" color="secondary" className="mt-2 block">周卦关键日只辅助本周抄底、减仓与变盘节奏，不覆盖月卦主判。</Text></div>
        <div className="grid gap-4 xl:grid-cols-2">{agenda.weekly.length ? agenda.weekly.map((item) => <AgendaCard key={item.id} item={item} level="WEEK" />) : <Card padding="lg"><Text variant="body-sm" color="secondary">当前没有仍有效的周关键日。</Text></Card>}</div>
      </section>

      <details className="rounded-2xl border border-border/[0.09] bg-card/35 p-5">
        <summary className="cursor-pointer text-lg font-semibold">查看全部详细依据、缠论确认与失效条件</summary>
        <div className="mt-6 space-y-8">{(["BOTTOM_WATCH", "TOP_EXIT_WATCH", "TURNING_RISK"] as KeyDateAction[]).map((action) => {
          const meta = ACTION_META[action];
          const sectionItems = items.filter((item) => item.action === action && item.status !== "REVIEW");
          return <section key={action}><div className="mb-4"><Heading as="h2" size="h3" className={meta.tone}>{meta.title}</Heading><Text variant="body-sm" color="secondary" className="mt-1 block">{meta.subtitle}</Text></div><div className="grid gap-4 xl:grid-cols-2">{sectionItems.map((item) => <EventCard key={item.id} item={item} />)}</div></section>;
        })}</div>
      </details>

      <details className="rounded-2xl border border-border/[0.09] bg-card/35 p-5"><summary className="cursor-pointer font-semibold">已发生关键日 · 留作复盘</summary><div className="mt-4 grid gap-4 xl:grid-cols-2">{agenda.review.map((item) => <EventCard key={item.id} item={item} />)}</div></details>
    </div></Section></main></>
  );
}
