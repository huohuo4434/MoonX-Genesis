import "server-only";

import {
  buildPublicFooterColumns,
  buildPublicPrimaryNav,
  PUBLIC_MORE_NAV,
  type NavItem,
  MEMBER_RESEARCH_NAV,
} from "@/config/member-channel-navigation";

export type { NavItem };

export async function getPublicPrimaryNav(): Promise<NavItem[]> {
  return buildPublicPrimaryNav();
}

export function getMemberResearchNav(): NavItem[] {
  return MEMBER_RESEARCH_NAV;
}

/**
 * The Member Channel is a visible product catalogue. Each destination keeps its
 * own server-side membership and trusted-device gate, so navigation visibility
 * never grants access to protected data.
 */
export async function getMemberResearchNavForCurrentUser(): Promise<NavItem[]> {
  return MEMBER_RESEARCH_NAV;
}

export function getPublicMoreNav(): NavItem[] {
  return PUBLIC_MORE_NAV;
}

export async function getPublicFooterColumns(): Promise<
  Array<{ titleKey: string; titleZh: string; links: NavItem[] }>
> {
  return buildPublicFooterColumns();
}
