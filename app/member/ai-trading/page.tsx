import type { Metadata } from "next";
import { Section } from "@/components/ui";
import { MemberAiTradingDashboardLazy, MemberTradingSetup } from "@/components/member/MemberAiTradingDashboardLazy";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/ai-trading";

export async function generateMetadata(): Promise<Metadata> {
  return buildLocalizedPageMetadata({ locale: await getRequestLocale(), basePath: path,
    titleZh: "AI执行与成绩 | MOOX", titleEn: "AI execution & results | MOOX",
    descriptionZh: "分开查看交易计划、实际持仓和已结束交易成绩。",
    descriptionEn: "Separate trade plans, actual positions and closed-trade results.",
  });
}

export default async function MemberAiTradingPage() {
  const [gate, locale] = await Promise.all([getMemberDevicePageAccess(), getRequestLocale()]);
  const en = locale === "en";
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    return <main><Section spacing="lg"><PublicFeaturePreview
      eyebrow={en ? "AI execution · Public preview" : "AI执行 · 公开预览"}
      title={en ? "See the plan. Check the actual result." : "先看计划，再看真实成绩"}
      description={en ? "Entry conditions, stops, targets and dated results in one place. Membership does not automatically connect or trade your account, and returns are not guaranteed." : "入场条件、止损止盈和有日期的交易记录集中查看。购买会员不会自动接管或交易你的账户，也不保证盈利。"}
      solves={en ? ["Distinguish a plan from a fill", "Know when to wait or when a plan expires", "Review wins and losses together"] : ["分清计划与实际成交", "明确等待条件与计划有效期", "盈利亏损一起复盘"]}
      memberBenefits={en ? ["Plans by asset and horizon", "Execution status and positions", "Completed-trade results", "Optional local connection tutorial"] : ["按标的和周期查看计划", "执行状态与持仓", "已结束交易成绩", "按需查看本地接入教程"]}
      exampleTitle={en ? "How to read a plan" : "每张计划怎么看"}
      exampleLines={en ? ["Entry zone + required confirmation", "Stop + profit targets", "Expiry + actual execution status"] : ["入场区间＋确认条件", "止损＋止盈目标", "有效期＋真实执行状态"]}
      nextPath={path}
      locale={en ? "en" : "zh"}
    /></Section></main>;
  }
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  return <main><Section spacing="lg"><MemberDeviceHeartbeat /><h1 className="mb-4 text-2xl font-semibold">{en ? "AI execution & results" : "AI执行与成绩"}</h1><MemberAiTradingDashboardLazy /><MemberTradingSetup /></Section></main>;
}
