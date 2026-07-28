import type { Metadata } from "next";
import { requireAdminOrNotFound } from "@/lib/auth/require-admin-or-404";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ResearchLibraryGone() {
  await requireAdminOrNotFound();
  const { default: Page } = await import("@/app/admin/intelligence/page");
  return <Page />;
}
