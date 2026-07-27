"use client";

import { Container } from "@/components/ui";
import { siteConfig } from "@/lib/site-config";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

interface FooterColumn {
  titleKey: string;
  links: { labelKey: string; href: string }[];
}

const footerColumns: FooterColumn[] = [
  {
    titleKey: "footer.product",
    links: [
      { labelKey: "footer.todaysIntelligence", href: "/#markets" },
      { labelKey: "footer.forecasts", href: "/#forecasts" },
      { labelKey: "footer.assetCategories", href: "/#categories" },
      { labelKey: "footer.researchIntelligence", href: "/research" },
      { labelKey: "footer.intelligenceSnapshot", href: "/research/intelligence-snapshot" },
      { labelKey: "footer.researchLibrary", href: "/research/library" },
      { labelKey: "footer.watchlist", href: "/markets/watchlist" },
      { labelKey: "footer.pricing", href: "/pricing" },
    ],
  },
  {
    titleKey: "footer.company",
    links: [
      { labelKey: "footer.aboutMoonx", href: "#" },
      { labelKey: "footer.latestResearch", href: "/#research" },
      { labelKey: "footer.contact", href: "#" },
    ],
  },
  {
    titleKey: "footer.resources",
    links: [
      { labelKey: "footer.methodology", href: "/#methodology" },
      { labelKey: "footer.researchPipeline", href: "/research/pipeline" },
      { labelKey: "footer.timeline", href: "/timeline" },
      { labelKey: "footer.verification", href: "/#verification" },
      { labelKey: "footer.riskDisclosure", href: "#" },
    ],
  },
  {
    titleKey: "footer.legal",
    links: [
      { labelKey: "footer.privacyPolicy", href: "#" },
      { labelKey: "footer.termsOfService", href: "#" },
    ],
  },
];

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
                  <li key={link.labelKey}>
                    <a
                      href={link.href}
                      className="rounded-sm text-body-sm text-foreground-secondary transition-colors hover:text-foreground focus-ring"
                    >
                      {t(link.labelKey)}
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
