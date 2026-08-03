import { Section } from "@/components/ui";
import { MemberMonthlyPage } from "@/components/member/MemberMonthlyPage";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "月度走势分析 | MOOX Intelligence", description: "月度方向、运行路径与关键风险的公开预览及会员完整研究。" };

const path = "/member/monthly";

export default async function MonthlyPage() {
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    return (
      <main><Section spacing="lg"><PublicFeaturePreview
        eyebrow="月度趋势 · 公开预览"
        title="先看整月结构，再安排周内节奏"
        description="月度页把方向、运行路径、关键时间窗和失效条件放在同一套结构中，帮助用户区分中期判断与短线入场。"
        solves={["避免把单日波动误当成整月趋势", "提前识别可能的先涨后跌、先跌后涨结构", "把月度判断与周度、日度确认分开"]}
        memberBenefits={["核心市场完整月度方向与概率", "月内运行路径和关键时间窗", "六爻、奇门与技术结构依据", "风险提示、确认条件与失效条件"]}
        exampleTitle="黄金 · 月度结构示例"
        exampleLines={["收盘方向概率：上涨 42% / 震荡 33% / 下跌 25%", "运行路径倾向：月初整理 → 月中反弹 → 月末等待确认", "信号强度：中", "关键价位：仅在取得真实技术数据后展示"]}
        nextPath={path}
      /></Section></main>
    );
  }
  if (gate.status === "DEVICE_REQUIRED") {
    return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  }
  return <main><Section spacing="lg"><MemberDeviceHeartbeat /><MemberMonthlyPage /></Section></main>;
}
