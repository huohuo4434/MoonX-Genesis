import type { Metadata } from "next";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { TermsPageClient } from "@/components/legal/TermsPageClient";
import { siteConfig } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/terms",
    titleZh: "MOOX服务条款",
    titleEn: "MOOX Terms of Service",
    descriptionZh: "MOOX会员、USDT付款、账户与研究服务条款。",
    descriptionEn: "MOOX terms covering membership, USDT payment, accounts, research access and public verification.",
  });
}



export default function TermsPage() {
  return <TermsPageClient supportEmail={siteConfig.supportEmail} />;
}
