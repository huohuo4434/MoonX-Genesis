"use client";

import Link from "next/link";
import { useState } from "react";
import { Container, Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui";
import { CloseIcon, MenuIcon } from "@/components/icons";
import { LanguageSwitcher, MobileLanguageSwitcher } from "./LanguageSwitcher";
import { NavbarSession } from "./NavbarSession";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import type { NavItem } from "@/lib/navigation";

export function Navbar({
  primaryNav,
  moreNav,
  adminEnabled = true,
  publicSignupEnabled = true,
}: {
  primaryNav: NavItem[];
  moreNav: NavItem[];
  adminEnabled?: boolean;
  publicSignupEnabled?: boolean;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = useTranslations();
  const { locale } = useLocale();

  const label = (link: NavItem) =>
    locale === "zh-CN" ? link.labelZh : t(link.key);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/[0.08] bg-background/90 backdrop-blur-md">
      <Container size="lg">
        <div className="flex h-header items-center gap-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-sm text-body font-semibold text-foreground focus-ring"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-caption font-bold text-primary-foreground" aria-hidden="true">
              M
            </span>
            <span className="whitespace-nowrap">MOOX</span>
          </Link>

          <nav aria-label="Primary" className="ml-auto hidden min-w-0 items-center gap-0.5 lg:flex">
            {primaryNav.map((link) => (
              <a
                key={link.key}
                href={link.href}
                className="whitespace-nowrap rounded-md px-2.5 py-2 text-[13px] leading-5 text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground focus-ring xl:px-3 xl:text-body-sm"
              >
                {label(link)}
              </a>
            ))}
            {moreNav.length > 0 && (
              <Dropdown>
                <DropdownTrigger className="whitespace-nowrap rounded-md px-2.5 py-2 text-[13px] leading-5 text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground focus-ring xl:px-3 xl:text-body-sm">
                  {t("nav.more")}
                </DropdownTrigger>
                <DropdownContent align="end">
                  {moreNav.map((link) => (
                    <DropdownItem key={link.key} onSelect={() => { window.location.href = link.href; }}>
                      {label(link)}
                    </DropdownItem>
                  ))}
                </DropdownContent>
              </Dropdown>
            )}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <LanguageSwitcher />
            <NavbarSession adminEnabled={adminEnabled} publicSignupEnabled={publicSignupEnabled} />
          </div>

          <button
            type="button"
            aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="ml-auto inline-flex items-center justify-center rounded-md p-2 text-foreground-secondary transition-colors hover:text-foreground focus-ring lg:hidden"
          >
            {isMenuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </Container>

      {isMenuOpen && (
        <div id="mobile-nav" className="border-t border-border/[0.08] bg-background lg:hidden">
          <Container size="lg">
            <nav aria-label="Mobile" className="grid grid-cols-2 gap-1 py-4 sm:grid-cols-3">
              {[...primaryNav, ...moreNav].map((link) => (
                <a
                  key={link.key}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-md px-3 py-2.5 text-body-sm text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground focus-ring"
                >
                  {label(link)}
                </a>
              ))}
            </nav>
            <div className="flex flex-col gap-4 border-t border-border/[0.08] py-4">
              <MobileLanguageSwitcher />
              <div className="flex flex-col gap-2 px-0">
                <NavbarSession adminEnabled={adminEnabled} publicSignupEnabled={publicSignupEnabled} />
              </div>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
