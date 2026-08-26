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
import { guardMemberForecastRoute } from "@/lib/route-feature-guards";
import { projectPublicAttribution } from "@/lib/presentation/public-attribution";
import { getWeeklyRollingVerification } from "@/lib/accuracy/get-weekly-rolling-verification";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/member/weekly",
    titleZh: "会员周走势预测",
    titleEn: "Weekly Outlook",
    descriptionZh: "会员专享：逐个查看核心市场本周方向、周内路径、关键日期、支撑压力与失效条件。",
    descriptionEn: "Member-only weekly outlook with direction, path, key dates, support, resistance and invalidation for each core market.",
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
  const rollingVerification = await getWeeklyRollingVerification(payload.slots);
  return <><MemberDeviceHeartbeat /><MemberWeeklyFullPage slots={payload.slots} summary={payload.summary} rollingVerification={rollingVerification} /></>;
}
