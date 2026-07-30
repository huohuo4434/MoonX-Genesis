import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdminOrNotFound } from "@/lib/auth/require-admin-or-404";
import { MethodologyPageClient } from "@/components/methodology/MethodologyPageClient";
import { getPublicMethodologyModules } from "@/lib/methodology/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "预测方法 | MOOX",
  description: "内部方法权重配置。",
  robots: { index: false, follow: false },
};

export default async function MethodologyPage() {
  noStore();
  await requireAdminOrNotFound();
  const modules = await getPublicMethodologyModules();
  return (
    <main>
      <MethodologyPageClient modules={modules} />
    </main>
  );
}
