import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { AnnualForecastRoadmap2026 } from "@/components/research/AnnualForecastRoadmap2026";
import { Section } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { listAnnualForecastRoadmaps2026 } from "@/lib/research/annual-forecast-roadmap-2026";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/annual-outlook";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "2026年度路线总览 | MOOX",
    titleEn: "2026 Annual Outlook | MOOX",
    descriptionZh: "重点资产年度环境、逐月候选与高低点候选总览。",
    descriptionEn: "Yearly regimes, monthly candidates and turning-month candidates for priority assets.",
  });
}

export default async function MemberAnnualOutlookPage() {
  noStore();
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    const en = (await getRequestLocale()) === "en";
    return <main><Section spacing="lg"><PublicFeaturePreview
      eyebrow={en ? "Annual outlook · Public preview" : "年度路线 · 公开预览"}
      title={en ? "Read the yearly regime before the weekly path" : "先看全年，再看月周日"}
      description={en ? "Priority assets are aligned from annual regime to future monthly candidates without rewriting past months." : "把重点资产从年度环境排到未来月份候选，已经发生的月份不回填。"}
      solves={en ? ["See risk months", "Compare high and low month candidates", "Keep cross-horizon conflicts visible"] : ["查看风险月份", "对照高低点候选月", "保留跨周期分歧"]}
      memberBenefits={en ? ["2026 annual route", "September to December map", "Locked future version", "Month and week calibration"] : ["2026年度路线", "9—12月地图", "未来正式锁定版", "月卦与周卦逐层校准"]}
      exampleTitle={en ? "Annual route" : "年度路线示例"}
      exampleLines={en ? ["September: rally then fade", "October: risk release", "November: repair candidate"] : ["9月：先涨后跌", "10月：风险释放", "11月：修复候选"]}
      nextPath={path}
      locale={en ? "en" : "zh"}
    /></Section></main>;
  }
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  return <><MemberDeviceHeartbeat /><main className="min-h-screen bg-[#07080a] text-white"><Section spacing="lg"><div className="mx-auto w-full max-w-[1480px]"><AnnualForecastRoadmap2026 rows={listAnnualForecastRoadmaps2026()} /></div></Section></main></>;
}
