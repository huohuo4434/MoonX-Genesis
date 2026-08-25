import MemberLiveTradingClient from "@/components/live-trading/MemberLiveTradingClient";
import { redirect } from "next/navigation";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { Section } from "@/components/ui";
export const dynamic = "force-dynamic";
export default async function MemberLiveTradingPage() {
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED") redirect(`/login?next=${encodeURIComponent("/member/live-trading")}`);
  if (gate.status === "MEMBERSHIP_REQUIRED") redirect("/pricing");
  if (gate.status === "DEVICE_REQUIRED") {
    return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath="/member/live-trading" /></Section></main>;
  }
  return <><MemberDeviceHeartbeat /><MemberLiveTradingClient /></>;
}
