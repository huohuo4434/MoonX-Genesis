"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import zhCN from "@/messages/zh-CN.json";
import zhTW from "@/messages/zh-TW.json";
import en from "@/messages/en.json";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, LOCALES, type Locale } from "./config";

type Dictionary = typeof zhCN;

const DICTIONARIES: Record<Locale, Dictionary> = {
  "zh-CN": zhCN,
  "zh-TW": zhTW as Dictionary,
  en: en as Dictionary,
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
  t: (key: string, vars?: TranslateVars) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Client-only locale provider. There is no URL-prefix routing (`/en/...`)
 * by design — the whole app renders at its existing paths and the active
 * language is purely a client-side presentation concern, persisted to
 * localStorage. The server always renders the default locale (`zh-CN`) so
 * hydration never mismatches; the saved preference is applied in an effect
 * right after mount, before paint is visible to the user in practice.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (saved && (LOCALES as string[]).includes(saved)) {
        setLocaleState(saved as Locale);
      }
    } catch {
      // localStorage unavailable — keep default locale.
    }
    // Intentionally run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Ignore write failures (private browsing, quota, etc).
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);

  const t = useCallback(
    (key: string, vars?: TranslateVars) => {
      const raw = getByPath(DICTIONARIES[locale], key);
      let str = typeof raw === "string" ? raw : key;
      if (vars) {
        for (const [varKey, value] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${varKey}\\}`, "g"), String(value));
        }
      }
      return str;
    },
    [locale]
  );

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale/useTranslations must be used within a <LocaleProvider>");
  }
  return ctx;
}

export function useLocale(): { locale: Locale; setLocale: (locale: Locale) => void } {
  const { locale, setLocale } = useLocaleContext();
  return { locale, setLocale };
}

/** Returns a `t(key, vars?)` translation function bound to the active locale. */
export function useTranslations() {
  return useLocaleContext().t;
}
