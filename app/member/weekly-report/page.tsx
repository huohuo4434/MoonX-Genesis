import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Badge, Card, Heading, Section } from "@/components/ui";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { getMemberWeeklyPagePayload } from "@/lib/data/weekly-analysis-access";
import { assetNameEn, directionEn } from "@/lib/i18n/english-content";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/weekly-report";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({ locale, basePath: path,
    titleZh: "周度研究 | MOOX Intelligence", titleEn: "Weekly research | MOOX Intelligence",
    descriptionZh: "本周各市场方向和有效周期；交易点位统一在工作台查看。",
    descriptionEn: "Weekly market paths and dated research. Entry plans are kept in one workspace.",
  });
}

export default async function MemberWeeklyReportPage() {
  noStore();
  const locale = await getRequestLocale();
  const en = locale === "en";
  const local = (url: string) => en ? `/en${url}` : url;
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED") redirect(`${local("/login")}?next=${local(path)}`);
  if (gate.status === "MEMBERSHIP_REQUIRED") redirect(local("/pricing"));
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={local(path)} /></Section></main>;
  const payload = await getMemberWeeklyPagePayload();
  if (payload.mode !== "member") redirect(local("/member/weekly"));
  const published = payload.slots.flatMap(slot => slot.kind === "published" ? [slot.analysis] : []);

  return <>
    <MemberDeviceHeartbeat />
    <main><Section spacing="lg"><div className="mx-auto max-w-5xl space-y-6">
      <header>
        <Heading as="h1" size="h2">{en ? "This week's market paths" : "本周走势 · 一眼看懂"}</Heading>
        <p className="mt-3 text-sm text-foreground-secondary">{en ? "Research describes a dated path, not a holding period or an entry order. Use the workspace for current entry, stop, target and expiry conditions." : "周观点看节奏，不等于持仓一周。买卖、止盈止损和有效期，统一看工作台的当前计划。"}</p>
        <p className="mt-2 text-xs text-foreground-tertiary">{payload.summary.weekStart} — {payload.summary.weekEnd} · {en ? "Published" : "已发布"} {published.length}/{payload.summary.coverageCount}</p>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {published.map(row => <Card key={row.id} padding="md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Heading as="h2" size="h3">{en ? assetNameEn(row.assetName) : row.assetName} <span className="text-xs text-foreground-tertiary">{row.displaySymbol ?? row.symbol}</span></Heading>
            <Badge variant="outline">{en ? directionEn(row.overallDirection) : row.overallDirection}</Badge>
          </div>
          <p className="mt-2 text-xs text-foreground-tertiary">{row.weekStart} — {row.weekEnd} · v{row.version}</p>
          {!en ? <p className="mt-3 text-sm leading-6 text-foreground-secondary">{row.weeklyPath}</p> : null}
          <details className="mt-3 text-sm text-foreground-secondary">
            <summary className="cursor-pointer">{en ? "Detailed context & invalidation (Chinese original)" : "关键位置、失效条件与风险"}</summary>
            <div lang="zh-CN" className="mt-3 space-y-2 leading-6">
              {en ? <p>{row.weeklyPath}</p> : null}
              <p>支撑：{row.keySupport?.join(" / ") || "暂无已核验位置"}</p>
              <p>压力：{row.keyResistance?.join(" / ") || "暂无已核验位置"}</p>
              <p>失效条件：{row.invalidation}</p>
              {row.risks?.map((risk, index) => <p key={index}>{risk}</p>)}
              <p className="text-xs">研究评分 {row.confidence}/100，不代表交易胜率。</p>
            </div>
          </details>
        </Card>)}
        {!published.length ? <Card padding="md">{en ? "No published research for this week yet. Wait for a dated plan." : "本周尚无已发布研究，等待有效计划。"}</Card> : null}
      </div>
      <nav className="flex flex-wrap gap-4 text-sm text-primary">
        <Link prefetch={false} href={local("/member")}>{en ? "Current trade plans →" : "查看当前交易计划 →"}</Link>
        <Link prefetch={false} href={local("/member/weekly")}>{en ? "Full weekly research" : "完整周度研究"}</Link>
        <Link prefetch={false} href={local("/member/weekly-review")}>{en ? "Forecast results" : "查看预测复盘"}</Link>
      </nav>
    </div></Section></main>
  </>;
}
