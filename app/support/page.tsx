import type { Metadata } from "next";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { SupportPageClient } from "@/components/support/SupportPageClient";
import { siteConfig } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/support",
    titleZh: "MOOX客服与帮助",
    titleEn: "MOOX Support",
    descriptionZh: "MOOX账户、会员、付款和预测内容支持。",
    descriptionEn: "Support for MOOX accounts, membership, payments and published research.",
  });
}



export default function SupportPage() {
  return <SupportPageClient telegram={siteConfig.telegram} supportEmail={siteConfig.supportEmail} />;
}
