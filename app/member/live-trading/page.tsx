import MemberLiveTradingClient from "@/components/live-trading/MemberLiveTradingClient";
import { redirect } from "next/navigation";
import { getAccessUser } from "@/lib/auth/get-access-user";
export const dynamic = "force-dynamic";
export default async function MemberLiveTradingPage() {
  const access = await getAccessUser();
  if (!access.authenticated) redirect(`/login?next=${encodeURIComponent("/member/live-trading")}`);
  if (!access.isActiveMember) redirect("/pricing");
  return <MemberLiveTradingClient />;
}
