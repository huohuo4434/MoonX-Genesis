/**
 * Conviction List access — admin first, then active member.
 * Never reuse today/tomorrow calendar gates for member forecast unlock.
 */
import type { AccessUserSnapshot } from "@/lib/auth/get-access-user";
import type { ConvictionAccessMode } from "@/types/conviction-asset";

export function resolveConvictionAccessMode(
  access: Pick<AccessUserSnapshot, "authenticated" | "isAdmin" | "isActiveMember">
): ConvictionAccessMode {
  if (!access.authenticated) return "publicOnly";
  if (access.isAdmin) return "fullAccess";
  if (access.isActiveMember) return "fullAccess";
  return "publicOnly";
}

export function hasConvictionFullAccess(
  access: Pick<AccessUserSnapshot, "authenticated" | "isAdmin" | "isActiveMember">
): boolean {
  return resolveConvictionAccessMode(access) === "fullAccess";
}
