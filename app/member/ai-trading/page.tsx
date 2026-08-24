import type { Metadata } from "next";
import { Section } from "@/components/ui";
import { MemberTradingOnboarding } from "@/components/member/MemberTradingOnboarding";
import { MemberAiTradingDashboardLazy } from "@/components/member/MemberAiTradingDashboardLazy";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/ai-trading";

export const metadata: Metadata = { title: "会员AI交易接入 | MOOX", description: "会员本地Bitget Agent安全接入、试运行方法选择与风险教程。" };

export default async function MemberAiTradingPage() {
  const [gate, locale] = await Promise.all([getMemberDevicePageAccess(), getRequestLocale()]);
  const en = locale === "en";
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    return <main><Section spacing="lg"><PublicFeaturePreview
      eyebrow={en ? "AI trading access · Public preview" : "AI自动交易接入 · 公开预览"}
      title={en ? "Connect safely, then choose which research method to follow" : "先安全接入，再选择跟随哪套研究方法"}
      description={en ? "Members receive a guided Bitget API connection workflow and can follow one of six research combinations. The system remains in trial operation; risk controls and small sizing are mandatory." : "会员可按教程接入Bitget API，并从六套试运行方法中选择跟随。系统仍处于试运行阶段，必须保留止损、仓位和回撤保护，不建议大仓位。"}
      solves={en ? ["Connect without exposing withdrawal authority", "Keep API/IP-whitelist choices explicit", "See entry, stop, targets and rationale before following"] : ["接入时不授予提现权限", "清楚选择是否启用IP白名单", "跟单前看清开仓、止损、止盈与研究理由"]}
      memberBenefits={en ? ["Step-by-step exchange API tutorial", "Six selectable trial methodologies", "Short-, medium- and long-horizon order plans", "Execution status and risk warnings"] : ["交易所API逐步接入教程", "六套可选试运行方法", "短线、中线、长线订单计划", "执行状态与风险提示"]}
      exampleTitle={en ? "Trial methodology examples" : "六套试运行方法"}
      exampleLines={en ? ["Liu Yao", "Qimen", "Liu Yao + Qimen resonance", "Liu Yao + Chan", "Qimen + Chan", "Liu Yao + Qimen + Chan resonance"] : ["六爻", "奇门", "六爻＋奇门共振", "六爻＋缠论", "奇门＋缠论", "六爻＋奇门＋缠论共振"]}
      nextPath={path}
    /></Section></main>;
  }
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  return <main><Section spacing="lg"><MemberDeviceHeartbeat /><MemberAiTradingDashboardLazy /><MemberTradingOnboarding /></Section></main>;
}
