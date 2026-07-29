import { unstable_noStore as noStore } from "next/cache";
import {
  MemberTomorrowEmptyPage,
  MemberTomorrowFullPage,
  MemberTomorrowLockedPage,
} from "@/components/member/MemberTomorrowPage";
import { getMemberTomorrowPagePayload } from "@/lib/data/tomorrow-forecast-access";
import { guardMemberForecastRoute } from "@/lib/route-feature-guards";

export const metadata = {
  title: "下一交易日完整预测 | MoonX",
  description: "会员可提前查看下一交易日的市场方向、概率、运行路径与关键价位。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MemberTomorrowRoute() {
  noStore();
  guardMemberForecastRoute();
  const payload = await getMemberTomorrowPagePayload();

  if (payload.mode === "locked") {
    return <MemberTomorrowLockedPage summary={payload.summary} />;
  }

  if (payload.mode === "empty") {
    return (
      <MemberTomorrowEmptyPage targetDate={payload.targetDate} isAdmin={payload.isAdmin} />
    );
  }

  return <MemberTomorrowFullPage forecasts={payload.forecasts} />;
}
