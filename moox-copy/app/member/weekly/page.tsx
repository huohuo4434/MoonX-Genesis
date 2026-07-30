import { unstable_noStore as noStore } from "next/cache";
import {
  MemberWeeklyFullPage,
  MemberWeeklyLockedPage,
} from "@/components/member/MemberWeeklyPage";
import { getMemberWeeklyPagePayload } from "@/lib/data/weekly-analysis-access";
import { guardMemberForecastRoute } from "@/lib/route-feature-guards";

export const metadata = {
  title: "本周行情分析",
  description: "会员专享：本周整体方向、周内运行顺序与风险窗口。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MemberWeeklyRoute() {
  noStore();
  guardMemberForecastRoute();
  const payload = await getMemberWeeklyPagePayload();

  if (payload.mode === "locked") {
    return <MemberWeeklyLockedPage summary={payload.summary} />;
  }

  return <MemberWeeklyFullPage slots={payload.slots} summary={payload.summary} />;
}
