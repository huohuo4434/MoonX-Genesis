import { unstable_noStore as noStore } from "next/cache";
import {
  MemberTomorrowFullPage,
  MemberTomorrowHiddenPage,
} from "@/components/member/MemberTomorrowPage";
import { getMemberTomorrowPagePayload } from "@/lib/data/tomorrow-forecast-access";
import { guardMemberForecastRoute } from "@/lib/route-feature-guards";

export const metadata = {
  title: "下一交易日完整预测",
  description: "会员在北京时间20:00后可查看已正式发布的下一交易日预测。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MemberTomorrowRoute() {
  noStore();
  guardMemberForecastRoute();
  const payload = await getMemberTomorrowPagePayload();

  if (payload.mode === "hidden") {
    return (
      <MemberTomorrowHiddenPage isAdmin={payload.isAdmin} adminHint={payload.adminHint} />
    );
  }

  return <MemberTomorrowFullPage forecasts={payload.forecasts} />;
}
