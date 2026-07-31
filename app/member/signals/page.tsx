import { redirect } from "next/navigation";
import { Section } from "@/components/ui";
import { MemberTradingSignals } from "@/components/signals/MemberTradingSignals";
import { requireMember } from "@/lib/auth/permissions";
import { calculateStarStats, listTradeSignals } from "@/lib/trading-signals/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "AI交易信号 | MOOX Intelligence",
  description: "结构化入场、止损、止盈和多方法共识信号。",
};

export default async function MemberSignalsPage() {
  const user = await requireMember();
  if (!user) redirect("/login?next=/member/signals");
  const signals = await listTradeSignals({ includeDrafts: false, apiVisibleOnly: true, limit: 500 });
  return <main><Section spacing="lg"><MemberTradingSignals signals={signals} stats={calculateStarStats(signals)} /></Section></main>;
}
