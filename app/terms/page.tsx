import type { Metadata } from "next";
import { TermsPageClient } from "@/components/legal/TermsPageClient";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "MOOX Terms of Service",
  description: "MOOX terms covering membership, founding-member discounts, USDT payment and automatic on-chain verification.",
};

export default function TermsPage() {
  return <TermsPageClient supportEmail={siteConfig.supportEmail} />;
}
