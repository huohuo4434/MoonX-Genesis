import { Section } from "@/components/ui";
import { MemberTradingSignals } from "@/components/signals/MemberTradingSignals";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { calculateStarStats, listTradeSignals } from "@/lib/trading-signals/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "AI交易信号 | MOOX Intelligence",
  description: "会员观察与触发条件：结构化确认、失效和风险提示。",
};

const path = "/member/signals";

export default async function MemberSignalsPage() {
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    return (
      <main><Section spacing="lg"><PublicFeaturePreview
        eyebrow="会员观察与触发条件 · 公开预览"
        title="AI交易信号：先定义条件，再决定是否行动"
        description="信号页不是简单的买入名单，而是把观察方向、触发条件、失效条件和风险控制写清楚。条件未满足时，结论可以是继续等待。"
        solves={["避免看到方向后立刻追单", "明确什么情况下观点才转化为可执行信号", "在入场前先写清失效和风险条件"]}
        memberBenefits={["实时会员观察方向与状态", "入场确认、失效条件与风险提示", "多方法共识度和证据摘要", "已结束信号的复盘与统计"]}
        exampleTitle="纳斯达克观察信号示例"
        exampleLines={["观察方向：偏多，但尚未确认", "触发条件：突破压力并回踩保持", "失效条件：跌破结构支撑", "当前动作：等待确认"]}
        nextPath={path}
      /></Section></main>
    );
  }
  if (gate.status === "DEVICE_REQUIRED") {
    return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  }
  const signals = await listTradeSignals({ includeDrafts: false, apiVisibleOnly: true, limit: 500 });
  return <main><Section spacing="lg"><MemberDeviceHeartbeat /><MemberTradingSignals signals={signals} stats={calculateStarStats(signals)} /></Section></main>;
}
