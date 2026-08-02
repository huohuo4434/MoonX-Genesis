import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { MethodologyPageClient } from "@/components/methodology/MethodologyPageClient";
import { getPublicMethodologyModules } from "@/lib/methodology/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "预测方法",
  description: "六爻负责方向假设，奇门辅助择时，技术结构确认入场与失效，再以公开验证承担结果。",
  alternates: { canonical: "/methodology" },
  robots: { index: true, follow: true },
};

export default async function MethodologyPage() {
  noStore();
  const modules = await getPublicMethodologyModules();
  return <main><MethodologyPageClient modules={modules} /></main>;
}
