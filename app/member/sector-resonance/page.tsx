import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { SectorResonanceBoard } from "@/components/conviction/SectorResonanceBoard";
import { Section } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
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
    descriptionZh: "把重点资产按板块和自然周对齐，直观看同向共振与分化。",
    descriptionEn: "Compare priority assets by sector and aligned weekly windows.",
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
      description={en ? "All tracked assets are grouped by crypto, semiconductors, large technology, commodities and indices, then aligned to the same weekly window." : "把全部重点资产按加密、半导体、大型科技、商品和指数分组，并统一到同一自然周比较。"}
      solves={en ? ["Avoid comparing different date windows", "Spot sector-wide confirmation", "Keep divergent assets visible"] : ["避免拿不同日期窗口硬比较", "识别板块共同方向", "保留板块内部的分化"]}
      memberBenefits={en ? ["Current and next weekly windows", "Direction color matrix", "Sector consensus strength", "Direct links to full asset research"] : ["本周与下周并列", "方向颜色矩阵", "板块共识强度", "直达标的完整研究"]}
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
  return (
    <>
      <MemberDeviceHeartbeat />
      <main className="min-h-screen bg-[#07080a] text-white">
        <Section spacing="lg">
          <div className="mx-auto w-full max-w-[1480px]">
            <SectorResonanceBoard {...board} />
          </div>
        </Section>
      </main>
    </>
  );
}

