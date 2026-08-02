import type { Metadata, Viewport } from "next";
import { FooterShell, NavbarShell } from "@/components/layout";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { siteConfig } from "@/lib/site-config";
import { runResearchDataValidation } from "@/lib/research/run-validation";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: { type: "website", locale: "zh_CN", siteName: siteConfig.name, title: siteConfig.name, description: siteConfig.description, url: siteConfig.url, images: [{ url: "/moox-og.png", width: 1200, height: 630, alt: "MOOX Intelligence" }] },
  twitter: { card: "summary_large_image", title: siteConfig.name, description: siteConfig.description, images: ["/moox-og.png"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#09090b" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (process.env.NODE_ENV !== "production") await runResearchDataValidation();
  const structuredData = { "@context": "https://schema.org", "@type": "Organization", name: siteConfig.name, url: siteConfig.url, contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: siteConfig.supportEmail }] };
  return <html lang={DEFAULT_LOCALE}><body className="font-sans antialiased"><LocaleProvider><NavbarShell /><div className="pb-20 md:pb-0">{children}</div><FooterShell /><MobileBottomNav /></LocaleProvider><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\u003c") }} /></body></html>;
}
