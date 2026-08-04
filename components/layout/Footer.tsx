"use client";

import Link from "next/link";
import { Container } from "@/components/ui";
import { siteConfig } from "@/lib/site-config";
import type { NavItem } from "@/lib/navigation";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";

export function Footer({ footerColumns }: { footerColumns: Array<{ titleKey: string; titleZh?: string; links: NavItem[] }> }) {
  const year = new Date().getFullYear();
  const t = useTranslations();
  const { locale, href } = useLocale();
  const label = (item: NavItem) => locale === "zh-CN" ? item.labelZh : t(item.key);
  return (
    <footer className="border-t border-border/[0.08]">
      <Container size="lg" className="py-2xl">
        <div className="grid grid-cols-2 gap-xl sm:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
            <span className="flex items-center gap-2 text-body font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-caption font-bold text-primary-foreground">M</span>
              {siteConfig.name}
            </span>
            <p className="max-w-[28ch] text-caption text-foreground-tertiary">{t("footer.tagline")}</p>
            <a className="min-h-11 w-fit rounded-md py-3 text-body-sm text-primary focus-ring" href="https://t.me/jackuwin" target="_blank" rel="noreferrer">Telegram @jackuwin</a>
          </div>
          {footerColumns.map((column) => {
            const title = locale === "zh-CN" ? (column.titleZh ?? t(column.titleKey)) : t(column.titleKey);
            return <nav key={column.titleKey} aria-label={title} className="flex flex-col gap-3">
              <span className="text-label uppercase tracking-wide text-foreground-tertiary">{title}</span>
              <ul className="flex flex-col gap-1">
                {column.links.map((link) => <li key={link.key}><Link href={href(link.href)} prefetch={false} className="flex min-h-11 items-center rounded-md py-2 text-body-sm text-foreground-secondary transition-colors hover:text-foreground focus-ring">{label(link)}</Link></li>)}
              </ul>
            </nav>;
          })}
        </div>
        <div className="mt-2xl flex flex-col gap-4 border-t border-border/[0.08] pt-lg sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-foreground-tertiary">{t("footer.copyright", { year, name: siteConfig.name })}</p>
          <p className="text-caption text-foreground-tertiary">{t("footer.disclaimer")}</p>
        </div>
      </Container>
    </footer>
  );
}
