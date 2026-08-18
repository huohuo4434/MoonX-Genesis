import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Badge, Heading, Section, Text } from "@/components/ui";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { MemberRecommendationList } from "@/components/conviction/MemberRecommendationList";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { getConvictionListPagePayload } from "@/lib/data/conviction/access";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic"; export const revalidate = 0; const path = "/member/stock-picks";
export async function generateMetadata(): Promise<Metadata> { const locale = await getRequestLocale(); return buildLocalizedPageMetadata({ locale, basePath: path, titleZh: "会员专享股票推荐 | MOOX", titleEn: "Member Stock Picks | MOOX", descriptionZh: "股票多周期方向、关键人物周期、执行位置与历史验证。", descriptionEn: "Member stock research with multi-horizon calls, key-person context, execution levels and verification." }); }
export default async function MemberStockPicksPage(){noStore();const gate=await getMemberDevicePageAccess();if(gate.status==="LOGIN_REQUIRED")redirect(`/login?next=${path}`);if(gate.status==="MEMBERSHIP_REQUIRED")redirect("/pricing");if(gate.status==="DEVICE_REQUIRED")return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path}/></Section></main>;const payload=await getConvictionListPagePayload();return <><MemberDeviceHeartbeat/><main className="min-h-screen bg-[#07080a] text-white"><Section spacing="lg"><div className="mx-auto w-full max-w-[1180px]"><Badge variant="default">会员专享</Badge><Heading as="h1" size="h2" className="mt-4 text-white">股票推荐</Heading><Text variant="body" className="mt-3 block max-w-3xl text-white/58">先看方向、周期和失效条件。创始人或关键人物周期放在相应个股详情内，只调整信心与风险，不替代股票自身判断。</Text><div className="mt-7"><MemberRecommendationList payload={payload} kind="STOCK"/></div></div></Section></main></>}
