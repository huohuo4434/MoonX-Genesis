import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { WeeklyRollingVerificationPanel } from "@/components/member/WeeklyRollingVerificationPanel";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { getWeeklyRollingVerification } from "@/lib/accuracy/get-weekly-rolling-verification";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildWeeklyMarketSlots } from "@/lib/data/weekly-analysis";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { getMemberWeeklyReviewPayload } from "@/lib/member-review/weekly-review-access";
import type { MemberWeeklyReviewItem } from "@/lib/member-review/weekly-review-report";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/weekly-review";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({ locale, basePath: path, titleZh: "周预测复盘 | MOOX Intelligence", titleEn: "Weekly Forecast Review | MOOX Intelligence", descriptionZh: "以锁定周卦为最小正式样本，复盘整周方向、路径、卦象解读问题和下一周改进规则。", descriptionEn: "Member weekly review of locked direction, path, interpretation issues and forward rules." });
}

function badgeVariant(status: MemberWeeklyReviewItem["status"]): "success" | "warning" | "danger" | "outline" | "neutral" {
  if (status === "FULL_HIT") return "success";
  if (status === "PARTIAL_HIT") return "warning";
  if (status === "MISS") return "danger";
  if (status === "UNVERIFIABLE") return "neutral";
  return "outline";
}

function WeeklyReviewCard({ item }: { item: MemberWeeklyReviewItem }) {
  return <Card padding="lg" className="border-border/[0.09] bg-card/55">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{item.assetName} <span className="font-mono text-caption font-normal text-foreground-tertiary">{item.symbol}</span></p><p className="mt-1 text-caption text-foreground-tertiary">{item.weekStart}—{item.weekEnd}</p></div><div className="flex items-center gap-2">{item.score != null ? <span className="font-mono text-lg font-semibold">{item.score}分</span> : null}<Badge variant={badgeVariant(item.status)}>{item.statusLabel}</Badge></div></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-border/[0.08] bg-background/30 p-4"><p className="text-caption text-foreground-tertiary">锁定周预测</p><p className="mt-1 text-lg font-semibold text-primary">{item.predictedPattern}</p>{item.weeklyPath ? <p className="mt-2 text-body-sm leading-6 text-foreground-secondary">{item.weeklyPath}</p> : null}</div><div className="rounded-xl border border-border/[0.08] bg-background/30 p-4"><p className="text-caption text-foreground-tertiary">实际整周走势</p><p className="mt-1 text-lg font-semibold">{item.actualPattern ?? "等待整周验证"}</p>{item.hexagram ? <p className="mt-2 text-body-sm text-foreground-secondary">卦象：{item.hexagram}</p> : <p className="mt-2 text-body-sm text-foreground-tertiary">原记录未携带完整卦象结构</p>}</div></div>
    <div className={`mt-4 rounded-xl border p-4 ${item.status === "MISS" || item.status === "PARTIAL_HIT" ? "border-amber-300/20 bg-amber-300/[.055]" : "border-emerald-300/12 bg-emerald-300/[.035]"}`}><div className="grid gap-4 text-body-sm leading-6 md:grid-cols-2"><div><p className="font-semibold text-foreground">已确认的问题</p><p className="mt-1 text-foreground-secondary">{item.confirmedProblem}</p></div><div><p className="font-semibold text-foreground">卦象／解读定位</p><p className="mt-1 text-foreground-secondary">{item.interpretationFinding}</p></div><div><p className="font-semibold text-foreground">已经形成的改进</p><p className="mt-1 text-foreground-secondary">{item.correctionAction}</p></div><div><p className="font-semibold text-foreground">下一周执行规则</p><p className="mt-1 text-foreground-secondary">{item.nextRule}</p></div></div></div>
    {item.dailyEvidence.length ? <details className="mt-4 rounded-xl border border-border/[0.08] px-4 py-3"><summary className="cursor-pointer text-body-sm font-semibold">展开周内每日路径证据（辅助）</summary><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{item.dailyEvidence.map((day) => <div key={`${item.id}-${day.date}`} className="rounded-lg bg-background/30 px-3 py-2 text-caption"><p className="font-semibold">{day.date} · {day.status}</p><p className="mt-1 text-foreground-secondary">预测 {day.forecast}｜实际 {day.actual ?? "待验证"}</p></div>)}</div></details> : null}
  </Card>;
}

