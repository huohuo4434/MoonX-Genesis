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

export const metadata = {
  title: "周度行情分析",
  description: "会员专享：本周或下周整体方向、周内运行顺序与风险窗口。",
};

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
  return <><MemberDeviceHeartbeat /><MemberWeeklyFullPage slots={payload.slots} summary={payload.summary} /></>;
}
