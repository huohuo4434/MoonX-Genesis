/** Admin email bootstrap list — DB profiles.role is authoritative after first login. */
export function getAdminEmails(): string[] {
  const raw = process.env.MOONX_ADMIN_EMAILS ?? "jackzwin999@gmail.com";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.trim().toLowerCase());
}
