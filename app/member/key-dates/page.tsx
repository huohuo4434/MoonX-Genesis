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

type ActionDisplay = { short: string; tone: string; explanation?: string };

const ACTION_META: Record<Exclude<KeyDateAction, "TURNING_RISK">, ActionDisplay> = {
  BOTTOM_WATCH: { short: "抄底观察", tone: "text-emerald-200" },
  TOP_EXIT_WATCH: { short: "逃顶 / 减仓", tone: "text-rose-200" },
};

const SECTOR_GROUPS = [
  {
    id: "semiconductor",
    title: "半导体 / AI基础设施",
    assetIds: ["cxmt", "intel", "sandisk", "lite", "mu", "nbis", "nvda"],
    context: "板块周期背景：9月7日至10月7日相对转强，9月中下旬至10月初是高位候选区。板块背景不覆盖单股卦；单股与板块分歧时，同时展示并以单股对应周卦判断自身节奏。",
  },
  { id: "large-tech", title: "大型科技", assetIds: ["googl", "msft", "tsla", "meta", "tencent"] },
  { id: "space-growth", title: "太空与高波动成长", assetIds: ["asteroid", "spcx"] },
  { id: "crypto", title: "加密资产", assetIds: ["btc", "eth", "sol", "hype"] },
  { id: "china-focus", title: "A股重点关注", assetIds: ["ganfeng-lithium", "lian-tech", "lexin-medical", "kingsoft-office"] },
  { id: "metals-energy", title: "贵金属与能源", assetIds: ["gold", "silver", "wti-crude"] },
] as const;

const ASSET_CONTEXT: Partial<Record<string, string>> = {
  sandisk: "8月29日新补的9月整月卦已发布为V3：水风井→雷泽归妹，主判先涨后跌；月初承接冲高后分歧，中段保留修复，19日后重新防承压，月底只观察止跌。旧V2和此前逐周拆分全部保留用于复盘，不覆盖历史。",
  meta: "目前只收到META的9月月卦，没有独立周卦。页面中的周关键日明确由已锁定月卦拆分当周节奏，不冒充老师另起周卦。",
  nvda: "目前只收到英伟达的9月月卦，没有独立周卦。页面中的周关键日明确由已锁定月卦拆分当周节奏，不冒充老师另起周卦。",
};

