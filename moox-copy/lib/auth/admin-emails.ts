/** Admin email bootstrap list — DB/app_metadata.role is authoritative after first login. */
import { ADMIN_EMAIL } from "@/lib/auth/is-admin";

function clean(raw: string | undefined): string | undefined {
  const v = raw?.trim().toLowerCase();
  if (!v || v === "[sensitive]" || v.includes("[sensitive]")) return undefined;
  return v;
}

export function getAdminEmails(): string[] {
  const single = clean(process.env.ADMIN_EMAIL) || clean(process.env.MOONX_ADMIN_EMAIL);
  const fromList = (process.env.MOONX_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => clean(e))
    .filter((e): e is string => Boolean(e));
  return Array.from(
    new Set(
      ([ADMIN_EMAIL, "jackzwin999@gmail.com", single, ...fromList].filter(Boolean) as string[])
    )
  );
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.trim().toLowerCase());
}
