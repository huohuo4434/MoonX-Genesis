/**
 * Single source of truth for site navigation hrefs.
 * Prefer config/navigation.ts.
 */
export type { NavItem } from "@/config/navigation";
export { NAV_ROUTES as routes, PUBLIC_PRIMARY_NAV as primaryNav, PUBLIC_MORE_NAV, buildPublicFooterColumns } from "@/config/navigation";

import { PUBLIC_PRIMARY_NAV, PUBLIC_MORE_NAV, buildPublicFooterColumns, NAV_ROUTES } from "@/config/navigation";

export const moreNav = PUBLIC_MORE_NAV.map(({ key, href }) => ({ key, href }));

export const footerColumns = buildPublicFooterColumns().map((col) => ({
  titleKey: col.titleKey,
  links: col.links.map((l) => ({ key: l.key, href: l.href })),
}));

export { PUBLIC_PRIMARY_NAV, NAV_ROUTES };
