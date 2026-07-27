import {
  MemberTomorrowFullPage,
  MemberTomorrowLockedPage,
} from "@/components/member/MemberTomorrowPage";
import { getMemberTomorrowPagePayload } from "@/lib/data/tomorrow-forecast-access";

export const metadata = {
  title: "下一交易日完整预测 | MoonX",
  description: "会员专享：下一交易日方向、概率、关键价位与风险条件。",
};

export default async function MemberTomorrowRoute() {
  const payload = await getMemberTomorrowPagePayload();

  if (payload.mode === "locked") {
    return <MemberTomorrowLockedPage summary={payload.summary} />;
  }

  return <MemberTomorrowFullPage forecasts={payload.forecasts} />;
}
