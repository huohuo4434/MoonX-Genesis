import type { Metadata } from "next";
import { MemberChannelContent } from "@/components/member/MemberChannelContent";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/member",
    titleZh: "会员频道 | MOOX Intelligence",
    titleEn: "Member Channel | MOOX Intelligence",
    descriptionZh: "从今日决策、周期预测、重点关注到AI交易和复盘验证的统一会员决策台。",
    descriptionEn: "A focused member decision desk for today's plan, multi-horizon forecasts, priority assets, AI trading and reviews.",
  });
}

export default async function MemberChannelPage() {
  const [gate, locale] = await Promise.all([getMemberDevicePageAccess(), getRequestLocale()]);
  const active = gate.status === "ALLOWED";
  return <>
    {active ? <MemberDeviceHeartbeat /> : null}
    <MemberChannelContent locale={locale} active={active} />
  </>;
}
