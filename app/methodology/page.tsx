import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { MethodologyPageClient } from "@/components/methodology/MethodologyPageClient";
import { getPublicMethodologyModules } from "@/lib/methodology/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "预测方法 | MOOX",
  description:
    "MOOX如何形成预测：多维度研究输入、动态权重、版本锁定与公开验证。研究观点不构成投资建议。",
};

export default async function MethodologyPage() {
  noStore();
  const modules = await getPublicMethodologyModules();
  return (
    <main>
      <MethodologyPageClient modules={modules} />
    </main>
  );
}
