import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { getMemberWeeklyPagePayload } from "@/lib/data/weekly-analysis-access";
import { mooxDirectionLabelZh } from "@/lib/forecasts/moox-direction-doctrine";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import type { WeeklyAnalysisMemberView } from "@/types/weekly-analysis";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/weekly-report";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "会员周报 | MOOX Intelligence",
    titleEn: "Member Weekly Report | MOOX Intelligence",
    descriptionZh: "本周最值得关注的机会、主要风险、行动清单和上周复盘入口。",
    descriptionEn: "The week’s clearest opportunities, primary risks, action list and review links.",
  });
}

function directionTone(direction: string): string {
  if (/上涨|回升/.test(direction)) return "text-emerald-200";
  if (/下跌|回落/.test(direction)) return "text-rose-200";
  return "text-sky-200";
}

function pickTop(rows: WeeklyAnalysisMemberView[]): WeeklyAnalysisMemberView[] {
  return [...rows]
    .sort((left, right) => right.confidence - left.confidence || right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 5);
}

export default async function MemberWeeklyReportPage() {
  noStore();
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED") redirect(`/login?next=${path}`);
  if (gate.status === "MEMBERSHIP_REQUIRED") redirect("/pricing");
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;

  const payload = await getMemberWeeklyPagePayload();
  if (payload.mode !== "member") redirect("/member/weekly");
  const published = payload.slots.flatMap((slot) => slot.kind === "published" ? [slot.analysis] : []);
  const top = pickTop(published);
  const risks = published
    .flatMap((row) => row.risks?.map((risk) => ({ asset: row.assetName, risk })) ?? [])
    .slice(0, 5);

  return (
    <>
      <MemberDeviceHeartbeat />
      <main>
        <Section spacing="lg">
          <div className="mx-auto w-full max-w-6xl space-y-9">
            <header className="rounded-3xl border border-amber-300/15 bg-[radial-gradient(circle_at_90%_0%,rgba(245,158,11,.13),transparent_34%),linear-gradient(145deg,#12110d,#090a0e)] p-6 sm:p-8">
              <Badge variant="warning">会员周报</Badge>
              <Heading as="h1" size="h2" className="mt-4">本周先看什么</Heading>
              <Text variant="body" color="secondary" className="mt-3 block max-w-3xl">周报只保留最重要的机会、风险和行动顺序；九大市场逐项研究请进入“周走势预测”。</Text>
              <div className="mt-4 flex flex-wrap gap-4 text-caption text-foreground-tertiary"><span>{payload.summary.weekLabel}</span><span>已发布 {published.length}/{payload.summary.coverageCount}</span><span>{payload.summary.lastUpdatedLabel}</span></div>
            </header>

            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><Heading as="h2" size="h3">本周优先关注</Heading><Text variant="body-sm" color="secondary" className="mt-1 block">按当前信心和研究新鲜度筛出前5项，不代表全部都要立即交易。</Text></div><Link href="/member/weekly" className="text-body-sm text-primary">查看完整周走势 →</Link></div>
              <div className="grid gap-4 lg:grid-cols-2">
                {top.length ? top.map((row, index) => (
                  <Card key={row.id} padding="lg" className="border-border/[0.09] bg-card/55">
                    <div className="flex items-start justify-between gap-3"><div><span className="font-mono text-caption text-amber-200/75">#{index + 1}</span><Heading as="h3" size="h3" className="mt-1">{row.assetName} <span className="font-mono text-body-sm font-normal text-foreground-tertiary">{row.displaySymbol ?? row.symbol}</span></Heading></div><Badge variant="outline">信心 {row.confidence}%</Badge></div>
                    <p className={`mt-3 text-xl font-semibold ${directionTone(row.overallDirection)}`}>{mooxDirectionLabelZh(row.overallDirection)}</p>
                    <p className="mt-2 text-body-sm leading-6 text-foreground-secondary">{row.weeklyPath}</p>
                    <dl className="mt-4 grid gap-2 text-body-sm sm:grid-cols-2"><div><dt className="text-caption text-foreground-tertiary">关键支撑</dt><dd>{row.keySupport?.[0] ?? "待补充"}</dd></div><div><dt className="text-caption text-foreground-tertiary">关键压力</dt><dd>{row.keyResistance?.[0] ?? "待补充"}</dd></div><div className="sm:col-span-2"><dt className="text-caption text-foreground-tertiary">失效条件</dt><dd className="text-foreground-secondary">{row.invalidation}</dd></div></dl>
                  </Card>
                )) : <Card padding="lg"><Text variant="body-sm" color="secondary">本周研究仍在审核，暂不为了凑数填入低质量标的。</Text></Card>}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <Card padding="lg"><Heading as="h2" size="h3">本周行动清单</Heading><div className="mt-4 space-y-3 text-body-sm text-foreground-secondary"><p>1. 先打开前排标的详情，确认当前周期与失效条件。</p><p>2. 技术结构未确认时等待，不把预测方向当成追单指令。</p><p>3. 已有仓位先检查保护单、最大持有时间和相关性风险。</p><p>4. 周内出现新版本时保留旧记录，按最新有效版本执行。</p></div></Card>
              <Card padding="lg"><Heading as="h2" size="h3">主要风险</Heading><div className="mt-4 space-y-3">{risks.length ? risks.map((item, index) => <p key={`${item.asset}-${index}`} className="text-body-sm text-foreground-secondary"><span className="font-semibold text-foreground">{item.asset}：</span>{item.risk}</p>) : <Text variant="body-sm" color="secondary">当前周报未形成可公开的统一风险条目，请以各标的失效条件为准。</Text>}</div></Card>
            </section>

            <div className="flex flex-wrap gap-3"><Link href="/member/annual-outlook" className="rounded-full border border-primary/25 px-4 py-2 text-body-sm text-primary">年度路线</Link><Link href="/member/sector-resonance" className="rounded-full border border-primary/25 px-4 py-2 text-body-sm text-primary">板块共振</Link><Link href="/member/weekly-review" className="rounded-full border border-primary/25 px-4 py-2 text-body-sm text-primary">周预测复盘</Link><Link href="/member/stock-picks" className="rounded-full border border-primary/25 px-4 py-2 text-body-sm text-primary">股票研究</Link><Link href="/member/crypto-picks" className="rounded-full border border-primary/25 px-4 py-2 text-body-sm text-primary">加密研究</Link><Link href="/verification" className="rounded-full border border-border/20 px-4 py-2 text-body-sm text-foreground-secondary">上周验证</Link></div>
          </div>
        </Section>
      </main>
    </>
  );
}
