import { FedSpecialView } from "@/components/research/FedSeptemberSpecial";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { canReadFedSpecial, FED_SPECIAL } from "@/lib/research/fed-september-2026";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
  return buildLocalizedPageMetadata({
    locale: await getRequestLocale(), basePath: FED_SPECIAL.path,
    titleZh: "9月不加息？MOOX会前判断与验证专题",
    titleEn: "September Fed: Our Hold Call, Before the Decision",
    descriptionZh: "我们的会前判断是9月维持利率不变。免费注册看完整分析、反方风险与明确复盘标准。研究观点，尚未验证。",
    descriptionEn: "Our pre-meeting call is an unchanged target range. Free registration unlocks the thesis, countercase and clear review rules. Not yet verified.",
  });
}

export default async function FedSeptemberPage() {
  const [access, locale] = await Promise.all([getAccessUser(), getRequestLocale()]);
  // Server-side gate: no paid entitlement check and no hidden full text in anonymous HTML/RSC.
  return <FedSpecialView en={locale === "en"} canRead={canReadFedSpecial(access)} />;
}
