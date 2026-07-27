import type { ReactNode } from "react";
import {
  canAccessForecast,
  type MemberUserContext,
} from "@/lib/access/member-preview";
import type { ForecastAccessLevel } from "@/types/daily-forecast";

/**
 * Server-side member gate wrapper.
 * Prefer branching in RSC (pass teaser vs full props) over CSS blur.
 * Real auth/payment still needs to be connected — see member-preview env/cookie.
 */
export function MemberGate({
  user,
  required = "member",
  children,
  fallback,
}: {
  user: MemberUserContext;
  required?: ForecastAccessLevel;
  children: ReactNode;
  fallback: ReactNode;
}) {
  if (!canAccessForecast(user, required)) return <>{fallback}</>;
  return <>{children}</>;
}
