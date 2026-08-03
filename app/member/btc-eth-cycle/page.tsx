import { BtcEthCycleComparison } from "@/components/research/BtcEthCycleComparison";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { getBtcEthCycleBundle } from "@/lib/data/crypto-cycle-comparison-20260801";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "BTC／ETH周期交叉验证 | MOOX Intelligence",
  description: "BTC与ETH多周期六爻研究和相对强弱交叉验证。",
};

const path = "/member/btc-eth-cycle";

export default async function MemberBtcEthCyclePage() {
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    return (
      <main className="mx-auto w-full max-w-container px-4 py-10 sm:px-6 lg:px-8">
        <PublicFeaturePreview
          eyebrow="重点资产研究 · 公开预览"
          title="BTC／ETH多周期交叉验证"
          description="把年度、季度、月度和周度研究放在同一页，观察两类加密资产的方向共识、相对强弱和风险窗口。"
          solves={["区分短期反弹与中期趋势", "比较BTC与ETH在同一阶段的相对强弱", "识别不同周期结论发生冲突的位置"]}
          memberBenefits={["BTC与ETH完整多周期研究", "相对强弱与周期共识", "关键风险窗口和失效条件", "历史研究版本与后续验证"]}
          exampleTitle="周期交叉示例"
          exampleLines={["年度：方向偏弱，等待结构修复", "月度：反弹窗口存在，但信号强度中等", "周度：先跌后涨倾向，需等待技术确认", "相对强弱：只在真实数据支持时给出"]}
          nextPath={path}
        />
      </main>
    );
  }
  if (gate.status === "DEVICE_REQUIRED") {
    return <main className="mx-auto w-full max-w-container px-4 py-10 sm:px-6 lg:px-8"><MemberDeviceGate decision={gate.device} nextPath={path} /></main>;
  }
  return (
    <main className="mx-auto w-full max-w-container px-4 py-10 sm:px-6 lg:px-8">
      <MemberDeviceHeartbeat />
      <BtcEthCycleComparison {...getBtcEthCycleBundle()} />
    </main>
  );
}
