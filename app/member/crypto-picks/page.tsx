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

export const dynamic = "force-dynamic"; export const revalidate = 0; const path = "/member/crypto-picks";
export async function generateMetadata(): Promise<Metadata> { const locale = await getRequestLocale(); return buildLocalizedPageMetadata({ locale, basePath: path, titleZh: "会员专享加密货币推荐 | MOOX", titleEn: "Member Crypto Picks | MOOX", descriptionZh: "加密资产多周期方向、周内节奏、资金结构与执行位置。", descriptionEn: "Member crypto research with multi-horizon calls, weekly rhythm, market structure and execution levels." }); }
export default async function MemberCryptoPicksPage(){noStore();const gate=await getMemberDevicePageAccess();if(gate.status==="LOGIN_REQUIRED")redirect(`/login?next=${path}`);if(gate.status==="MEMBERSHIP_REQUIRED")redirect("/pricing");if(gate.status==="DEVICE_REQUIRED")return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path}/></Section></main>;const payload=await getConvictionListPagePayload();return <><MemberDeviceHeartbeat/><main className="min-h-screen bg-[#07080a] text-white"><Section spacing="lg"><div className="mx-auto w-full max-w-[1180px]"><Badge variant="default">会员专享</Badge><Heading as="h1" size="h2" className="mt-4 text-white">加密货币推荐</Heading><Text variant="body" className="mt-3 block max-w-3xl text-white/58">列表给明确结论和周期，详情页再展开奇门、六爻、资金结构与技术位置。实验雷达只提供线索，不直接触发实盘。</Text><div className="mt-7"><MemberRecommendationList payload={payload} kind="CRYPTO"/></div></div></Section></main></>}
