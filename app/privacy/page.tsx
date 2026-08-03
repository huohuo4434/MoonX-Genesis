import type { Metadata } from "next";
import { PrivacyPageClient } from "@/components/legal/PrivacyPageClient";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "MOOX Privacy Policy",
  description: "MOOX privacy policy for accounts, payments, devices and third-party services.",
};

export default function PrivacyPage() {
  return <PrivacyPageClient supportEmail={siteConfig.supportEmail} />;
}
