import "server-only";

import zhCN from "@/messages/zh-CN.json";
import zhTW from "@/messages/zh-TW.json";
import en from "@/messages/en.json";
import type { Locale } from "@/lib/i18n/config";

export type LocaleMessages = Record<string, unknown>;

function isMessageGroup(value: unknown): value is LocaleMessages {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeMessages(fallback: LocaleMessages, localized: LocaleMessages): LocaleMessages {
  const merged: LocaleMessages = { ...fallback };
  for (const [key, value] of Object.entries(localized)) {
    const fallbackValue = merged[key];
    merged[key] = isMessageGroup(fallbackValue) && isMessageGroup(value)
      ? mergeMessages(fallbackValue, value)
      : value;
  }
  return merged;
}

const EN_MESSAGES = en as LocaleMessages;
const MESSAGES_BY_LOCALE: Record<Locale, LocaleMessages> = {
  en: EN_MESSAGES,
  "zh-CN": mergeMessages(EN_MESSAGES, zhCN as LocaleMessages),
  "zh-TW": mergeMessages(EN_MESSAGES, zhTW as LocaleMessages),
};

export function getLocaleMessages(locale: Locale): LocaleMessages {
  return MESSAGES_BY_LOCALE[locale];
}
