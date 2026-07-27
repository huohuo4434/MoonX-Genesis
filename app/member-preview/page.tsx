import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/membership";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

export default async function MemberPreviewPage() {
  if (isProduction()) {
    const admin = await requireAdmin();
    if (admin) redirect("/admin");
    notFound();
  }

  const { default: DevPreviewPage } = await import("./DevPreviewPage");
  return <DevPreviewPage />;
}
