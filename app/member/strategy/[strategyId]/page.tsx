import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { StrategyDetailPage } from "@/components/member/StrategyDetailPage";
import { Section } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { getStrategyCenterRow, getStrategyCenterSnapshot, getStrategyCenterTrades } from "@/lib/presentation/strategy-center";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const basePath = "/member/strategy";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath,
    titleZh: "策略详情 | MOOX",
    titleEn: "Strategy Detail | MOOX",
    descriptionZh: "策略表现、运行记录、交易记录与订单动作。",
    descriptionEn: "Strategy performance, running records, trades and order actions.",
  });
}

export default async function MemberStrategyDetailPage({ params }: { params: Promise<{ strategyId: string }> }) {
  noStore();
  const { strategyId } = await params;
  const path = `${basePath}/${strategyId}`;
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED") redirect(`/login?next=${encodeURIComponent(path)}`);
  if (gate.status === "MEMBERSHIP_REQUIRED") redirect("/pricing");
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  const snapshot = await getStrategyCenterSnapshot();
  const strategy = getStrategyCenterRow(snapshot, strategyId);
  if (!strategy) notFound();
  return <><MemberDeviceHeartbeat /><StrategyDetailPage strategy={strategy} trades={getStrategyCenterTrades(snapshot, strategyId)} /></>;
}
