"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Container } from "@/components/ui";
import { CloseIcon, MenuIcon } from "@/components/icons";
import { LanguageSwitcher, MobileLanguageSwitcher } from "./LanguageSwitcher";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

interface NavLink {
  key: string;
  href: string;
}

const navLinks: NavLink[] = [
  { key: "nav.markets", href: "/#markets" },
  { key: "nav.forecasts", href: "/#forecasts" },
  { key: "nav.research", href: "/research" },
  { key: "nav.researchLibrary", href: "/research/library" },
  { key: "nav.watchlist", href: "/markets/watchlist" },
  { key: "nav.timeline", href: "/timeline" },
];

/** Sticky primary navigation. Client component only because of the mobile menu toggle. */
export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/[0.08] bg-background/80 backdrop-blur-md">
      <Container size="lg">
        <div className="flex h-header items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-sm text-body font-semibold text-foreground focus-ring"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-caption font-bold text-primary-foreground">
              M
            </span>
            MoonX
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.key}
                href={link.href}
                className="rounded-md px-3 py-2 text-body-sm text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground focus-ring"
              >
                {t(link.key)}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm">
              {t("nav.signIn")}
            </Button>
            <Button variant="primary" size="sm">
              {t("nav.getStarted")}
            </Button>
          </div>

          <button
            type="button"
            aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="inline-flex items-center justify-center rounded-md p-2 text-foreground-secondary transition-colors hover:text-foreground focus-ring lg:hidden"
          >
            {isMenuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </Container>

      {isMenuOpen && (
        <div id="mobile-nav" className="border-t border-border/[0.08] bg-background lg:hidden">
          <Container size="lg">
            <nav aria-label="Mobile" className="flex flex-col gap-1 py-4">
              {navLinks.map((link) => (
                <a
                  key={link.key}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-md px-3 py-2.5 text-body-sm text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground focus-ring"
                >
                  {t(link.key)}
                </a>
              ))}
            </nav>
            <div className="flex flex-col gap-4 border-t border-border/[0.08] py-4">
              <MobileLanguageSwitcher />
              <div className="flex flex-col gap-2 px-0">
                <Button variant="ghost" className="justify-center">
                  {t("nav.signIn")}
                </Button>
                <Button variant="primary" className="justify-center">
                  {t("nav.getStarted")}
                </Button>
              </div>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
