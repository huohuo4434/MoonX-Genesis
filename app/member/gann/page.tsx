import type { Metadata } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { GANN_AUDIT_SAMPLES, GANN_RESEARCH_AUDIT, summarizeGannAudit, type GannAuditVerdict } from "@/lib/data/gann-research-audit-20260902";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { VERIFIED_GANN_RESEARCH_WEIGHT_PCT } from "@/lib/research/gann-prediction-overlay-core";
import { getVerifiedGannPredictionSignals } from "@/lib/research/gann-prediction-signals.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/gann";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "江恩时间价格体系 | MOOX Intelligence",
    titleEn: "Gann Time-Price Research | MOOX Intelligence",
    descriptionZh: "用前瞻锁定样本验证江恩时间窗、价格位与玄学关键日的共振。",
    descriptionEn: "Forward-locked verification of Gann time windows, price levels and cycle-date resonance.",
  });
}

const verdictMeta: Record<GannAuditVerdict, { label: string; variant: "success" | "warning" | "danger" }> = {
  FULL: { label: "完整", variant: "success" },
  PARTIAL: { label: "部分", variant: "warning" },
  MISS: { label: "失败", variant: "danger" },
};

export default async function MemberGannPage() {
  noStore();
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED") redirect(`/login?next=${encodeURIComponent(path)}`);
  if (gate.status === "MEMBERSHIP_REQUIRED") redirect("/pricing");
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;

  const summary = summarizeGannAudit();
  const currentSignals = await getVerifiedGannPredictionSignals();
  return <><MemberDeviceHeartbeat /><main><Section spacing="lg"><div className="mx-auto w-full max-w-7xl space-y-8">
    <header className="rounded-3xl border border-amber-300/20 bg-[radial-gradient(circle_at_88%_0%,rgba(251,191,36,.16),transparent_34%),linear-gradient(145deg,#15120b,#090a0e)] p-6 sm:p-8">
      <div className="flex flex-wrap gap-2"><Badge variant="warning">江恩时间＋价格研究</Badge><Badge variant="success">预测研究层 {VERIFIED_GANN_RESEARCH_WEIGHT_PCT}% 已接入</Badge></div>
      <Heading as="h1" size="h2" className="mt-4">可以采用，但只给可验证部分权重</Heading>
      <Text variant="body" color="secondary" className="mt-3 block max-w-4xl">近6个月严格复盘后，江恩最有价值的是明确时间窗、动态支撑压力和价格目标。当前给予定量研究权重 {GANN_RESEARCH_AUDIT.recommendedResearchWeightPct}%：用于提高关键日与点位信心，不单独改写已锁定周方向，也不绕过仓位、止损和保护单门禁。</Text>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[
        ["抓取原帖", GANN_RESEARCH_AUDIT.collectedPosts],
        ["江恩相关", GANN_RESEARCH_AUDIT.gannRelatedPosts],
        ["独立样本", summary.sampleSize],
        ["完整 / 部分 / 失败", `${summary.full} / ${summary.partial} / ${summary.miss}`],
        ["加权准确度", `${summary.weightedAccuracyPct}%`],
      ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"><p className="text-caption text-foreground-tertiary">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div>
    </header>

    <section className="grid gap-4 lg:grid-cols-3">
      <Card padding="lg"><Badge variant="success">保留</Badge><Heading as="h2" size="h3" className="mt-3">江恩价格结构</Heading><Text variant="body-sm" color="secondary" className="mt-2 block">固定锚点、高低点、角度线编号、价格区间和失效条件必须随预测版本一起保存。</Text></Card>
      <Card padding="lg"><Badge variant="info">共振</Badge><Heading as="h2" size="h3" className="mt-3">玄学关键日</Heading><Text variant="body-sm" color="secondary" className="mt-2 block">月、周关键日与江恩时间窗重叠时提高“时间信心”；二者方向冲突时只标观察，不机械抄底或逃顶。</Text></Card>
      <Card padding="lg"><Badge variant="warning">确认</Badge><Heading as="h2" size="h3" className="mt-3">闭合 K 线</Heading><Text variant="body-sm" color="secondary" className="mt-2 block">价格到窗后等待日线、周线或缠论结构确认。没有到价、没有触发或没有闭合 K 线，不记命中、不产生交易权限。</Text></Card>
    </section>

    <section className="rounded-3xl border border-emerald-300/15 bg-emerald-300/[.035] p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><Heading as="h2" size="h3">近期合格江恩记录</Heading><Text variant="body-sm" color="secondary" className="mt-2 block">只读取采集库最近45天内、单一标的且带明确时间窗或价位的合格记录；其中只有仍与未来月／周关键日重叠的记录才会最多增加3点研究信心。</Text></div><Badge variant="outline">{currentSignals.length} 条合格记录</Badge></div>
      {currentSignals.length ? <div className="mt-5 grid gap-3 lg:grid-cols-2">{currentSignals.slice(0, 8).map((signal) => <article key={signal.postId} className="rounded-2xl border border-white/[.08] bg-black/20 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{signal.symbol.replace(/USDT$/, "")}</p><Badge variant="outline">{signal.direction === "LONG" ? "偏多" : signal.direction === "SHORT" ? "偏空" : "条件式"}</Badge></div><p className="mt-2 text-body-sm leading-6 text-foreground-secondary">{signal.summary}</p><p className="mt-2 text-caption text-foreground-tertiary">时间窗：{signal.timeWindows.join("、") || "未给出"}；关键价位：{Array.from(new Set([...signal.supportLevels, ...signal.resistanceLevels, ...signal.targetLevels, ...signal.invalidationLevels])).join(" / ") || "未给出"}</p><a className="mt-3 inline-flex text-caption text-primary" href={signal.postUrl} target="_blank" rel="noreferrer">查看原始时间戳 →</a></article>)}</div> : <p className="mt-4 rounded-2xl border border-white/[.08] bg-black/20 p-4 text-body-sm text-foreground-secondary">当前采集库没有满足条件的近期江恩记录，因此不加权；系统保持原预测，不拿历史成绩代替当前信号。</p>}
    </section>

    <section className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[.035] p-5 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-2"><div><Heading as="h2" size="h3">这套方法到底在做什么</Heading><div className="mt-4 space-y-2">{GANN_RESEARCH_AUDIT.strengths.map((item) => <p key={item} className="text-body-sm leading-6 text-foreground-secondary">✓ {item}</p>)}</div></div><div><Heading as="h2" size="h3">必须防止的偏差</Heading><div className="mt-4 space-y-2">{GANN_RESEARCH_AUDIT.weaknesses.map((item) => <p key={item} className="text-body-sm leading-6 text-foreground-secondary">• {item}</p>)}</div></div></div>
    </section>

    <section><div className="mb-4"><Heading as="h2" size="h3">近6个月独立样本复盘</Heading><Text variant="body-sm" color="secondary" className="mt-2 block">扫描期 {GANN_RESEARCH_AUDIT.period}。{GANN_RESEARCH_AUDIT.retrospectivePosts} 条带明显事后复盘措辞的记录不直接当成绩；同一预测的重复展示只保留最早可核验版本。</Text></div><div className="grid gap-4 lg:grid-cols-2">{GANN_AUDIT_SAMPLES.map((sample) => { const meta = verdictMeta[sample.verdict]; return <Card key={sample.id} padding="lg" className="border-border/[.09] bg-card/45"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{sample.asset} · {sample.publishedDate}</p><p className="mt-1 font-mono text-caption text-foreground-tertiary">{sample.dimension}</p></div><Badge variant={meta.variant}>{meta.label}</Badge></div><p className="mt-4 text-body-sm leading-6 text-foreground-secondary"><b className="text-foreground">前瞻：</b>{sample.forecast}</p><p className="mt-2 text-body-sm leading-6 text-foreground-secondary"><b className="text-foreground">实际：</b>{sample.outcome}</p><a className="mt-3 inline-flex text-caption text-primary" href={sample.sourceUrl} target="_blank" rel="noreferrer">查看原始时间戳 →</a></Card>; })}</div></section>

    <section className="rounded-3xl border border-violet-300/15 bg-violet-300/[.035] p-5 sm:p-6"><Heading as="h2" size="h3">以后如何进入 MOOX 预测</Heading><div className="mt-4 grid gap-3 md:grid-cols-4">{[
      ["1. 前瞻锁定", "保存原帖、发布时间、锚点、时间窗、价位和失效条件。"],
      ["2. 周期共振", "与月卦、周卦关键日对齐，只提高择时信心，不偷换正式方向。"],
      ["3. 到点确认", "拉取完整闭合 K 线，再用缠论确认结构是否完成。"],
      ["4. 独立复盘", "到期自动评分，完整、部分、失败和未触发全部保留。"],
    ].map(([title, body]) => <div key={title} className="rounded-2xl border border-white/[.08] bg-black/20 p-4"><p className="font-semibold">{title}</p><p className="mt-2 text-body-sm leading-6 text-foreground-secondary">{body}</p></div>)}</div><Text variant="caption" color="tertiary" className="mt-4 block">当前 3% 是研究层权重，不是胜率承诺，也不是下单比例。未来只有新增前瞻样本继续达标才保留或上调；表现下降会自动降权。</Text></section>

    <div className="flex flex-wrap gap-3"><Link href="/member/key-dates" className="rounded-full border border-amber-300/25 px-4 py-2 text-body-sm text-amber-100">查看月＋周关键日</Link><Link href="/member/technical-methods" className="rounded-full border border-cyan-300/20 px-4 py-2 text-body-sm text-cyan-100">查看缠论位置</Link><Link href="/member/weekly-review" className="rounded-full border border-border/20 px-4 py-2 text-body-sm text-foreground-secondary">查看周复盘</Link></div>
  </div></Section></main></>;
}
