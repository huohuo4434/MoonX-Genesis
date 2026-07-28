"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_BOTTOM_NAV } from "@/config/navigation";

export function MobileBottomNav() {
  const pathname = usePathname() ?? "/";
  if (pathname.startsWith("/admin") || pathname.startsWith("/login")) return null;

  return (
    <nav
      aria-label="手机快捷导航"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/[0.1] bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex h-14 max-w-container items-stretch justify-between px-2">
        {MOBILE_BOTTOM_NAV.map((item) => {
          const active =
            item.href.startsWith("/#")
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                className={`flex h-full min-h-11 flex-col items-center justify-center px-1 text-caption ${
                  active ? "text-primary" : "text-foreground-tertiary"
                }`}
              >
                {item.labelZh}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
