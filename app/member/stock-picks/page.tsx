import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Badge, Heading, Section, Text } from "@/components/ui";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { MemberStockResearchDashboard } from "@/components/conviction/MemberStockResearchDashboard";
import { SeptemberSectorComparison } from "@/components/conviction/SeptemberSectorComparison";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { getConvictionListPagePayload } from "@/lib/data/conviction/access";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic"; export const revalidate = 0; const path = "/member/stock-picks";
export async function generateMetadata(): Promise<Metadata> { const locale = await getRequestLocale(); return buildLocalizedPageMetadata({ locale, basePath: path, titleZh: "会员专享股票推荐 | MOOX", titleEn: "Member Stock Picks | MOOX", descriptionZh: "从整月路线、当前阶段、本周六爻到日内奇门与缠论交叉验证。", descriptionEn: "Member stock research from monthly path and current stage to weekly Liu Yao and daily cross-checks." }); }
export default async function MemberStockPicksPage(){noStore();const gate=await getMemberDevicePageAccess();if(gate.status==="LOGIN_REQUIRED")redirect(`/login?next=${path}`);if(gate.status==="MEMBERSHIP_REQUIRED")redirect("/pricing");if(gate.status==="DEVICE_REQUIRED")return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path}/></Section></main>;const payload=await getConvictionListPagePayload();return <><MemberDeviceHeartbeat/><main className="min-h-screen bg-[#07080a] text-white"><Section spacing="lg"><div className="mx-auto w-full max-w-[1240px]"><Badge variant="default">会员专享</Badge><Heading as="h1" size="h2" className="mt-4 text-white">股票推荐 · 月周日路线</Heading><Text variant="body" className="mt-3 block max-w-4xl text-white/58">先看整月方向与当前阶段，再看本周主走势；日分析并列周内节奏、奇门和4H缠论，缺少证据直接留空。</Text><div className="mt-7"><SeptemberSectorComparison/></div><div className="mt-7"><MemberStockResearchDashboard rows={payload.stockResearchRows ?? []}/></div></div></Section></main></>}
