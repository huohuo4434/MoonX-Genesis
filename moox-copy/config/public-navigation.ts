/**
 * Re-export navigation from config/navigation.ts for backward compatibility.
 */
export type { NavItem } from "@/config/navigation";
export {
  buildPublicPrimaryNav,
  buildPublicFooterColumns,
  NAV_ROUTES as PUBLIC_ROUTES,
} from "@/config/navigation";
