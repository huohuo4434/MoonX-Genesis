import type { Metadata } from "next";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { Section } from "@/components/ui";
import { MemberTradingSignals } from "@/components/signals/MemberTradingSignals";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { calculateStarStats, listTradeSignals } from "@/lib/trading-signals/store";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/member/signals",
    titleZh: "AI交易信号 | MOOX Intelligence",
    titleEn: "Member Signals | MOOX Intelligence",
    descriptionZh: "会员观察与触发条件：结构化确认、失效和风险提示。",
    descriptionEn: "Member-only structured signals with confirmation triggers, invalidation conditions and risk controls.",
  });
}


export const dynamic = "force-dynamic";
export const revalidate = 0;


const path = "/member/signals";

export default async function MemberSignalsPage() {
  const locale = await getRequestLocale();
  const en = locale === "en";
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    return (
      <main><Section spacing="lg"><PublicFeaturePreview
        eyebrow={en ? "Member signals · Public preview" : "会员观察与触发条件 · 公开预览"}
        title={en ? "Define the conditions before taking action" : "AI交易信号：先定义条件，再决定是否行动"}
        description={en ? "This is not a buy list. Each signal defines the monitored direction, confirmation trigger, invalidation condition and risk control. When conditions are incomplete, the correct action remains waiting." : "信号页不负责重新判断多空：方向已经由MOOX玄学研究给出。这里仅判断技术入场位置、风控与执行状态；条件未到可以等待，但不会因此反向修改方向。"}
        solves={en ? ["Avoid chasing a directional headline", "Define when a view becomes actionable", "Set invalidation and risk before entry"] : ["避免看到方向后立刻追单", "明确什么情况下观点才转化为可执行信号", "在入场前先写清失效和风险条件"]}
        memberBenefits={en ? ["Live monitoring direction and status", "Confirmation, invalidation and risk controls", "Cross-method consensus and evidence", "Closed-signal review and statistics"] : ["实时会员观察方向与状态", "技术入场位置与风险控制", "多方法共识度和证据摘要", "已结束信号的复盘与统计"]}
        exampleTitle={en ? "Nasdaq monitoring example" : "纳斯达克观察信号示例"}
        exampleLines={en ? ["Direction: Bullish bias, not confirmed", "Trigger: Break resistance and hold the retest", "Invalidation: Lose structural support", "Current action: Await confirmation"] : ["MOOX方向：看涨（由玄学确定）", "技术执行：等待更合适的入场位置", "风控参考：结构支撑", "当前动作：方向不变，暂缓执行"]}
        nextPath={en ? `/en${path}` : path}
        locale={en ? "en" : "zh"}
      /></Section></main>
    );
  }
  if (gate.status === "DEVICE_REQUIRED") {
    return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  }
  const signals = await listTradeSignals({ includeDrafts: false, apiVisibleOnly: true, limit: 500 });
  return <main><Section spacing="lg"><MemberDeviceHeartbeat /><MemberTradingSignals signals={signals} stats={calculateStarStats(signals)} /></Section></main>;
}
