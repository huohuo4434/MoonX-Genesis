import { redirect } from "next/navigation";
import { Section } from "@/components/ui";
import { AiTradingDeskClient } from "@/components/member/AiTradingDeskClient";
import { requireMember } from "@/lib/auth/permissions";
import { getMemberAiTradingDeskSnapshot } from "@/lib/trading-signals/member-ai-trading-desk";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "AI交易公开台 | MOOX Intelligence",
  description: "会员专享：AI计划、Bitget Demo当前持仓、最近成交和策略表现。",
};

export default async function MemberAiTradingDeskPage() {
  const user = await requireMember();
  if (!user) redirect("/login?next=/member/ai-trading");
  const snapshot = await getMemberAiTradingDeskSnapshot();
  return (
    <main>
      <Section spacing="lg">
        <AiTradingDeskClient initial={snapshot} />
      </Section>
    </main>
  );
}
