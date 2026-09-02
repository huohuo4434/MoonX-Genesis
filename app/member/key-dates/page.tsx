import type { Metadata } from "next";
import Link from "next/link";
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
import { MEMBER_SEPTEMBER_ROTATION_REPORT_20260826 as septemberReport } from "@/lib/data/member-september-rotation-report-20260826";
import { applyVerifiedGannKeyDateOverlay } from "@/lib/research/gann-prediction-overlay-core";
import { getVerifiedGannPredictionSignals } from "@/lib/research/gann-prediction-signals.server";
import { getGannForwardVerificationSnapshot } from "@/lib/research/gann-forward-verification.server";
import { summarizeGannForwardSnapshot } from "@/lib/research/gann-forward-verification-core";
import {
  RESEARCH_CONSENSUS_REVIEWS_20260830,
  type ResearchAlignment,
  type ResearchConfidenceDecision,
} from "@/lib/data/research-consensus-20260830";
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
  TOP_EXIT_WATCH: { short: "逃顶 / 减仓观察", tone: "text-rose-200" },
};

const SECTOR_GROUPS = [
  {
    id: "semiconductor",
    title: "半导体 / AI基础设施",
    assetIds: ["cxmt", "intel", "sandisk", "lite", "mu", "nbis", "nvda"],
    context: "板块周期背景：9月7日至10月7日相对转强，9月中下旬至10月初是高位候选区。板块背景不覆盖单股卦；单股与板块分歧时，同时展示并以单股对应周卦判断自身节奏。",
  },
  { id: "large-tech", title: "大型科技", assetIds: ["googl", "msft", "tsla", "meta", "tencent", "aapl", "amzn"] },
  { id: "space-growth", title: "太空与高波动成长", assetIds: ["asteroid", "spcx"] },
  { id: "crypto", title: "加密资产", assetIds: ["btc", "eth", "sol", "hype"] },
  { id: "china-focus", title: "A股重点关注", assetIds: ["ganfeng-lithium", "lian-tech", "lexin-medical", "kingsoft-office"] },
  { id: "metals-energy", title: "贵金属与能源", assetIds: ["gold", "silver", "wti-crude"] },
] as const;

const ASSET_CONTEXT: Partial<Record<string, string>> = {
  sandisk: "9月1日补录老师7月7日已发布的闪迪三个月专项原课后，正式发布V4：9月1—6日先释放压力，9月7日以后转入偏强阶段。8月29日V3水风井→雷泽归妹及旧周卦全部保留为分歧与复盘证据，不覆盖历史。",
  meta: "目前只收到META的9月月卦，没有独立周卦。页面中的周关键日明确由已锁定月卦拆分当周节奏，不冒充老师另起周卦。",
  aapl: "目前已录入苹果9月月卦与2026剩余年度卦，没有独立周卦。周关键日只按已锁定月卦拆分当周节奏，不冒充独立周卦。",
  amzn: "目前已录入亚马逊9月月卦与2026剩余年度卦，没有独立周卦。周关键日只按已锁定月卦拆分当周节奏，不冒充独立周卦。",
};

const RESEARCH_ALIGNMENT_META: Record<ResearchAlignment, { label: string; tone: string }> = {
  MULTI_METHOD_RESONANCE: { label: "多方法共振", tone: "border-emerald-300/25 bg-emerald-300/[0.06] text-emerald-100" },
  PARTIAL_ALIGNMENT: { label: "部分一致", tone: "border-sky-300/20 bg-sky-300/[0.05] text-sky-100" },
  CONFLICTED: { label: "路径冲突", tone: "border-rose-300/20 bg-rose-300/[0.05] text-rose-100" },
  SINGLE_SOURCE: { label: "单一来源", tone: "border-white/10 bg-white/[0.035] text-foreground-secondary" },
};

const CONFIDENCE_DECISION_META: Record<ResearchConfidenceDecision, string> = {
  UP_ONE: "信心上调 1 级",
  UNCHANGED: "信心不变",
  DOWN_ONE: "信心下调 1 级",
};

