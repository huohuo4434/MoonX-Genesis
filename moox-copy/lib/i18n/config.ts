/**
 * Core i18n configuration for MoonX. This is a lightweight, typed,
 * client-only locale system (no URL-prefix routing) — chosen over
 * next-intl to avoid restructuring existing routes/pages. See
 * `lib/i18n/LocaleProvider.tsx` for the runtime provider and
 * `docs/ARCHITECTURE.md` for the rationale.
 */

export type Locale = "zh-CN" | "zh-TW" | "en";

export const LOCALES: Locale[] = ["zh-CN", "zh-TW", "en"];

export const DEFAULT_LOCALE: Locale = "zh-CN";

export const LOCALE_STORAGE_KEY = "moonx-locale";

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

/** Multilingual field used throughout the research data model (`types/research.ts`). */
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

/** Resolves a `LocalizedText` field to a plain string for the active locale. */
export function pickLocalized(text: LocalizedText | undefined | null, locale: Locale): string {
  if (!text) return "";
  return text[LOCALE_KEY_MAP[locale]] || text.en || text.zhCN || "";
}

/** Convenience constructor so data files can write `lt("中文", "中文", "English")`. */
export function lt(zhCN: string, zhTW: string, en: string): LocalizedText {
  return { zhCN, zhTW, en };
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}
