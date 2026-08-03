import type { Metadata } from "next";
import { SupportPageClient } from "@/components/support/SupportPageClient";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "MOOX Support",
  description: "MOOX account, membership, payment and forecast support.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return <SupportPageClient telegram={siteConfig.telegram} supportEmail={siteConfig.supportEmail} />;
}
