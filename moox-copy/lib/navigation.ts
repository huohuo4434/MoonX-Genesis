/**
 * Single source of truth for site navigation hrefs.
 * Prefer config/navigation.ts.
 */
export type { NavItem } from "@/config/navigation";
export { NAV_ROUTES as routes, PUBLIC_PRIMARY_NAV as primaryNav, buildPublicFooterColumns } from "@/config/navigation";

import { PUBLIC_PRIMARY_NAV, buildPublicFooterColumns, NAV_ROUTES } from "@/config/navigation";

export const moreNav: Array<{ key: string; href: string }> = [];

export const footerColumns = buildPublicFooterColumns().map((col) => ({
  titleKey: col.titleKey,
  links: col.links.map((l) => ({ key: l.key, href: l.href })),
}));

export { PUBLIC_PRIMARY_NAV, NAV_ROUTES };
