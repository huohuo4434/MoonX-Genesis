import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Footer, Navbar } from "@/components/layout";
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

// The product is dark-theme-only for now, so the palette lives directly on
// `:root` in globals.css (no `.dark` class needed). If a light theme is
// added later, move the current `:root` values under a `.dark` selector,
// add light equivalents to `:root`, and re-enable `darkMode: ["class"]` in
// tailwind.config.ts.
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
          <Navbar />
          {children}
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}
