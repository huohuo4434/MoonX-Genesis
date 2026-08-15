import type { Metadata } from "next";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { unstable_noStore as noStore } from "next/cache";
import { Section } from "@/components/ui";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import {
  MemberWeeklyFullPage,
  MemberWeeklyLockedPage,
} from "@/components/member/MemberWeeklyPage";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { getMemberWeeklyPagePayload } from "@/lib/data/weekly-analysis-access";
import { buildWeeklyAlphaIssue } from "@/lib/data/weekly-alpha";
import { getMemberMarketBranchOutlook20260813 } from "@/lib/data/member-market-branches-20260813";
import { guardMemberForecastRoute } from "@/lib/route-feature-guards";
import { projectPublicAttribution,projectPublicResearchRadar } from "@/lib/presentation/public-attribution";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/member/weekly",
    titleZh: "本周精选5 · 会员周报",
    titleEn: "Weekly Alpha 5",
    descriptionZh: "会员专享：易老师综合传统术数、公开市场信息、真实K线、支撑压力与宏观事件形成每周独立研判；AI仅辅助归并与情景推演。",
    descriptionEn: "Member-only Weekly Alpha 5 under Yi methodology, with traditional analysis, verified calendar data, real candles, execution levels and weekly path scenarios.",
  });
}



export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MemberWeeklyRoute() {
  noStore();
  guardMemberForecastRoute();
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "DEVICE_REQUIRED") {
    return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath="/member/weekly" /></Section></main>;
  }
  const locale=(await getRequestLocale())==="en"?"en":"zh";
  const payload = projectPublicAttribution(await getMemberWeeklyPagePayload(),{locale});
  if (payload.mode === "locked") {
    return <MemberWeeklyLockedPage summary={payload.summary} />;
  }
  const alphaIssue = projectPublicAttribution(await buildWeeklyAlphaIssue(payload.summary.weekStart),{locale});
  const branchOutlook = projectPublicAttribution(getMemberMarketBranchOutlook20260813(),{locale});
  const { getMemberQimenStoneRadar20260814 } = await import("@/lib/data/member-qimen-stone-radar-20260814");
  const researchRadar = projectPublicResearchRadar(getMemberQimenStoneRadar20260814(),locale);
  return <><MemberDeviceHeartbeat /><MemberWeeklyFullPage slots={payload.slots} summary={payload.summary} alphaIssue={alphaIssue} branchOutlook={branchOutlook} researchRadar={researchRadar} /></>;
}
