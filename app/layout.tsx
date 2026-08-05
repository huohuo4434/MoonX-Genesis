import type { Metadata, Viewport } from "next";
import { FooterShell, NavbarShell } from "@/components/layout";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { MemberWelcomeGuide } from "@/components/onboarding/MemberWelcomeGuide";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { englishPath } from "@/lib/i18n/config";
import {
  ENGLISH_SITE_DESCRIPTION,
  getOriginalPathname,
  getRequestLocale,
  localizedAlternates,
} from "@/lib/i18n/server";
import { siteConfig } from "@/lib/site-config";
import { runResearchDataValidation } from "@/lib/research/run-validation";
import "@/styles/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const originalPath = await getOriginalPathname("/");
  const basePath = originalPath === "/en" ? "/" : originalPath.startsWith("/en/") ? originalPath.slice(3) : originalPath;
  const english = locale === "en";
  const description = english ? ENGLISH_SITE_DESCRIPTION : siteConfig.description;
  const canonical = english ? englishPath(basePath) : basePath;
  return {
    title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
    description,
    metadataBase: new URL(siteConfig.url),
    alternates: localizedAlternates(basePath, locale),
    openGraph: {
      type: "website",
      locale: english ? "en_US" : "zh_CN",
      alternateLocale: english ? ["zh_CN"] : ["en_US"],
      siteName: siteConfig.name,
      title: english ? "MOOX Intelligence | Direction First. Confirmation Before Entry." : siteConfig.name,
      description,
      url: canonical,
      images: [{
        url: english ? "/moox-og-en.png" : "/moox-og.png",
        width: 1200,
        height: 630,
        alt: english ? "MOOX Intelligence — Direction First" : "MOOX Intelligence",
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: english ? "MOOX Intelligence | Direction First. Confirmation Before Entry." : siteConfig.name,
      description,
      images: [english ? "/moox-og-en.png" : "/moox-og.png"],
    },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#09090b" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (process.env.NODE_ENV !== "production") await runResearchDataValidation();
  const locale = await getRequestLocale();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: siteConfig.supportEmail }],
  };
  return (
    <html lang={locale}>
      <body className="font-sans antialiased">
        <LocaleProvider initialLocale={locale}>
          <NavbarShell />
          <MemberWelcomeGuide />
          <div className="pb-20 md:pb-0">{children}</div>
          <FooterShell />
          <MobileBottomNav />
        </LocaleProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      </body>
    </html>
  );
}
