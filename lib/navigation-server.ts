import { getAccessUser } from "@/lib/auth/get-access-user";
import "server-only";

import {
  buildPublicFooterColumns,
  buildPublicPrimaryNav,
  PUBLIC_MORE_NAV,
  type NavItem,
  MEMBER_RESEARCH_NAV,
} from "@/config/navigation";

export type { NavItem };

export async function getPublicPrimaryNav(): Promise<NavItem[]> {
  return buildPublicPrimaryNav();
}

export function getMemberResearchNav(): NavItem[] {
  return MEMBER_RESEARCH_NAV;
}

export async function getMemberResearchNavForCurrentUser(): Promise<NavItem[]> {
  const memberAccess = await getAccessUser();
  return memberAccess.isActiveMember || memberAccess.isAdmin ? MEMBER_RESEARCH_NAV : [];
}

export function getPublicMoreNav(): NavItem[] {
  return PUBLIC_MORE_NAV;
}

export async function getPublicFooterColumns(): Promise<
  Array<{ titleKey: string; titleZh: string; links: NavItem[] }>
> {
  return buildPublicFooterColumns();
}
