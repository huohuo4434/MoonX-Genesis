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
    descriptionZh: "大周期定义环境，周卦锁定方向，奇门拆时间窗口，缠论与技术只找位置，AI控制风险，量化按规则执行。",
    descriptionEn: "Higher-horizon context, weekly Liu Yao direction lock, Qimen timing, Chan execution, AI risk control and immutable public verification.",
  });
}


export const dynamic = "force-dynamic";
export const revalidate = 0;


export default async function MethodologyPage() {
  noStore();
  const modules = await getPublicMethodologyModules();
  return <main><MethodologyPageClient modules={modules} /></main>;
}