function chineseDate(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function statusLabel(item: KeyDateRadarViewItem) {
  return item.status === "ACTIVE" ? "今日" : item.status === "UPCOMING" ? "待观察" : "待复盘";
}

function turningMeta(item: KeyDateRadarViewItem): ActionDisplay {
  if (/周期收尾|跨月周期/.test(`${item.title}${item.derivation}`) || /多月卦阶段方向/.test(item.primaryView)) {
    return { short: "双向等待", tone: "text-amber-200", explanation: "目前既不是抄底信号，也不是逃顶信号；等待新周期或价格结构给出方向。" };
  }
  if (/先跌后涨|探底回升/.test(item.primaryView)) {
    return { short: "偏抄底确认", tone: "text-emerald-200", explanation: "当前偏向寻找低点，但只有出现止跌和承接确认后才进入抄底观察。" };
  }
  if (/先涨后跌|冲高回落/.test(item.primaryView)) {
    return { short: "偏逃顶确认", tone: "text-rose-200", explanation: "当前偏向寻找高点，但只有出现冲高受阻或转弱确认后才进入减仓观察。" };
  }
  if (/震荡上涨|：上涨/.test(item.primaryView)) {
    return { short: "偏多确认", tone: "text-emerald-200", explanation: "方向偏多，但这不是直接抄底；等待回踩止跌或延续结构确认。" };
  }
  if (/震荡下跌|：下跌/.test(item.primaryView)) {
    return { short: "偏空确认", tone: "text-rose-200", explanation: "方向偏空，但这不是直接逃顶；等待反弹受阻或下跌延续结构确认。" };
  }
  return { short: "双向等待", tone: "text-amber-200", explanation: "方向尚未形成，既不抄底也不逃顶，等待K线完成定向。" };
}

function KeyDateEntry({ item }: { item: KeyDateRadarViewItem }) {
  const action = item.action === "TURNING_RISK" ? turningMeta(item) : ACTION_META[item.action];
  const isMonth = item.level === "MONTH";
  const evidenceLabel = item.evidence === "EXPLICIT"
    ? "原记录明确"
    : /锁定路径/.test(item.derivation)
      ? "锁定路径日期"
      : "卦象结构推演";
  return (
    <article className={`rounded-2xl border p-4 ${isMonth ? "border-amber-300/25 bg-amber-300/[0.055]" : "border-sky-300/15 bg-sky-300/[0.035]"}`}>
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
      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className={`font-semibold ${action.tone}`}>{action.short}</span></div>
      {item.action === "TURNING_RISK" ? <p className="mt-1 text-caption leading-5 text-foreground-tertiary">{action.explanation}</p> : null}
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
      {isMonth && (item.methodViews?.length ?? 0) >= 4 ? <details className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.025] px-3 py-2 text-body-sm">
        <summary className="cursor-pointer font-semibold text-amber-100">查看四位老师方法对比</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {item.methodViews!.map((view) => <div key={view.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-foreground">{view.label}</p>
              <Badge variant="outline">{view.direction}</Badge>
            </div>
            <p className="mt-2 leading-6 text-foreground-secondary">{view.summary}</p>
          </div>)}
        </div>
        {item.finalSynthesis ? <div className="mt-3 rounded-xl border border-violet-300/15 bg-violet-300/[0.04] px-3 py-2 leading-6"><span className="font-semibold text-violet-200">最终取舍：</span><span className="text-foreground-secondary">{item.finalSynthesis}</span></div> : null}
        <p className="mt-2 text-caption leading-5 text-foreground-tertiary">丙午老师法负责主判；狼叔、万里、秋六爻只作独立交叉复核。最终以易老师综合结论和后续K线确认条件为准。</p>
      </details> : null}
    </article>
  );
}

function AssetKeyDateGroup({ assetId, rows }: { assetId: string; rows: KeyDateRadarViewItem[] }) {
  const first = rows[0];
  if (!first) return null;
  const monthly = rows.filter((item) => item.level === "MONTH");
  const weekly = rows.filter((item) => item.level === "WEEK");
  return <Card padding="lg" className="border-white/10 bg-black/20">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><Heading as="h3" size="h3">{first.assetName}</Heading><p className="mt-1 font-mono text-body-sm text-foreground-tertiary">{first.symbol}</p></div>
      <Badge variant="outline">月 {monthly.length} · 周 {weekly.length}</Badge>
    </div>
    {ASSET_CONTEXT[assetId] ? <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-body-sm leading-6 text-amber-50">{ASSET_CONTEXT[assetId]}</div> : null}
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <div><div className="mb-3 flex items-center gap-2"><Badge variant="warning">月关键日</Badge><span className="text-caption text-foreground-tertiary">第一优先级</span></div><div className="space-y-3">{monthly.map((item) => <KeyDateEntry key={item.id} item={item} />)}</div></div>
      <div><div className="mb-3 flex items-center gap-2"><Badge variant="outline">周关键日</Badge><span className="text-caption text-foreground-tertiary">节奏确认</span></div><div className="space-y-3">{weekly.map((item) => <KeyDateEntry key={item.id} item={item} />)}</div></div>
    </div>
  </Card>;
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
  const currentItems = [...agenda.monthly, ...agenda.weekly];

  return (
    <><MemberDeviceHeartbeat /><main><Section spacing="lg"><div className="mx-auto w-full max-w-7xl space-y-10">
      <header className="rounded-3xl border border-violet-300/15 bg-[radial-gradient(circle_at_88%_0%,rgba(124,92,255,.2),transparent_34%),linear-gradient(145deg,#11101b,#090a0e)] p-6 sm:p-8">
        <Badge variant="warning">会员关键日雷达</Badge>
        <Heading as="h1" size="h2" className="mt-4">月关键日＋周关键日</Heading>
        <Text variant="body" color="secondary" className="mt-3 block max-w-4xl">
          先按板块，再按品种查看；同一品种的月关键日与周关键日放在一起。月关键日由月卦主判，周关键日细化当周节奏；“偏抄底／偏逃顶确认”表示等待价格确认，不等于已经发出交易指令。
        </Text>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
          ["覆盖标的", summary.assetCount],
          ["月关键日", summary.monthlyCount],
          ["周关键日", summary.weeklyCount],
          ["原记录明确 / 推演", `${summary.explicitCount} / ${summary.derivedCount}`],
        ].map(([label, value], index) => <div key={String(label)} className={`rounded-2xl border px-4 py-3 ${index === 1 ? "border-amber-300/25 bg-amber-300/[0.07]" : "border-white/10 bg-black/20"}`}><p className="text-caption text-foreground-tertiary">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div>
      </header>

      {SECTOR_GROUPS.map((sector) => {
        const sectorItems = currentItems.filter((item) => (sector.assetIds as readonly string[]).includes(item.assetId));
        if (!sectorItems.length) return null;
        return <section key={sector.id}>
          <div className="mb-5">
            <Badge variant="outline">板块</Badge>
            <Heading as="h2" size="h2" className="mt-3">{sector.title}</Heading>
            {"context" in sector && sector.context ? <Text variant="body-sm" color="secondary" className="mt-2 block max-w-5xl">{sector.context}</Text> : null}
          </div>
          <div className="space-y-5">
            {sector.assetIds.map((assetId) => <AssetKeyDateGroup key={assetId} assetId={assetId} rows={sectorItems.filter((item) => item.assetId === assetId)} />)}
          </div>
        </section>;
      })}
    </div></Section></main></>
  );
}
