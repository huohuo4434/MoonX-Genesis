import type { Metadata } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { DailySectorResonanceBoard } from "@/components/conviction/DailySectorResonanceBoard";
import { SectorResonanceBoard } from "@/components/conviction/SectorResonanceBoard";
import { SectorKeyDateOverview } from "@/components/conviction/SectorKeyDateOverview";
import { ConclusionFirstPanel, type ConclusionFirstFact } from "@/components/member/ConclusionFirstPanel";
import { Section } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildDailySectorResonanceBoard } from "@/lib/data/conviction/daily-sector-resonance";
import { buildSectorKeyDateWindows, selectCurrentAndNextSectorWeeks } from "@/lib/data/conviction/sector-key-date-overview";
import { buildSectorResonanceBoard } from "@/lib/data/conviction/sector-resonance-board";
import { buildMemberKeyDateRadar } from "@/lib/data/member-key-date-radar";
import { memberSectorOutlook as crossCheck } from "@/lib/presentation/member-september-outlook";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/sector-resonance";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "板块共振分析 | MOOX",
    titleEn: "Sector Resonance | MOOX",
    descriptionZh: "把重点资产按板块、自然周和逐日路径对齐，直观看同向共振与分化。",
    descriptionEn: "Compare priority assets by sector across aligned daily and weekly windows.",
  });
}

