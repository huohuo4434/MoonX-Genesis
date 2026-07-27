"use client";

import { Container } from "@/components/ui";
import { siteConfig } from "@/lib/site-config";
import { footerColumns } from "@/lib/navigation";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export function Footer() {
  const year = new Date().getFullYear();
  const t = useTranslations();

  return (
    <footer className="border-t border-border/[0.08]">
      <Container size="lg" className="py-2xl">
        <div className="grid grid-cols-2 gap-xl sm:grid-cols-2 lg:grid-cols-5">
          <div className="col-span-2 flex flex-col gap-3 lg:col-span-1">
            <span className="flex items-center gap-2 text-body font-semibold text-foreground">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-caption font-bold text-primary-foreground">
                M
              </span>
              {siteConfig.name}
            </span>
            <p className="max-w-[22ch] text-caption text-foreground-tertiary">{t("footer.tagline")}</p>
          </div>

          {footerColumns.map((column) => (
            <nav key={column.titleKey} aria-label={t(column.titleKey)} className="flex flex-col gap-3">
              <span className="text-label uppercase tracking-wide text-foreground-tertiary">
                {t(column.titleKey)}
              </span>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.key}>
                    <a
                      href={link.href}
                      className="rounded-sm text-body-sm text-foreground-secondary transition-colors hover:text-foreground focus-ring"
                    >
                      {t(link.key)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-2xl flex flex-col gap-4 border-t border-border/[0.08] pt-lg sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-foreground-tertiary">
            {t("footer.copyright", { year, name: siteConfig.name })}
          </p>
          <p className="text-caption text-foreground-tertiary">{t("footer.disclaimer")}</p>
        </div>
      </Container>
    </footer>
  );
}