function chineseDate(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function statusLabel(item: KeyDateRadarViewItem) {
  return item.status === "ACTIVE" ? "今日" : item.status === "UPCOMING" ? "待观察" : "待复盘";
}

function LatestResearchConsensus() {
  return <section className="rounded-3xl border border-violet-300/15 bg-violet-300/[0.035] p-5 sm:p-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <Badge variant="warning">8月30日新增资料</Badge>
        <Heading as="h2" size="h3" className="mt-3">观点共振复核</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 block max-w-4xl">
          同资产、同周期、独立方法方向一致时才提高研究信心；只有大方向一致但精确日期不同，只作小幅加分；路径冲突时主动降级。共振不会改写已经锁定的正式方向，也不会单独触发自动交易。
        </Text>
      </div>
      <Badge variant="outline">{RESEARCH_CONSENSUS_REVIEWS_20260830.length} 个标的</Badge>
    </div>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      {RESEARCH_CONSENSUS_REVIEWS_20260830.map((review) => {
        const meta = RESEARCH_ALIGNMENT_META[review.alignment];
        return <article key={review.assetId} className={`rounded-2xl border p-4 ${meta.tone}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="font-semibold text-foreground">{review.assetName}</p><p className="mt-1 font-mono text-caption opacity-70">{review.symbol} · {review.horizon}</p></div>
            <div className="flex flex-wrap gap-2"><Badge variant="outline">{meta.label}</Badge><Badge variant="outline">{CONFIDENCE_DECISION_META[review.confidenceDecision]}</Badge></div>
          </div>
          <p className="mt-3 text-body-sm font-semibold leading-6 text-foreground">{review.conclusion}</p>
          <div className="mt-3 space-y-2 text-caption leading-5 text-foreground-secondary">
            <p><span className="font-semibold text-emerald-200">一致点：</span>{review.agreement}</p>
            <p><span className="font-semibold text-rose-200">保留项：</span>{review.disagreement}</p>
            <p><span className="font-semibold text-violet-200">交叉方法：</span>{review.methodClasses.join("、")}</p>
          </div>
        </article>;
      })}
    </div>
  </section>;
}

function turningMeta(item: KeyDateRadarViewItem): ActionDisplay {
  if (/周期收尾|跨月周期/.test(`${item.title}${item.derivation}`) || /多月卦阶段方向/.test(item.primaryView)) {
    return { short: "只观察 / 不操作", tone: "text-amber-200", explanation: "目前既不是抄底信号，也不是逃顶信号；等待新周期或价格结构给出方向。" };
  }
  if (/先跌后涨|探底回升/.test(item.primaryView)) {
    return { short: "只观察 / 等低点确认", tone: "text-amber-200", explanation: "周期结构偏向寻找低点，但本条证据尚不足以正式标成抄底日；等止跌与承接确认。" };
  }
  if (/先涨后跌|冲高回落/.test(item.primaryView)) {
    return { short: "只观察 / 等高点确认", tone: "text-amber-200", explanation: "周期结构偏向寻找高点，但本条证据尚不足以正式标成逃顶日；等冲高受阻与转弱确认。" };
  }
  if (/震荡上涨|：上涨/.test(item.primaryView)) {
    return { short: "趋势确认 / 不追单", tone: "text-amber-200", explanation: "方向偏多，但该日期没有明确高低点证据；它不是抄底日，也不是逃顶日。" };
  }
  if (/震荡下跌|：下跌/.test(item.primaryView)) {
    return { short: "趋势确认 / 不抢反弹", tone: "text-amber-200", explanation: "方向偏空，但该日期没有明确高低点证据；它不是抄底日，也不是逃顶日。" };
  }
  return { short: "只观察 / 不操作", tone: "text-amber-200", explanation: "方向尚未形成，既不抄底也不逃顶，等待K线完成定向。" };
}

function KeyDateActionOverview({ title, note, rows }: { title: string; note: string; rows: KeyDateRadarViewItem[] }) {
  const groups: Array<{ action: KeyDateAction; label: string; tone: string; empty: string }> = [
    { action: "BOTTOM_WATCH", label: "抄底观察", tone: "border-emerald-300/20 bg-emerald-300/[0.045] text-emerald-100", empty: "本期没有证据充分的抄底日" },
    { action: "TOP_EXIT_WATCH", label: "逃顶 / 减仓观察", tone: "border-rose-300/20 bg-rose-300/[0.045] text-rose-100", empty: "本期没有证据充分的逃顶日" },
    { action: "TURNING_RISK", label: "只观察 / 不操作", tone: "border-amber-300/20 bg-amber-300/[0.045] text-amber-100", empty: "本期没有仅观察日期" },
  ];
  return <section className="rounded-3xl border border-white/10 bg-black/20 p-5 sm:p-6">
    <Heading as="h2" size="h3">{title}</Heading>
    <Text variant="body-sm" color="secondary" className="mt-2 block">{note}</Text>
    <div className="mt-5 grid gap-4 xl:grid-cols-3">
      {groups.map((group) => {
        const items = rows.filter((item) => item.action === group.action)
          .sort((left, right) => left.focusDate.localeCompare(right.focusDate) || left.assetName.localeCompare(right.assetName, "zh-CN"));
        return <div key={group.action} className={`rounded-2xl border p-4 ${group.tone}`}>
          <div className="flex items-center justify-between gap-3"><p className="font-semibold">{group.label}</p><Badge variant="outline">{items.length}</Badge></div>
          <div className="mt-3 space-y-2">
            {items.length ? items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2 text-body-sm">
              <span className="font-semibold text-foreground">{item.assetName}</span>
              <span className="shrink-0 font-mono text-foreground-secondary">{chineseDate(item.focusDate)}</span>
            </div>) : <p className="text-caption leading-5 opacity-65">{group.empty}</p>}
          </div>
        </div>;
      })}
    </div>
  </section>;
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
      {item.consensusLevel && item.consensusNote ? <div className={`mt-3 rounded-xl border px-3 py-2 text-body-sm leading-6 ${RESEARCH_ALIGNMENT_META[item.consensusLevel].tone}`}>
        <span className="font-semibold">{RESEARCH_ALIGNMENT_META[item.consensusLevel].label}：</span>
        <span>{item.consensusNote}</span>
      </div> : null}
      {item.gann ? <div className={`mt-3 rounded-xl border px-3 py-3 text-body-sm leading-6 ${item.gann.status === "ALIGNED" ? "border-emerald-300/20 bg-emerald-300/[0.045]" : item.gann.status === "CONFLICTED" ? "border-rose-300/20 bg-rose-300/[0.045]" : "border-amber-300/20 bg-amber-300/[0.04]"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-foreground">江恩时间＋价格共振</span><Badge variant="outline">{item.gann.status === "ALIGNED" ? `同向 +${item.gann.appliedWeightPct}点` : item.gann.status === "CONFLICTED" ? `冲突 -${item.gann.appliedWeightPct}点` : item.gann.appliedWeightPct ? `时间 +${item.gann.appliedWeightPct}点` : "仅观察"}</Badge></div>
        <p className="mt-2 text-foreground-secondary">{item.gann.note}</p>
        <p className="mt-2 text-caption text-foreground-tertiary">时间窗：{item.gann.matchedWindows.join("、")}；支撑：{item.gann.supportLevels.slice(0, 6).join(" / ") || "未给出"}；压力/目标：{[...item.gann.resistanceLevels, ...item.gann.targetLevels].slice(0, 6).join(" / ") || "未给出"}</p>
        <div className="mt-2 flex flex-wrap gap-3">{item.gann.sourceUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="text-caption text-primary">原始时间戳 {index + 1} →</a>)}</div>
      </div> : null}
      <details className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2 text-body-sm">
        <summary className="cursor-pointer font-semibold text-foreground">查看路径、确认与失效条件</summary>
        <div className="mt-3 space-y-2 leading-6">
          <p><span className="font-semibold text-sky-200">路径：</span><span className="text-foreground-secondary">{item.weeklyAssist}</span></p>
          <p><span className="font-semibold text-emerald-200">确认：</span><span className="text-foreground-secondary">{item.confirmation}</span></p>
          <p><span className="font-semibold text-rose-200">失效：</span><span className="text-foreground-secondary">{item.invalidation}</span></p>
        </div>
      </details>
      {isMonth && (item.methodViews?.length ?? 0) >= 4 ? <details className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.025] px-3 py-2 text-body-sm">
        <summary className="cursor-pointer font-semibold text-amber-100">查看四种流派方法对比</summary>
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
        <p className="mt-2 text-caption leading-5 text-foreground-tertiary">月令六亲流派负责主判；动爻节奏、用神强弱、卦象取形三个流派作独立交叉复核。最终以易老师综合结论和后续K线确认条件为准。</p>
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
  const [gannSignals, gannForwardSnapshot] = await Promise.all([getVerifiedGannPredictionSignals(), getGannForwardVerificationSnapshot()]);
  const gannPolicy = summarizeGannForwardSnapshot(gannForwardSnapshot?.samples ?? []);
  const items = buildKeyDateRadar(applyVerifiedGannKeyDateOverlay(buildMemberKeyDateRadar(asOfDate), gannSignals, gannPolicy.effectiveWeightPct), asOfDate);
  const summary = summarizeKeyDateRadar(items);
  const agenda = splitCurrentKeyDateRadar(items);
  const currentItems = [...agenda.monthly, ...agenda.weekly];

  return (
    <><MemberDeviceHeartbeat /><main><Section spacing="lg"><div className="mx-auto w-full max-w-7xl space-y-10">
      <header className="rounded-3xl border border-violet-300/15 bg-[radial-gradient(circle_at_88%_0%,rgba(124,92,255,.2),transparent_34%),linear-gradient(145deg,#11101b,#090a0e)] p-6 sm:p-8">
        <div className="flex flex-wrap gap-2"><Badge variant="warning">会员关键日雷达</Badge><Badge variant="success">江恩前瞻权重 {gannPolicy.effectiveWeightPct}% · {gannPolicy.eligible ? "已达门槛" : `${gannPolicy.scored}/${gannPolicy.minimumSamples} 学习中`}</Badge></div>
        <Heading as="h1" size="h2" className="mt-4">月关键日＋周关键日</Heading>
        <Text variant="body" color="secondary" className="mt-3 block max-w-4xl">
          先看行动总览，再按板块和品种查看依据；同一品种的月关键日与周关键日放在一起。月关键日由月卦主判，周关键日细化当周节奏；证据不能确认高点或低点时明确写“只观察／不操作”，不再使用含糊标签。
        </Text>
        <Link href="/member/gann" className="mt-4 inline-flex rounded-full border border-amber-300/25 bg-amber-300/[.06] px-4 py-2 text-body-sm text-amber-100">查看江恩时间＋价格共振 →</Link>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
          ["覆盖标的", summary.assetCount],
          ["月关键日", summary.monthlyCount],
          ["周关键日", summary.weeklyCount],
          ["原记录明确 / 推演", `${summary.explicitCount} / ${summary.derivedCount}`],
        ].map(([label, value], index) => <div key={String(label)} className={`rounded-2xl border px-4 py-3 ${index === 1 ? "border-amber-300/25 bg-amber-300/[0.07]" : "border-white/10 bg-black/20"}`}><p className="text-caption text-foreground-tertiary">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div>
      </header>

      <LatestResearchConsensus />

      <section className="rounded-3xl border border-rose-300/20 bg-rose-300/[0.045] p-5 sm:p-6" data-global-risk-window-20260927>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2"><Badge variant="warning">月度奇门辅助时机</Badge><Badge variant="outline">不覆盖六爻主判</Badge></div>
          <span className="font-mono text-body-sm text-rose-100">9月21日—29日</span>
        </div>
        <Heading as="h2" size="h3" className="mt-3">9月27日前后 · 全市场风险中心候选</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 block max-w-5xl leading-6">
          {septemberReport.qimenMonthlyUpdate.riskWindow.noteZh} 该窗口与网站原有“中下旬偏弱、月底高波动”框架同向，但不把所有品种机械写成同一天见顶或下跌。
        </Text>
      </section>

      <KeyDateActionOverview title="月关键日行动总览" note="月卦优先。这里只把证据能够区分高点或低点的日期列为抄底、逃顶观察；其余日期明确保持不操作。" rows={agenda.monthly} />
      <KeyDateActionOverview title="周关键日行动总览" note="周卦用于细化本周节奏，不覆盖月度方向；缺少独立周卦时会明确标记为月卦当周推演。" rows={agenda.weekly} />

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
