import "server-only";

import { notFound } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth/permissions";

/** Public users and members get a standard 404 — never expose internal pages via 403. */
export async function requireAdminOrNotFound(): Promise<void> {
  const user = await getCurrentUser();
  if (!isAdmin(user)) notFound();
}
