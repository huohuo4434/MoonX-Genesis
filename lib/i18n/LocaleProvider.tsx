"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import zhCN from "@/messages/zh-CN.json";
import zhTW from "@/messages/zh-TW.json";
import en from "@/messages/en.json";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_KEY,
  LOCALE_STORAGE_KEY,
  PUBLIC_LOCALES,
  localizeHref,
  type Locale,
} from "./config";

type Dictionary = typeof zhCN;

const DICTIONARIES: Record<Locale, Dictionary> = {
  "zh-CN": zhCN,
  "zh-TW": zhTW as unknown as Dictionary,
  en: en as unknown as Dictionary,
};

type TranslateVars = Record<string, string | number>;

function getByPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  href: (href: string) => string;
  t: (key: string, vars?: TranslateVars) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Storage may be unavailable in private mode. The cookie and URL remain authoritative.
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    if (!(PUBLIC_LOCALES as string[]).includes(next)) return;
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE_KEY}=${encodeURIComponent(next)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Ignore localStorage failures.
    }
    const nextUrl = localizeHref(`${window.location.pathname}${window.location.search}${window.location.hash}`, next);
    window.location.assign(nextUrl);
  }, []);

  const href = useCallback((value: string) => localizeHref(value, locale), [locale]);

  const t = useCallback(
    (key: string, vars?: TranslateVars) => {
      const raw = getByPath(DICTIONARIES[locale], key);
      const englishFallback = getByPath(DICTIONARIES.en, key);
      let str =
        typeof raw === "string"
          ? raw
          : typeof englishFallback === "string"
            ? englishFallback
            : locale === "zh-CN"
              ? "内容暂不可用"
              : locale === "zh-TW"
                ? "內容暫不可用"
                : "Content unavailable";
      if (vars) {
        for (const [varKey, value] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${varKey}\\}`, "g"), String(value));
        }
      }
      return str;
    },
    [locale]
  );

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale, href, t }), [locale, setLocale, href, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale/useTranslations must be used within a <LocaleProvider>");
  return ctx;
}

export function useLocale(): { locale: Locale; setLocale: (locale: Locale) => void; href: (href: string) => string } {
  const { locale, setLocale, href } = useLocaleContext();
  return { locale, setLocale, href };
}

export function useTranslations() {
  return useLocaleContext().t;
}
