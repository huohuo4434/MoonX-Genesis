import "server-only";

import {
  buildPublicFooterColumns,
  buildPublicPrimaryNav,
  PUBLIC_MORE_NAV,
  type NavItem,
} from "@/config/navigation";

export type { NavItem };

export async function getPublicPrimaryNav(): Promise<NavItem[]> {
  return buildPublicPrimaryNav();
}

export function getPublicMoreNav(): NavItem[] {
  return PUBLIC_MORE_NAV;
}

export async function getPublicFooterColumns(): Promise<
  Array<{ titleKey: string; titleZh: string; links: NavItem[] }>
> {
  return buildPublicFooterColumns();
}
