import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { FooterShell, NavbarShell } from "@/components/layout";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { siteConfig } from "@/lib/site-config";
import { runResearchDataValidation } from "@/lib/research/run-validation";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (process.env.NODE_ENV !== "production") {
    await runResearchDataValidation();
  }

  return (
    <html lang={DEFAULT_LOCALE}>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <LocaleProvider>
          <NavbarShell />
          <div className="pb-16 md:pb-0">{children}</div>
          <FooterShell />
          <MobileBottomNav />
        </LocaleProvider>
      </body>
    </html>
  );
}
