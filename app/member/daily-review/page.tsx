import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { getMemberDailyReviewReports } from "@/lib/member-review/daily-review-access";
import type { MemberDailyReviewItem, MemberReviewCategory } from "@/lib/member-review/daily-review-report";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/daily-review";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "每日预测复盘 | MOOX Intelligence",
    titleEn: "Daily Forecast Review | MOOX Intelligence",
    descriptionZh: "会员专享：逐日对照锁定周卦派生预测、真实走势、偏差原因、改进与待补材料。",
    descriptionEn: "Member-only daily review of locked forecasts, realised moves, deviations, lessons and evidence gaps.",
  });
}

const CATEGORY_LABELS: Record<MemberReviewCategory, string> = {
  INDEX: "指数",
  EQUITY: "个股",
  CRYPTO: "加密货币",
  COMMODITY: "商品",
};

function badgeVariant(status: MemberDailyReviewItem["status"]): "success" | "warning" | "danger" | "outline" | "neutral" {
  if (status === "FULL_HIT") return "success";
  if (status === "PARTIAL_HIT") return "warning";
  if (status === "MISS") return "danger";
  if (status === "UNVERIFIABLE") return "neutral";
  return "outline";
}

function fmt(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 4 }).format(value);
}

function ItemCard({ item }: { item: MemberDailyReviewItem }) {
  const sourceWindow = item.weeklySource.periodStart && item.weeklySource.periodEnd
    ? `${item.weeklySource.periodStart}—${item.weeklySource.periodEnd}`
    : "本周来源窗口待补齐";
  const hexagram = item.weeklySource.primaryHexagram
    ? `${item.weeklySource.primaryHexagram}${item.weeklySource.changedHexagram ? ` → ${item.weeklySource.changedHexagram}` : ""}`
    : "原锁定记录暂未携带完整卦名";
  return (
    <Card padding="lg" className="border-border/[0.09] bg-card/55">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{CATEGORY_LABELS[item.category]}</Badge><span className="font-mono text-caption text-foreground-tertiary">{item.symbol}</span>{item.supplementStatus === "UPDATED" ? <Badge variant="info">有新补充</Badge> : null}</div>
          <Heading as="h3" size="h3" className="mt-2">{item.assetName}</Heading>
        </div>
        <Badge variant={badgeVariant(item.status)}>{item.statusLabel}</Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/[0.08] bg-background/30 p-4">
          <p className="text-caption text-foreground-tertiary">锁定预测</p>
          <p className="mt-1 text-lg font-semibold text-primary">{item.forecast.pattern}</p>
          <p className="mt-2 text-body-sm leading-6 text-foreground-secondary">{item.forecast.summary || item.forecast.expectedPath[0] || "原预测只锁定了方向。"}</p>
        </div>
        <div className="rounded-xl border border-border/[0.08] bg-background/30 p-4">
          <p className="text-caption text-foreground-tertiary">实际走势</p>
          <p className="mt-1 text-lg font-semibold">{item.actual.pattern ?? "等待验证"}{item.actual.returnPct != null ? ` · ${item.actual.returnPct >= 0 ? "+" : ""}${item.actual.returnPct.toFixed(2)}%` : ""}</p>
          <p className="mt-2 text-body-sm text-foreground-secondary">开 {fmt(item.actual.open)}　高 {fmt(item.actual.high)}　低 {fmt(item.actual.low)}　收 {fmt(item.actual.close)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-violet-300/10 bg-violet-300/[.035] p-4">
        <p className="text-caption text-violet-100/55">当周卦象与来源</p>
        <p className="mt-1 font-semibold text-violet-100/90">{hexagram}</p>
        <p className="mt-1 text-body-sm text-violet-100/60">{sourceWindow}{item.weeklySource.weeklyDirection ? ` · 周方向 ${item.weeklySource.weeklyDirection}` : ""}</p>
        {item.weeklySource.interpretation ? <p className="mt-2 text-body-sm leading-6 text-foreground-secondary">{item.weeklySource.interpretation}</p> : null}
      </div>

      <details className="mt-4 rounded-xl border border-border/[0.08] px-4 py-3 open:bg-background/20">
        <summary className="cursor-pointer text-body-sm font-semibold text-foreground">查看偏差原因与改进</summary>
        <div className="mt-4 space-y-4 text-body-sm leading-6 text-foreground-secondary">
          <div><p className="text-caption text-foreground-tertiary">为什么有偏差</p><p>{item.diagnosis}</p></div>
          <div><p className="text-caption text-foreground-tertiary">以后怎么改进</p><p>{item.improvement}</p></div>
          <div><p className="text-caption text-foreground-tertiary">下一次提醒</p><p>{item.futureCaution}</p></div>
        </div>
      </details>

      {item.supplementLabel ? (
        <div className={`mt-4 rounded-xl border px-4 py-3 text-body-sm ${item.supplementStatus === "UPDATED" ? "border-cyan-300/15 bg-cyan-300/[.04] text-cyan-100/75" : "border-amber-300/15 bg-amber-300/[.04] text-amber-100/75"}`}>
          <p className="font-semibold">{item.supplementLabel}</p>
          {item.supplementRequest ? <p className="mt-1 leading-6">{item.supplementRequest}</p> : null}
        </div>
      ) : null}
    </Card>
  );
}

export default async function MemberDailyReviewPage() {
  noStore();
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED") redirect(`/login?next=${encodeURIComponent(path)}`);
  if (gate.status === "MEMBERSHIP_REQUIRED") redirect("/pricing");
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;

  const { reports, coverage } = await getMemberDailyReviewReports();
  const latest = reports[0] ?? null;
  const coverageExceptions = coverage.filter((item) => item.status !== "AUTO");
  const coverageAuto = coverage.filter((item) => item.status === "AUTO").length;
  return (
    <>
      <MemberDeviceHeartbeat />
      <main>
        <Section spacing="lg">
          <div className="mx-auto w-full max-w-6xl space-y-8">
            <header className="rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_90%_0%,rgba(34,211,238,.12),transparent_35%),linear-gradient(145deg,#0d1518,#090a0e)] p-6 sm:p-8">
              <Badge variant="info">会员每日复盘</Badge>
              <Heading as="h1" size="h2" className="mt-4">先看预测有没有兑现</Heading>
              <Text variant="body" color="secondary" className="mt-3 block max-w-3xl">原预测锁定不改；市场收盘后自动核对真实走势，再解释偏差、记录改进和需要补充的下一周期材料。</Text>
              {latest ? <p className="mt-4 text-lg font-semibold text-foreground">{latest.date}｜{latest.headline}</p> : <p className="mt-4 text-body-sm text-foreground-secondary">验证样本正在生成，空白不会被填成命中。</p>}
              {latest ? <div className="mt-4 flex flex-wrap gap-2 text-caption"><Badge variant="success">完全 {latest.summary.full}</Badge><Badge variant="warning">部分 {latest.summary.partial}</Badge><Badge variant="danger">未中 {latest.summary.miss}</Badge><Badge variant="outline">待验证 {latest.summary.waiting}</Badge>{latest.summary.supplementsNeeded ? <Badge variant="warning">待补 {latest.summary.supplementsNeeded}</Badge> : null}{latest.summary.updates ? <Badge variant="info">新补充 {latest.summary.updates}</Badge> : null}</div> : null}
            </header>

            <section className="rounded-2xl border border-border/[0.09] bg-card/35 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3"><div><Heading as="h2" size="h3">复盘覆盖状态</Heading><Text variant="body-sm" color="secondary" className="mt-1 block">已接通 {coverageAuto}/{coverage.length} 个重点标的；未接通项不会从报告里静默消失。</Text></div>{coverageExceptions.length ? <Badge variant="warning">待处理 {coverageExceptions.length}</Badge> : <Badge variant="success">全部接通</Badge>}</div>
              {coverageExceptions.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{coverageExceptions.map((item) => <div key={item.assetId} className="rounded-xl border border-amber-300/12 bg-amber-300/[.035] px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{item.assetName} <span className="font-mono text-caption text-foreground-tertiary">{item.symbol}</span></p><Badge variant={item.status === "NEEDS_SOURCE" ? "warning" : item.status === "MANUAL_ACTUAL" ? "neutral" : "info"}>{item.label}</Badge></div><p className="mt-2 text-body-sm leading-6 text-foreground-secondary">{item.detail}</p></div>)}</div> : null}
            </section>

            {reports.length ? reports.map((report, reportIndex) => (
              <section key={report.date} className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div><Heading as="h2" size="h3">{report.date} 复盘报告</Heading><Text variant="body-sm" color="secondary" className="mt-1 block">{report.headline}</Text></div>
                  {report.summary.weightedMatchPct != null ? <Badge variant={report.summary.weightedMatchPct >= 70 ? "success" : report.summary.weightedMatchPct >= 50 ? "warning" : "danger"}>加权匹配 {report.summary.weightedMatchPct.toFixed(0)}%</Badge> : null}
                </div>
                {reportIndex > 0 ? (
                  <details className="rounded-2xl border border-border/[0.09] bg-card/30 p-4">
                    <summary className="cursor-pointer text-body-sm font-semibold">展开 {report.date} 的 {report.items.length} 项复盘</summary>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">{report.items.map((item) => <ItemCard key={item.forecastId} item={item} />)}</div>
                  </details>
                ) : <div className="grid gap-4 lg:grid-cols-2">{report.items.map((item) => <ItemCard key={item.forecastId} item={item} />)}</div>}
              </section>
            )) : <Card padding="lg"><Heading as="h2" size="h3">复盘样本正在建立</Heading><Text variant="body-sm" color="secondary" className="mt-2 block">系统只在预测已锁定且真实行情完成后生成复盘，不会补造历史命中记录。</Text></Card>}

            <div className="flex flex-wrap gap-3"><Link href="/member/daily" className="rounded-full border border-primary/25 px-4 py-2 text-body-sm text-primary">今日预测</Link><Link href="/member/weekly" className="rounded-full border border-primary/25 px-4 py-2 text-body-sm text-primary">周走势</Link><Link href="/member/sector-resonance" className="rounded-full border border-primary/25 px-4 py-2 text-body-sm text-primary">板块共振</Link><Link href="/verification" className="rounded-full border border-border/20 px-4 py-2 text-body-sm text-foreground-secondary">公开验证</Link></div>
          </div>
        </Section>
      </main>
    </>
  );
}
