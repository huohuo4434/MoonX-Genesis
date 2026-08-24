import "server-only";

import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE_KEY, englishPath, isLocale, type Locale } from "@/lib/i18n/config";
import { siteConfig } from "@/lib/site-config";

export const ENGLISH_SITE_DESCRIPTION =
  "Structured market outlooks for Bitcoin, Ether, global equity indices, gold, silver and WTI—combining Liu Yao directional analysis, Qimen timing, technical market structure, key levels and public verification.";

export async function getRequestLocale(): Promise<Locale> {
  const h = await headers();
  const headerLocale = h.get("x-moox-locale");
  if (headerLocale && isLocale(headerLocale)) return headerLocale;
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE_KEY)?.value;
  return cookieLocale && isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
}

export async function getOriginalPathname(fallback = "/"): Promise<string> {
  const h = await headers();
  return h.get("x-moox-original-path") || fallback;
}

export async function isEnglishRequest(): Promise<boolean> {
  return (await getRequestLocale()) === "en";
}

export function localizedAlternates(basePath: string, locale: Locale) {
  const canonical = locale === "en" ? englishPath(basePath) : basePath;
  return {
    canonical,
    languages: {
      "zh-CN": basePath,
      "zh-TW": basePath,
      en: englishPath(basePath),
      "x-default": basePath,
    },
  } as const;
}

export function buildLocalizedPageMetadata(input: {
  locale: Locale;
  basePath: string;
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  descriptionEn: string;
  index?: boolean;
}): Metadata {
  const { locale, basePath, titleZh, titleEn, descriptionZh, descriptionEn } = input;
  const english = locale === "en";
  // Root layout already appends the site name through its title template.
  // Remove legacy trailing brand fragments so browser titles never become
  // "... | MOOX Intelligence · MOOX Intelligence".
  const title = (english ? titleEn : titleZh)
    .replace(/\s*[|·]\s*MOOX(?:\s+Intelligence|会员|\s+Members)?\s*$/iu, "")
    .trim();
  const description = english ? descriptionEn : descriptionZh;
  const canonicalPath = english ? englishPath(basePath) : basePath;
  return {
    title,
    description,
    alternates: localizedAlternates(basePath, locale),
    robots: { index: input.index ?? true, follow: input.index ?? true },
    openGraph: {
      type: "website",
      locale: english ? "en_US" : "zh_CN",
      alternateLocale: english ? ["zh_CN"] : ["en_US"],
      siteName: siteConfig.name,
      title,
      description,
      url: canonicalPath,
      images: [{
        url: english ? "/moox-og-en.png" : "/moox-og.png",
        width: 1200,
        height: 630,
        alt: english ? "MOOX Intelligence — Direction First" : "MOOX Intelligence",
      }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [english ? "/moox-og-en.png" : "/moox-og.png"],
    },
  };
}
