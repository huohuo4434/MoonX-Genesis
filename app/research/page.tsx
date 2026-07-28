import type { Metadata } from "next";
import { requireAdminOrNotFound } from "@/lib/auth/require-admin-or-404";

export const metadata: Metadata = {
  title: "Not Found",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Long-horizon research is internal — public gets 404; admin sees intelligence hub. */
export default async function ResearchIndexGone() {
  await requireAdminOrNotFound();
  const { default: AdminIntelligencePage } = await import("@/app/admin/intelligence/page");
  return <AdminIntelligencePage />;
}
