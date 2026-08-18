"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui";
import { CloseIcon, MenuIcon } from "@/components/icons";
import { LanguageSwitcher, MobileLanguageSwitcher } from "./LanguageSwitcher";
import { NavbarSession } from "./NavbarSession";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import type { NavGroupKey, NavItem } from "@/config/member-channel-navigation";

const GROUP_ORDER: NavGroupKey[] = ["overview", "forecast", "recommendation", "tools", "experiment"];

function groupMemberLinks(memberNav: NavItem[]) {
  return GROUP_ORDER.flatMap((groupKey) => {
    const links = memberNav.filter((item) => item.groupKey === groupKey);
    if (!links.length) return [];
    const first = links[0]!;
    return [{
      key: groupKey,
      labelZh: first.groupZh ?? "会员频道",
      labelEn: first.groupEn ?? "Member Channel",
      links,
    }];
  });
}

export function Navbar({
  primaryNav,
  memberNav,
  moreNav,
  adminEnabled = true,
  publicSignupEnabled = true,
}: {
  primaryNav: NavItem[];
  memberNav: NavItem[];
  moreNav: NavItem[];
  adminEnabled?: boolean;
  publicSignupEnabled?: boolean;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations();
  const { locale, href } = useLocale();
  const memberGroups = useMemo(() => groupMemberLinks(memberNav), [memberNav]);

  const label = (link: NavItem) =>
    locale === "zh-CN" ? link.labelZh : (link.labelEn ?? t(link.key));
  const groupLabel = (group: { labelZh: string; labelEn: string }) =>
    locale === "zh-CN" ? group.labelZh : group.labelEn;
  const mobileMoreNav = moreNav.filter(
    (link) => !primaryNav.some((candidate) => candidate.href === link.href) && !memberNav.some((candidate) => candidate.href === link.href)
  );
  const mobileLinks = (links: NavItem[]) => links.map((link) => (
    <Link
      key={link.key}
      href={href(link.href)}
      prefetch={false}
      onClick={() => setIsMenuOpen(false)}
      className="flex min-h-11 items-center justify-between rounded-md px-3 py-2.5 text-body-sm text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground focus-ring"
    >
      <span>{label(link)}</span>
      {link.experimental ? (
        <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-2 py-0.5 text-[10px] text-amber-100/75">
          {locale === "zh-CN" ? "实验" : "Beta"}
        </span>
      ) : null}
    </Link>
  ));

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
              <Link
                key={link.key}
                href={href(link.href)}
                prefetch={false}
                className="whitespace-nowrap rounded-md px-2.5 py-2 text-[13px] leading-5 text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground focus-ring 2xl:px-3 2xl:text-body-sm"
              >
                {label(link)}
              </Link>
            ))}
            {memberGroups.length > 0 && (
              <Dropdown>
                <DropdownTrigger data-testid="member-channel-dropdown" className="whitespace-nowrap rounded-md border border-violet-300/15 bg-violet-300/[.04] px-3 py-2 text-[13px] leading-5 text-violet-100 transition-colors hover:bg-violet-300/[.08] focus-ring 2xl:text-body-sm">
                  {locale === "zh-CN" ? "会员频道" : "Member Channel"}
                </DropdownTrigger>
                <DropdownContent align="start" className="w-[680px] max-w-[calc(100vw-2rem)] p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    {memberGroups.map((group, index) => (
                      <div key={group.key} className={group.key === "overview" ? "md:col-span-2" : undefined}>
                        {index > 0 && group.key === "experiment" ? <DropdownSeparator className="md:col-span-2" /> : null}
                        <DropdownLabel className="px-2 pb-1 pt-1 font-semibold uppercase tracking-[0.14em] text-violet-200/60">
                          {groupLabel(group)}
                        </DropdownLabel>
                        <div className={group.key === "overview" ? "grid gap-1 sm:grid-cols-2" : "space-y-1"}>
                          {group.links.map((link) => (
                            <DropdownItem
                              key={link.key}
                              onSelect={() => router.push(href(link.href))}
                              className="min-h-10 justify-between"
                            >
                              <span>{label(link)}</span>
                              {link.experimental ? (
                                <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-2 py-0.5 text-[10px] text-amber-100/75">
                                  {locale === "zh-CN" ? "实验" : "Beta"}
                                </span>
                              ) : null}
                            </DropdownItem>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </DropdownContent>
              </Dropdown>
            )}
            {moreNav.length > 0 && (
              <Dropdown>
                <DropdownTrigger className="whitespace-nowrap rounded-md px-2 py-2 text-[12px] leading-5 text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground focus-ring xl:px-2.5 xl:text-[13px]">
                  {t("nav.more")}
                </DropdownTrigger>
                <DropdownContent align="end">
                  {moreNav.map((link) => (
                    <DropdownItem key={link.key} onSelect={() => router.push(href(link.href))}>
                      {label(link)}
                    </DropdownItem>
                  ))}
                </DropdownContent>
              </Dropdown>
            )}
          </nav>

          <div className="ml-auto hidden shrink-0 items-center gap-1.5 xl:flex">
            <LanguageSwitcher />
            <NavbarSession adminEnabled={adminEnabled} publicSignupEnabled={publicSignupEnabled} />
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
        <div id="mobile-nav" className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-border/[0.08] bg-background xl:hidden">
          <Container size="full" className="px-4 sm:px-5">
            <div className="space-y-5 py-4">
              <nav aria-label="Mobile" className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                {mobileLinks(primaryNav)}
              </nav>
              {memberGroups.map((group) => (
                <div key={group.key} className="border-t border-border/[0.08] pt-4">
                  <p className="px-3 text-caption font-semibold uppercase tracking-[0.16em] text-violet-200/70">
                    {groupLabel(group)}
                  </p>
                  <nav aria-label={groupLabel(group)} className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {mobileLinks(group.links)}
                  </nav>
                </div>
              ))}
              {mobileMoreNav.length ? (
                <div className="border-t border-border/[0.08] pt-4">
                  <p className="px-3 text-caption font-semibold uppercase tracking-[0.16em] text-foreground-tertiary">
                    {locale === "zh-CN" ? "帮助与账户" : "Help and account"}
                  </p>
                  <nav aria-label={locale === "zh-CN" ? "帮助与账户" : "Help and account"} className="mt-2 grid grid-cols-2 gap-1">
                    {mobileLinks(mobileMoreNav)}
                  </nav>
                </div>
              ) : null}
            </div>
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
