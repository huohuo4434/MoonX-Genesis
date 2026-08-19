import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { StrategyCenterPage } from "@/components/member/StrategyCenterPage";
import { Section } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { getStrategyCenterSnapshot } from "@/lib/presentation/strategy-center";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/strategy";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "策略中心 | MOOX",
    titleEn: "Strategy Center | MOOX",
    descriptionZh: "MOOX策略表现、运行交易和策略详情只读中心。",
    descriptionEn: "Read-only MOOX strategy performance and running-trade center.",
  });
}

export default async function MemberStrategyPage() {
  noStore();
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED") redirect(`/login?next=${path}`);
  if (gate.status === "MEMBERSHIP_REQUIRED") redirect("/pricing");
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  const snapshot = await getStrategyCenterSnapshot();
  return <><MemberDeviceHeartbeat /><StrategyCenterPage snapshot={snapshot} /></>;
}
