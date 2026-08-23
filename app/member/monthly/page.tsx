import type { Metadata } from "next";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { Section } from "@/components/ui";
import { MemberMonthlyPage } from "@/components/member/MemberMonthlyPage";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { getMemberCycleResearchOverlays } from "@/lib/research/cycle-research-member-overlay.server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/member/monthly",
    titleZh: "会员月走势预测 | MOOX Intelligence",
    titleEn: "Monthly Outlook | MOOX Intelligence",
    descriptionZh: "月度主方向、月内路径、关键周、风险与失效条件。",
    descriptionEn: "Monthly direction, probabilities, expected paths, timing windows and key risks across core markets.",
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/monthly";

export default async function MonthlyPage() {
  const [gate, locale] = await Promise.all([getMemberDevicePageAccess(), getRequestLocale()]);
  const en = locale === "en";
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    return <main><Section spacing="lg"><PublicFeaturePreview
      eyebrow={en ? "Monthly outlook · Public preview" : "月度趋势 · 公开预览"}
      title={en ? "See the monthly structure before planning weekly execution" : "先看整月结构，再安排周内节奏"}
      description={en ? "The monthly page shows Liuyao and Qimen as independent forecasts, raises confidence when they agree, and keeps both views visible with lower confidence when they diverge. Technical analysis only supplies structure and levels." : "月度页分别展示六爻与奇门的独立方向：同向提高信心，分歧时并列两种观点并降低信心；技术分析只补充结构与点位。"}
      solves={en ? ["Avoid treating one-day volatility as a monthly trend", "Identify rally-then-fade or dip-then-rebound structures early", "Separate monthly research from weekly and daily confirmation"] : ["避免把单日波动误当成整月趋势", "提前识别可能的先涨后跌、先跌后涨结构", "把月度判断与周度、日度确认分开"]}
      memberBenefits={en ? ["Complete monthly direction and scenario weights", "Expected path and timing windows", "Liu Yao, Qimen and technical-structure evidence", "Risk notes, confirmation and invalidation"] : ["核心市场完整月度方向与情景权重", "月内运行路径和关键时间窗", "六爻、奇门与技术结构依据", "风险提示与技术点位参考"]}
      exampleTitle={en ? "Gold · Monthly structure example" : "黄金 · 月度结构示例"}
      exampleLines={en ? ["Scenario weights: bullish 42% / range-bound 33% / bearish 25%", "Expected path: early consolidation → mid-month rebound → confirmation near month-end", "Method relation: Liuyao-Qimen resonance or visible divergence", "Key levels appear only when verified technical data is available"] : ["情景权重：上涨 42% / 震荡 33% / 下跌 25%（不参与方向投票）", "运行路径：月初整理 → 月中反弹 → 月末观察节奏", "方法关系：奇六共振，或分歧并列并降低信心", "关键价位：仅在取得真实技术数据后展示"]}
      nextPath={path}
    /></Section></main>;
  }
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  const cycleResearchOverlays = getMemberCycleResearchOverlays();
  return <main><Section spacing="lg"><MemberDeviceHeartbeat /><MemberMonthlyPage cycleResearchOverlays={cycleResearchOverlays} /></Section></main>;
}
