"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_BOTTOM_NAV } from "@/config/navigation";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";

export function MobileBottomNav() {
  const pathname = usePathname() ?? "/";
  const { locale, href } = useLocale();
  const t = useTranslations();
  if (pathname.startsWith("/admin") || (pathname.startsWith("/login") || pathname.startsWith("/en/login"))) return null;
  return <nav aria-label={locale === "zh-CN" ? "手机快捷导航" : "Mobile shortcuts"} className="fixed inset-x-0 bottom-0 z-40 border-t border-border/[0.1] bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
    <ul className="mx-auto flex h-16 max-w-container items-stretch justify-between px-2">
      {MOBILE_BOTTOM_NAV.map((item) => {
        const itemHref = href(item.href);
        const active = item.href.startsWith("/#") ? pathname === "/" || pathname === "/en" : pathname === itemHref || pathname.startsWith(`${itemHref}/`);
        return <li key={item.key} className="flex-1"><Link href={itemHref} className={`flex h-full min-h-11 items-center justify-center rounded-md px-1 text-caption ${active ? "text-primary" : "text-foreground-tertiary"}`}>{locale === "zh-CN" ? item.labelZh : t(item.key)}</Link></li>;
      })}
    </ul>
  </nav>;
}
