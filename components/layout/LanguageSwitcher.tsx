"use client";

import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/components/ui";
import { GlobeIcon, CheckIcon, ChevronsUpDownIcon } from "@/components/icons";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

/** Desktop language switcher: "🌐 简体中文" trigger + dropdown of the three locales. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useTranslations();

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          type="button"
          aria-label={t("nav.language")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-border/[0.1] bg-surface px-2.5 py-2 text-body-sm text-foreground-secondary transition-colors hover:text-foreground focus-ring",
            className
          )}
        >
          <GlobeIcon size={15} aria-hidden="true" />
          <span>{LOCALE_LABELS[locale]}</span>
          <ChevronsUpDownIcon size={12} className="text-foreground-tertiary" aria-hidden="true" />
        </button>
      </DropdownTrigger>
      <DropdownContent align="end" className="min-w-[9rem]">
        {LOCALES.map((option) => (
          <DropdownItem
            key={option}
            onSelect={() => setLocale(option)}
            className="justify-between"
          >
            {LOCALE_LABELS[option]}
            {option === locale && <CheckIcon size={13} className="text-primary" aria-hidden="true" />}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}

/** Mobile language switcher: a clearly visible row of three pills, no dropdown. */
export function MobileLanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useTranslations();

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="px-3 text-label uppercase tracking-wide text-foreground-tertiary">
        {t("nav.language")}
      </span>
      <div className="flex items-center gap-2 px-3" role="group" aria-label={t("nav.language")}>
        {LOCALES.map((option) => {
          const active = option === locale;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => setLocale(option)}
              className={cn(
                "flex-1 rounded-md border px-2 py-2 text-caption font-medium transition-colors focus-ring",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/[0.1] bg-surface text-foreground-secondary hover:text-foreground"
              )}
            >
              {LOCALE_LABELS[option as Locale]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
