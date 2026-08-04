/** Core locale configuration shared by server and client rendering. */
export type Locale = "zh-CN" | "zh-TW" | "en";

export const LOCALES: Locale[] = ["zh-CN", "zh-TW", "en"];
export const ENGLISH_PUBLIC_ENABLED = true;
export const PUBLIC_LOCALES: Locale[] = LOCALES;
export const DEFAULT_LOCALE: Locale = "zh-CN";
export const LOCALE_STORAGE_KEY = "moonx-locale";
export const LOCALE_COOKIE_KEY = "moox-locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
};

export const LOCALE_SHORT_LABELS: Record<Locale, string> = {
  "zh-CN": "简",
  "zh-TW": "繁",
  en: "EN",
};

export interface LocalizedText {
  zhCN: string;
  zhTW: string;
  en: string;
}

const LOCALE_KEY_MAP: Record<Locale, keyof LocalizedText> = {
  "zh-CN": "zhCN",
  "zh-TW": "zhTW",
  en: "en",
};

export function pickLocalized(text: LocalizedText | undefined | null, locale: Locale): string {
  if (!text) return "";
  if (locale === "en") return text.en || ENGLISH_CONTENT_PENDING;
  return text[LOCALE_KEY_MAP[locale]] || text.zhCN || text.en || "";
}

export function lt(zhCN: string, zhTW: string, en: string): LocalizedText {
  return { zhCN, zhTW, en };
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}

export const ENGLISH_CONTENT_PENDING =
  "The English version of this research note is being prepared. The published Chinese source remains locked and unchanged.";

const EXTERNAL_HREF = /^(?:[a-z]+:)?\/\//i;

/** Prefixes internal links with /en and removes that prefix for Chinese locales. */
export function localizeHref(href: string, locale: Locale): string {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || EXTERNAL_HREF.test(href)) {
    return href;
  }
  const normalized = href.startsWith("/") ? href : `/${href}`;
  if (locale === "en") {
    if (normalized === "/en" || normalized.startsWith("/en/")) return normalized;
    return normalized === "/" ? "/en" : `/en${normalized}`;
  }
  if (normalized === "/en") return "/";
  return normalized.startsWith("/en/") ? normalized.slice(3) || "/" : normalized;
}

export function basePathFromLocalized(pathname: string): string {
  if (pathname === "/en") return "/";
  if (pathname.startsWith("/en/")) return pathname.slice(3) || "/";
  return pathname || "/";
}

export function englishPath(pathname: string): string {
  const base = basePathFromLocalized(pathname);
  return base === "/" ? "/en" : `/en${base}`;
}
