import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminDeviceSecurityPanel } from "@/components/admin/AdminDeviceSecurityPanel";
import { Section } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminSecurityPage() {
  const admin = await requireAdmin();
  if (!admin) notFound();
  return <main><Section spacing="lg"><AdminNav current="/admin/security" /><AdminDeviceSecurityPanel /></Section></main>;
}
