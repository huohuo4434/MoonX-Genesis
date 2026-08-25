import type { Metadata } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { DailySectorResonanceBoard } from "@/components/conviction/DailySectorResonanceBoard";
import { SectorResonanceBoard } from "@/components/conviction/SectorResonanceBoard";
import { ConclusionFirstPanel, type ConclusionFirstFact } from "@/components/member/ConclusionFirstPanel";
import { Section } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildDailySectorResonanceBoard } from "@/lib/data/conviction/daily-sector-resonance";
import { buildSectorResonanceBoard } from "@/lib/data/conviction/sector-resonance-board";
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

export default async function MemberSectorResonancePage() {
  noStore();
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
  const board = buildSectorResonanceBoard();
  const dailyBoard = buildDailySectorResonanceBoard(board);
  const currentWeek = board.weeks.find((week) => board.asOf >= week.start && board.asOf <= week.end) ?? board.weeks[0];
  const currentSummaries = currentWeek ? board.summaries.filter((item) => item.weekStart === currentWeek.start) : [];
  const currentFacts: ConclusionFirstFact[] = currentSummaries.map((item) => ({
    label: item.group,
    value: item.label,
    tone: item.status === "HIGH" ? "positive" : item.status === "DIVERGENT" ? "turn" : item.status === "MEDIUM" ? "neutral" : "muted",
  }));
  const strongerGroups = currentSummaries.filter((item) => item.status === "HIGH" || (item.status === "MEDIUM" && item.bull > item.bear)).map((item) => item.group);
  const divergentGroups = currentSummaries.filter((item) => item.status === "DIVERGENT").map((item) => item.group);
  return (
    <>
      <MemberDeviceHeartbeat />
      <main className="min-h-screen bg-[#07080a] text-white">
        <Section spacing="lg">
          <div className="mx-auto w-full max-w-[1480px]">
            <ConclusionFirstPanel
              title={`本周板块结论${currentWeek ? `｜${currentWeek.label}` : ""}`}
              conclusion={`相对偏强：${strongerGroups.length ? strongerGroups.join("、") : "暂无明确板块"}；明显分化：${divergentGroups.length ? divergentGroups.join("、") : "暂无"}。先看板块是否同向，再点进具体标的。`}
              facts={currentFacts}
              actions={["强共振只提高参考价值，不代表板块内每个标的涨幅相同。", "出现分化时不追板块标签，回到标的周卦、关键日和失效条件。"]}
            />
            <Link href="/member/annual-outlook" className="mb-5 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[.04] px-5 py-4 text-sm text-amber-100/70"><span><b className="text-white">先看2026年度路线</b><span className="ml-2 text-white/40">9—12月候选与高低点候选月</span></span><span>进入 →</span></Link>
            <div className="mb-5 flex flex-wrap gap-2 text-xs">
              <a href="#daily-sector" className="rounded-full border border-violet-300/20 bg-violet-300/[.06] px-3 py-1.5 text-violet-100/70">逐日板块共振</a>
              <a href="#weekly-sector" className="rounded-full border border-cyan-300/20 bg-cyan-300/[.06] px-3 py-1.5 text-cyan-100/65">周度板块共振</a>
            </div>
            <DailySectorResonanceBoard {...dailyBoard} />
            <div id="weekly-sector" className="mt-10 scroll-mt-6"><SectorResonanceBoard {...board} /></div>
          </div>
        </Section>
      </main>
    </>
  );
}

