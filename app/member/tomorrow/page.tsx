import type { Metadata } from "next";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/member/tomorrow",
    titleZh: "明日观点 | MOOX Intelligence",
    titleEn: "Next-Session Outlook | MOOX Intelligence",
    descriptionZh: "下一交易日唯一方向、情景权重、运行路径与技术点位。",
    descriptionEn: "Next-session direction, probabilities, expected path, key levels, confirmation triggers and invalidation conditions.",
  });
}



export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function MemberTomorrowRoute() {
  redirect("/#tomorrow");
}
