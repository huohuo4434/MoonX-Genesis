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
import { guardMemberForecastRoute } from "@/lib/route-feature-guards";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/member/weekly",
    titleZh: "本周精选5 · 会员周报",
    titleEn: "Weekly Alpha 5",
    descriptionZh: "会员专享：每周精选5个高价值标的，包含老师法六爻解读、万年历校验、真实K线、支撑压力与周内推演。",
    descriptionEn: "Member-only Weekly Alpha 5 with teacher-method Liu Yao, verified calendar data, real candles, execution levels and weekly path scenarios.",
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
  const payload = await getMemberWeeklyPagePayload();
  if (payload.mode === "locked") {
    return <MemberWeeklyLockedPage summary={payload.summary} />;
  }
  const alphaIssue = await buildWeeklyAlphaIssue(payload.summary.weekStart);
  return <><MemberDeviceHeartbeat /><MemberWeeklyFullPage slots={payload.slots} summary={payload.summary} alphaIssue={alphaIssue} /></>;
}
