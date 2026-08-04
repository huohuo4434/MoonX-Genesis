import type { Metadata } from "next";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { unstable_noStore as noStore } from "next/cache";
import { MethodologyPageClient } from "@/components/methodology/MethodologyPageClient";
import { getPublicMethodologyModules } from "@/lib/methodology/store";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/methodology",
    titleZh: "预测方法",
    titleEn: "Methodology",
    descriptionZh: "六爻负责方向假设，奇门辅助择时，技术结构确认入场与失效，再以公开验证承担结果。",
    descriptionEn: "How MOOX combines Liu Yao directional analysis, Qimen timing, technical market structure, catalyst monitoring and public verification.",
  });
}


export const dynamic = "force-dynamic";
export const revalidate = 0;


export default async function MethodologyPage() {
  noStore();
  const modules = await getPublicMethodologyModules();
  return <main><MethodologyPageClient modules={modules} /></main>;
}
