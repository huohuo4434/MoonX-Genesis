import { FreePicks } from "@/components/education/FreePicks";
import catalog from "@/content/free-picks/catalog.json";
import { freePicksCatalogSchema } from "@/lib/free-picks/core";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return buildLocalizedPageMetadata({ locale: await getRequestLocale(), basePath: "/free-picks", titleZh: "免费精选 · 先看完整计划", titleEn: "Free Picks · Try a Complete Plan", descriptionZh: "每三天复核，合格才发布：条件、止损、目标、有效期与完整复盘。", descriptionEn: "Reviewed every three days. Qualifying setups only: conditions, stop, targets, expiry and complete reviews." });
}
export default async function FreePicksPage() {
  return <FreePicks catalog={freePicksCatalogSchema.parse(catalog)} locale={await getRequestLocale()} now={Date.now()} />;
}
