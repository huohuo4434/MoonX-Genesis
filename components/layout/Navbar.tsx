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
  sessionEmail = null,
  sessionIsAdmin = false,
}: {
  primaryNav: NavItem[];
  moreNav: NavItem[];
  adminEnabled?: boolean;
  publicSignupEnabled?: boolean;
  sessionEmail?: string | null;
  sessionIsAdmin?: boolean;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = useTranslations();
  const { locale, href } = useLocale();

  const label = (link: NavItem) =>
    locale === "zh-CN" ? link.labelZh : t(link.key);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/[0.08] bg-background/90 backdrop-blur-md">
      <Container size="full" className="px-3 sm:px-4 lg:px-5 xl:px-6">
        <div className="flex h-header items-center gap-2">
          <Link
            href={href("/")}
            className="flex shrink-0 items-center gap-2 rounded-sm text-[15px] font-semibold text-foreground focus-ring xl:text-body"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-caption font-bold text-primary-foreground" aria-hidden="true">
              M
            </span>
            <span className="whitespace-nowrap">MOOX</span>
          </Link>

          <nav aria-label="Primary" className="ml-3 hidden min-w-0 flex-1 items-center justify-start gap-0 xl:flex 2xl:ml-5">
            {primaryNav.map((link) => (
              <a
                key={link.key}
                href={href(link.href)}
                className="whitespace-nowrap rounded-md px-2 py-2 text-[12px] leading-5 text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground focus-ring xl:px-2.5 xl:text-[13px] 2xl:px-3 2xl:text-body-sm"
              >
                {label(link)}
              </a>
            ))}
            {moreNav.length > 0 && (
              <Dropdown>
                <DropdownTrigger className="whitespace-nowrap rounded-md px-2 py-2 text-[12px] leading-5 text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground focus-ring xl:px-2.5 xl:text-[13px]">
                  {t("nav.more")}
                </DropdownTrigger>
                <DropdownContent align="end">
                  {moreNav.map((link) => (
                    <DropdownItem key={link.key} onSelect={() => { window.location.href = href(link.href); }}>
                      {label(link)}
                    </DropdownItem>
                  ))}
                </DropdownContent>
              </Dropdown>
            )}
          </nav>

          <div className="ml-auto hidden shrink-0 items-center gap-1.5 xl:flex">
            <LanguageSwitcher />
            <NavbarSession adminEnabled={adminEnabled} publicSignupEnabled={publicSignupEnabled} initialEmail={sessionEmail} initialIsAdmin={sessionIsAdmin} />
          </div>

          <button
            type="button"
            aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="ml-auto inline-flex items-center justify-center rounded-md p-2 text-foreground-secondary transition-colors hover:text-foreground focus-ring xl:hidden"
          >
            {isMenuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </Container>

      {isMenuOpen && (
        <div id="mobile-nav" className="border-t border-border/[0.08] bg-background xl:hidden">
          <Container size="full" className="px-4 sm:px-5">
            <nav aria-label="Mobile" className="grid grid-cols-2 gap-1 py-4 sm:grid-cols-3">
              {[...primaryNav, ...moreNav].map((link) => (
                <a
                  key={link.key}
                  href={href(link.href)}
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
                <NavbarSession adminEnabled={adminEnabled} publicSignupEnabled={publicSignupEnabled} initialEmail={sessionEmail} initialIsAdmin={sessionIsAdmin} />
              </div>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
