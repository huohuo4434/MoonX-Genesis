import { requireAdminOrRedirect } from "@/lib/auth/permissions";
import { getFeatureFlags } from "@/lib/feature-flags";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const flags = getFeatureFlags();
  if (!flags.adminEnabled) redirect("/");
  await requireAdminOrRedirect("/admin");
  return children;
}
