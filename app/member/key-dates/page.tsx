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
import { buildMemberKeyDateRadar } from "@/lib/data/member-key-date-radar";
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
    descriptionZh: "全部重点关注标的的月关键日与周关键日。",
    descriptionEn: "Monthly and weekly key dates for every focus asset.",
  });
}

const ACTION_META: Record<KeyDateAction, { short: string; tone: string }> = {
  BOTTOM_WATCH: { short: "抄底观察", tone: "text-emerald-200" },
  TOP_EXIT_WATCH: { short: "逃顶 / 减仓", tone: "text-rose-200" },
  TURNING_RISK: { short: "变盘确认", tone: "text-amber-200" },
};

function chineseDate(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function statusLabel(item: KeyDateRadarViewItem) {
  return item.status === "ACTIVE" ? "今日" : item.status === "UPCOMING" ? "待观察" : "待复盘";
}

function KeyDateCard({ item }: { item: KeyDateRadarViewItem }) {
  const action = ACTION_META[item.action];
  const isMonth = item.level === "MONTH";
  const evidenceLabel = item.evidence === "EXPLICIT"
    ? "原记录明确"
    : /锁定路径/.test(item.derivation)
      ? "锁定路径日期"
      : "卦象结构推演";
  return (
    <Card padding="lg" className={isMonth ? "border-amber-300/25 bg-amber-300/[0.055]" : "border-sky-300/15 bg-sky-300/[0.035]"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`font-mono text-3xl font-semibold ${isMonth ? "text-amber-100" : "text-sky-100"}`}>{chineseDate(item.focusDate)}</p>
          <p className="mt-1 text-caption text-foreground-tertiary">{item.ganzhi}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={item.status === "ACTIVE" ? "warning" : "outline"}>{statusLabel(item)}</Badge>
          <Badge variant="outline">{evidenceLabel}</Badge>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Heading as="h3" size="h3">{item.assetName} <span className="font-mono text-body-sm font-normal text-foreground-tertiary">{item.symbol}</span></Heading>
        <span className={action.tone}>{action.short}</span>
      </div>
      <p className="mt-2 font-semibold text-foreground">{item.title}</p>
      <p className="mt-3 text-body-sm leading-6 text-foreground-secondary">{item.primaryView}</p>
      <div className="mt-4 rounded-xl border border-violet-300/10 bg-violet-300/[0.035] px-3 py-2 text-body-sm">
        <span className="font-semibold text-violet-200">日期依据：</span>
        <span className="text-foreground-secondary">{item.derivation}</span>
      </div>
      <details className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2 text-body-sm">
        <summary className="cursor-pointer font-semibold text-foreground">查看路径、确认与失效条件</summary>
        <div className="mt-3 space-y-2 leading-6">
          <p><span className="font-semibold text-sky-200">路径：</span><span className="text-foreground-secondary">{item.weeklyAssist}</span></p>
          <p><span className="font-semibold text-emerald-200">确认：</span><span className="text-foreground-secondary">{item.confirmation}</span></p>
          <p><span className="font-semibold text-rose-200">失效：</span><span className="text-foreground-secondary">{item.invalidation}</span></p>
        </div>
      </details>
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
  const items = buildKeyDateRadar(buildMemberKeyDateRadar(asOfDate), asOfDate);
  const summary = summarizeKeyDateRadar(items);
  const agenda = splitCurrentKeyDateRadar(items);

  return (
    <><MemberDeviceHeartbeat /><main><Section spacing="lg"><div className="mx-auto w-full max-w-7xl space-y-10">
      <header className="rounded-3xl border border-violet-300/15 bg-[radial-gradient(circle_at_88%_0%,rgba(124,92,255,.2),transparent_34%),linear-gradient(145deg,#11101b,#090a0e)] p-6 sm:p-8">
        <Badge variant="warning">会员关键日雷达</Badge>
        <Heading as="h1" size="h2" className="mt-4">月关键日＋周关键日</Heading>
        <Text variant="body" color="secondary" className="mt-3 block max-w-4xl">
          覆盖网站全部重点关注标的。月关键日由月卦主判，周关键日细化当周转折；原记录明确点名或锁定路径已经写明的日期边界优先，其余日期才按已锁定卦象的先后结构、固定周期位置和记录中已有地支线索推演。所有日期都必须再由真实K线确认。
        </Text>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
          ["覆盖标的", summary.assetCount],
          ["月关键日", summary.monthlyCount],
          ["周关键日", summary.weeklyCount],
          ["原记录明确 / 推演", `${summary.explicitCount} / ${summary.derivedCount}`],
        ].map(([label, value], index) => <div key={String(label)} className={`rounded-2xl border px-4 py-3 ${index === 1 ? "border-amber-300/25 bg-amber-300/[0.07]" : "border-white/10 bg-black/20"}`}><p className="text-caption text-foreground-tertiary">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div>
      </header>

      <section>
        <div className="mb-4">
          <Badge variant="warning">第一优先级</Badge>
          <Heading as="h2" size="h2" className="mt-3 text-amber-100">月关键日</Heading>
          <Text variant="body" color="secondary" className="mt-2 block">每个重点关注标的都有具体日期；不再单列“月路径窗口”。</Text>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">{agenda.monthly.map((item) => <KeyDateCard key={item.id} item={item} />)}</div>
      </section>

      <section>
        <div className="mb-4">
          <Badge variant="outline">第二优先级</Badge>
          <Heading as="h2" size="h2" className="mt-3 text-sky-100">周关键日</Heading>
          <Text variant="body" color="secondary" className="mt-2 block">周卦用于确认本周抄底、减仓或变盘节奏，不覆盖月卦主判。</Text>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">{agenda.weekly.map((item) => <KeyDateCard key={item.id} item={item} />)}</div>
      </section>
    </div></Section></main></>
  );
}
