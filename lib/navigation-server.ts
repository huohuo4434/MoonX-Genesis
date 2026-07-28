import "server-only";

import {
  buildPublicFooterColumns,
  buildPublicPrimaryNav,
  type NavItem,
} from "@/config/navigation";
import { listOnlineBenefitStocksWithContent } from "@/lib/data/member-stocks/store";

export type { NavItem };

export async function getPublicPrimaryNav(): Promise<NavItem[]> {
  let includeMemberStocks = true;
  try {
    includeMemberStocks = (await listOnlineBenefitStocksWithContent()).length > 0;
  } catch {
    includeMemberStocks = true;
  }
  return buildPublicPrimaryNav({ includeMemberStocks });
}

export function getPublicMoreNav(): NavItem[] {
  return [];
}

export async function getPublicFooterColumns(): Promise<
  Array<{ titleKey: string; links: NavItem[] }>
> {
  let includeMemberStocks = true;
  try {
    includeMemberStocks = (await listOnlineBenefitStocksWithContent()).length > 0;
  } catch {
    includeMemberStocks = true;
  }
  return buildPublicFooterColumns({ includeMemberStocks }).map((col) => ({
    titleKey: col.titleKey,
    links: col.links,
  }));
}
