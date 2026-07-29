import "server-only";

import {
  buildPublicFooterColumns,
  buildPublicPrimaryNav,
  type NavItem,
} from "@/config/navigation";

export type { NavItem };

export async function getPublicPrimaryNav(): Promise<NavItem[]> {
  return buildPublicPrimaryNav();
}

export function getPublicMoreNav(): NavItem[] {
  return [];
}

export async function getPublicFooterColumns(): Promise<
  Array<{ titleKey: string; links: NavItem[] }>
> {
  return buildPublicFooterColumns().map((col) => ({
    titleKey: col.titleKey,
    links: col.links,
  }));
}
