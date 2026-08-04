import type { Metadata } from "next";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { PrivacyPageClient } from "@/components/legal/PrivacyPageClient";
import { siteConfig } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/privacy",
    titleZh: "MOOX隐私政策",
    titleEn: "MOOX Privacy Policy",
    descriptionZh: "MOOX账户、付款、设备及第三方服务隐私政策。",
    descriptionEn: "MOOX privacy policy for accounts, payments, devices and third-party services.",
  });
}



export default function PrivacyPage() {
  return <PrivacyPageClient supportEmail={siteConfig.supportEmail} />;
}
