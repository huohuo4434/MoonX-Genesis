/**
 * Unified admin detection — role, flag, or configured admin email.
 * Prefer server-side use; do not rely on client-only state.
 */

const DEFAULT_ADMIN_EMAIL = "jackzwin999@gmail.com";

function cleanEmailEnv(raw: string | undefined): string | undefined {
  const v = raw?.trim().toLowerCase();
  if (!v) return undefined;
  if (v === "[sensitive]" || v.includes("[sensitive]") || v === "undefined" || v === "null") {
    return undefined;
  }
  return v;
}

export const ADMIN_EMAIL =
  cleanEmailEnv(process.env.ADMIN_EMAIL) ||
  cleanEmailEnv(process.env.MOONX_ADMIN_EMAIL) ||
  DEFAULT_ADMIN_EMAIL;

function adminEmailSet(): Set<string> {
  const emails = new Set<string>([ADMIN_EMAIL, DEFAULT_ADMIN_EMAIL]);
  const list = process.env.MOONX_ADMIN_EMAILS ?? "";
  for (const part of list.split(",")) {
    const e = cleanEmailEnv(part);
    if (e) emails.add(e);
  }
  return emails;
}

export function isAdminUser(
  user:
    | {
        email?: string | null;
        role?: string | null;
        isAdmin?: boolean | null;
      }
    | null
    | undefined
): boolean {
  if (!user) return false;

  if (user.isAdmin === true) return true;

  const normalizedRole = String(user.role ?? "")
    .trim()
    .toUpperCase();
  if (
    normalizedRole === "ADMIN" ||
    normalizedRole === "SUPER_ADMIN" ||
    normalizedRole === "SUPERADMIN"
  ) {
    return true;
  }

  const normalizedEmail = String(user.email ?? "")
    .trim()
    .toLowerCase();
  if (normalizedEmail && adminEmailSet().has(normalizedEmail)) {
    return true;
  }

  return false;
}