export default async function MemberSectorResonancePage({
  searchParams,
}: {
  searchParams?: Promise<{ week?: string; detail?: string }>;
}) {
  noStore();
  const params = searchParams ? await searchParams : {};
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    const en = (await getRequestLocale()) === "en";
    return <main><Section spacing="lg"><PublicFeaturePreview
      eyebrow={en ? "Sector resonance · Public preview" : "板块共振 · 公开预览"}
      title={en ? "See alignment and divergence by sector" : "同板块是否共振，一眼看清"}
      description={en ? "All tracked assets are grouped by crypto, semiconductors, large technology, commodities and indices, then aligned to the same daily and weekly windows." : "把全部重点资产按加密、半导体、大型科技、商品和指数分组，并统一到同一日与同一自然周比较。"}
      solves={en ? ["Avoid comparing different date windows", "Spot sector-wide confirmation", "Keep divergent assets visible"] : ["避免拿不同日期窗口硬比较", "识别板块共同方向", "保留板块内部的分化"]}
      memberBenefits={en ? ["Daily and weekly aligned windows", "Direction color matrix", "Sector consensus strength", "Direct links to full asset research"] : ["逐日与逐周双矩阵", "方向颜色矩阵", "板块共识强度", "直达标的完整研究"]}
      exampleTitle={en ? "Semiconductor group" : "半导体板块示例"}
      exampleLines={en ? ["Intel ↑", "Micron ↑", "Sandisk ↕", "Result: aligned with one divergence"] : ["英特尔 ↑", "美光 ↑", "闪迪 ↕", "结论：总体同向，存在一项分化"]}
      nextPath={path}
      locale={en ? "en" : "zh"}
    /></Section></main>;
  }
  if (gate.status === "DEVICE_REQUIRED") {
    return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  }
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const board = buildSectorResonanceBoard(today);
  const dailyBoard = buildDailySectorResonanceBoard(board);
  const selectedDailyWeek = dailyBoard.weeks.find((week) => week.start === params.week)
    ?? dailyBoard.weeks.find((week) => today >= week.start && today <= week.end)
    ?? dailyBoard.weeks.find((week) => board.asOf >= week.start && board.asOf <= week.end)
    ?? dailyBoard.weeks[0];
  const headlineWeeks = selectCurrentAndNextSectorWeeks(board.weeks, today);
  const headlinePanels = headlineWeeks.map((week) => {
    const summaries = board.summaries.filter((item) => item.weekStart === week.start);
    const facts: ConclusionFirstFact[] = summaries.map((item) => ({
      label: item.group,
      value: item.label,
      tone: item.status === "HIGH" ? "positive" : item.status === "DIVERGENT" ? "turn" : item.status === "MEDIUM" ? "neutral" : "muted",
    }));
    return {
      title: `${week.badge === "本周" ? "本周板块结论" : "下周板块预报"}｜${week.label}`,
      conclusion: week.badge === "本周" ? "看各板块强弱，结合关键日应对。" : "提前看方向，入场等走势确认。",
      facts,
    };
  });
  const keyDateWindows = buildSectorKeyDateWindows({
    weeks: board.weeks,
    rows: board.rows,
    keyDates: buildMemberKeyDateRadar(today),
    asOfDate: today,
  });
  return (
    <>
      <MemberDeviceHeartbeat />
      <main className="min-h-screen bg-[#07080a] text-white">
        <Section spacing="lg">
          <div className="mx-auto w-full max-w-[1480px]">
            <div className="grid gap-5 xl:grid-cols-2">
              {headlinePanels.map((panel) => <ConclusionFirstPanel
                key={panel.title}
                title={panel.title}
                conclusion={panel.conclusion}
                facts={panel.facts}
              />)}
            </div>
            <Link href="/member/annual-outlook" className="mb-5 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[.04] px-5 py-4 text-sm text-amber-100/70"><span><b className="text-white">先看2026年度路线</b><span className="ml-2 text-white/40">9—12月候选与高低点候选月</span></span><span>进入 →</span></Link>
            <div className="mb-5 flex flex-wrap gap-2 text-xs">
              <a href="#key-dates" className="rounded-full border border-amber-300/25 bg-amber-300/[.07] px-3 py-1.5 font-semibold text-amber-100">本周＋下周关键日</a>
              <Link href="/member/key-dates" className="rounded-full border border-amber-300/15 bg-amber-300/[.035] px-3 py-1.5 text-amber-100/65">完整关键日雷达</Link>
              <a href="#daily-sector" className="rounded-full border border-violet-300/20 bg-violet-300/[.06] px-3 py-1.5 text-violet-100/70">逐日板块共振</a>
              <a href="#weekly-sector" className="rounded-full border border-cyan-300/20 bg-cyan-300/[.06] px-3 py-1.5 text-cyan-100/65">周度板块共振</a>
            </div>
            <section className="mb-6 overflow-hidden rounded-2xl border border-amber-300/15 bg-amber-300/[.035]">
              <header className="border-b border-white/[.06] px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-amber-100/50">MR. YI · MARKET OUTLOOK</p>
                <h2 className="mt-1.5 text-lg font-semibold text-white">{crossCheck.title}</h2>
                <p className="mt-2 text-xs leading-6 text-white/45">{crossCheck.boundary}</p>
              </header>
              <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                {crossCheck.rows.map((row) => (
                  <article key={row.asset} className="rounded-xl border border-white/[.07] bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-white">{row.asset}</h3>
                      <span className="rounded-full border border-amber-300/20 px-2.5 py-1 text-[10px] text-amber-100/70">{row.status}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/80">{row.outlook}</p>
                    <p className="mt-2 text-xs leading-5 text-white/55"><b>时间：</b>{row.rhythm}</p>
                    <p className="mt-2 text-xs leading-5 text-amber-100/75"><b>应对：</b>{row.action}</p>
                  </article>
                ))}
              </div>
              <p className="border-t border-white/[.05] px-5 py-3 text-[11px] leading-5 text-white/38">{crossCheck.methodNote}</p>
            </section>
            <SectorKeyDateOverview windows={keyDateWindows} />
            <div className="mt-10"><DailySectorResonanceBoard {...dailyBoard} selectedWeekStart={selectedDailyWeek?.start} /></div>
            <div id="weekly-sector" className="mt-10 scroll-mt-6"><SectorResonanceBoard {...board} selectedAssetId={params.detail} selectedWeekStart={selectedDailyWeek?.start} /></div>
          </div>
        </Section>
      </main>
    </>
  );
}

