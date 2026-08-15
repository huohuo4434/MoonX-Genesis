import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { MemberFounderCyclePage } from "@/components/member/MemberFounderCyclePage";
import { Section } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { founderCycleAccessAction } from "@/lib/data/member-founder-cycle-access-core";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { guardMemberForecastRoute } from "@/lib/route-feature-guards";

const path = "/member/founder-cycle";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({ locale, basePath: path, titleZh: "创始人命理周期研究 | MOOX会员", titleEn: "Founder Cycle Research | MOOX Members", descriptionZh: "会员专享的八字结构、紫微校时、大运流年和历史事件回测研究。", descriptionEn: "Member-only founder research covering Bazi structure, Zi Wei calibration, cycles and historical backtesting." });
}

export default async function MemberFounderCycleRoute() {
  noStore();
  guardMemberForecastRoute();
  const gate = await getMemberDevicePageAccess();
  const action = founderCycleAccessAction(gate.status);
  if (action === "REDIRECT_LOGIN") redirect(`/login?next=${path}`);
  if (action === "REDIRECT_MEMBERSHIP") redirect("/account/membership");
  if (action === "RENDER_DEVICE_GATE") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;

  const [{ getMemberFounderCyclePack20260814 }, { getMemberWealthChainView20260815 }, locale] = await Promise.all([
    import("@/lib/data/member-founder-cycle-20260814"),
    import("@/lib/data/member-wealth-chain-20260815"),
    getRequestLocale(),
  ]);
  const pack = getMemberFounderCyclePack20260814();
  const wealthChain = getMemberWealthChainView20260815();
  return <><MemberDeviceHeartbeat /><MemberFounderCyclePage pack={pack} wealthChain={wealthChain} locale={locale === "en" ? "en" : "zh"} /></>;
}
