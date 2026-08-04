import type { Metadata } from "next";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { Section } from "@/components/ui";
import { AiTradingDeskClient } from "@/components/member/AiTradingDeskClient";
import { PublicFeaturePreview } from "@/components/access/PublicFeaturePreview";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { getMemberAiTradingDeskSnapshot } from "@/lib/trading-signals/member-ai-trading-desk";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/member/ai-trading",
    titleZh: "AI策略公开台 | MOOX Intelligence",
    titleEn: "AI Strategy Desk | MOOX Intelligence",
    descriptionZh: "模拟策略计划、条件监控、模拟成交与复盘。",
    descriptionEn: "Follow locked strategy plans, confirmation conditions, Bitget Demo positions and completed simulated trades.",
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/ai-trading";

export default async function MemberAiTradingDeskPage() {
  const [gate, locale] = await Promise.all([getMemberDevicePageAccess(), getRequestLocale()]);
  const en = locale === "en";
  if (gate.status === "LOGIN_REQUIRED" || gate.status === "MEMBERSHIP_REQUIRED") {
    return <main><Section spacing="lg"><PublicFeaturePreview
      eyebrow={en ? "Simulated strategy record · Public preview" : "模拟策略公开记录 · 公开预览"}
      title={en ? "AI Strategy Desk: follow the plan, conditions and evidence" : "AI策略公开台：看策略如何执行，而不是只看一句方向"}
      description={en ? "The Strategy Desk records plans, required confirmation, Bitget Demo execution and post-trade review. It does not connect to real funds or provide managed trading." : "公开台展示模拟策略的计划、执行与复盘结构。它用于公开记录和验证，不连接真实资金，也不代表代客交易。"}
      solves={en ? ["Separate directional research from execution rules", "Check whether entries, stops and exits follow the plan", "Evaluate a continuous record rather than isolated screenshots"] : ["区分预测观点与实际执行规则", "查看策略是否遵守入场、止损和退出条件", "用连续记录而不是单次截图评估表现"]}
      memberBenefits={en ? ["Full simulated strategy plans and current status", "Recent Demo trades, stops, targets and reviews", "Performance and drawdown summaries", "Links between plans and member signals"] : ["完整模拟策略计划与当前状态", "最近成交、止损止盈与复盘", "策略表现与回撤摘要", "与会员交易信号的对应关系"]}
      exampleTitle={en ? "Bitcoin simulated plan example" : "BTC模拟策略记录示例"}
      exampleLines={en ? ["Plan status: monitoring; do not chase", "Trigger: price structure and volume must confirm together", "Risk control: per-trade risk follows the locked plan", "Result: locked and moved to verification after completion"] : ["计划状态：等待确认，不追涨", "触发条件：价格结构与成交量同时满足", "风险控制：单次风险上限按策略规则执行", "结果记录：完成后锁定并进入公开验证"]}
      nextPath={path}
    /></Section></main>;
  }
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  const snapshot = await getMemberAiTradingDeskSnapshot();
  return <main><Section spacing="lg"><MemberDeviceHeartbeat /><AiTradingDeskClient initial={snapshot} /></Section></main>;
}
