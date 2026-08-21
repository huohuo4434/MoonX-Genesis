import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Section } from "@/components/ui";
import { MemberTradingOnboarding } from "@/components/member/MemberTradingOnboarding";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/ai-trading";

export const metadata: Metadata = { title: "会员AI交易接入 | MOOX", description: "会员本地Bitget Agent安全接入、试运行方法选择与风险教程。" };

export default async function MemberAiTradingPage() {
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED") redirect(`/login?next=${path}`);
  if (gate.status === "MEMBERSHIP_REQUIRED") redirect("/pricing");
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  return <main><Section spacing="lg"><MemberDeviceHeartbeat /><MemberTradingOnboarding /></Section></main>;
}