export default async function MemberWeeklyReviewPage() {
  noStore();
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED") redirect(`/login?next=${encodeURIComponent(path)}`);
  if (gate.status === "MEMBERSHIP_REQUIRED") redirect("/pricing");
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  const now = new Date();
  const [payload, rolling] = await Promise.all([getMemberWeeklyReviewPayload(now), getWeeklyRollingVerification(buildWeeklyMarketSlots(now), now)]);
  return <><MemberDeviceHeartbeat /><main><Section spacing="lg"><div className="mx-auto w-full max-w-6xl space-y-8">
    <header className="rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_90%_0%,rgba(34,211,238,.12),transparent_35%),linear-gradient(145deg,#0d1518,#090a0e)] p-6 sm:p-8"><Badge variant="info">会员周预测复盘</Badge><Heading as="h1" size="h2" className="mt-4">先判断周卦是否兑现，再看每天为什么偏离</Heading><Text variant="body" color="secondary" className="mt-3 block max-w-4xl">周卦是最小正式预测样本。整周结束后确认方向和路径是否兑现；每日涨跌只作为周内阶段、关键日和时点解读的辅助证据，不单独计算卦象成绩。</Text><div className="mt-4 flex flex-wrap gap-2"><Badge variant="success">周样本 {payload.stats.sampleSize}</Badge><Badge variant="outline">完全 {payload.stats.full}</Badge><Badge variant="warning">部分 {payload.stats.partial}</Badge><Badge variant="danger">未中 {payload.stats.miss}</Badge>{payload.stats.weightedAccuracyPct != null ? <Badge variant="info">加权准确率 {payload.stats.weightedAccuracyPct}%</Badge> : null}</div></header>
    {rolling.length ? <section><div className="mb-3"><Heading as="h2" size="h3">本周进行中：只预警，不定案</Heading><Text variant="body-sm" color="secondary" className="mt-1 block">已经发生的交易日用于观察周路径是否开始偏离；完整周线结束前不判周卦对错。</Text></div><WeeklyRollingVerificationPanel reports={rolling} /></section> : null}
    {payload.reports.length ? payload.reports.map((report, index) => <section key={`${report.weekStart}-${report.weekEnd}`} className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><Heading as="h2" size="h3">{report.weekStart}—{report.weekEnd} 周复盘</Heading><Text variant="body-sm" color="secondary" className="mt-1 block">{report.headline}</Text></div>{report.problemsFound ? <Badge variant="warning">需改进 {report.problemsFound}</Badge> : <Badge variant="success">未发现方向性问题</Badge>}</div>{index > 0 ? <details className="rounded-2xl border border-border/[0.09] bg-card/30 p-4"><summary className="cursor-pointer text-body-sm font-semibold">展开这一周的 {report.items.length} 项正式复盘</summary><div className="mt-4 grid gap-4">{report.items.map((item) => <WeeklyReviewCard key={item.id} item={item} />)}</div></details> : <div className="grid gap-4">{report.items.map((item) => <WeeklyReviewCard key={item.id} item={item} />)}</div>}</section>) : <Card padding="lg"><Heading as="h2" size="h3">周复盘样本正在建立</Heading><Text variant="body-sm" color="secondary" className="mt-2 block">只有完整周线结束并取得可靠行情后，才生成正式周复盘。</Text></Card>}
    <div className="flex flex-wrap gap-3"><Link href="/member/weekly" className="rounded-full border border-primary/25 px-4 py-2 text-body-sm text-primary">周走势预测</Link><Link href="/member/sector-resonance" className="rounded-full border border-primary/25 px-4 py-2 text-body-sm text-primary">板块共振</Link><Link href="/verification" className="rounded-full border border-border/20 px-4 py-2 text-body-sm text-foreground-secondary">公开验证</Link></div>
  </div></Section></main></>;
}
