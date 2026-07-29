/**
 * Generate / regenerate public marketing social cards for a forecast date.
 */
import "server-only";

import { collectTodayPublicCardSources } from "@/lib/social-cards/public-payload";
import { replaceSocialCardsForDate } from "@/lib/social-cards/store";
import { siteConfig } from "@/lib/site-config";
import type { SocialCardRecord } from "@/types/social-card";

function cardId(forecastDate: string, assetId: string): string {
  return `sc_${forecastDate}_${assetId}`;
}

export async function generateSocialCardsForToday(input?: {
  now?: Date;
  source?: SocialCardRecord["source"];
}): Promise<{
  forecastDate: string;
  cards: SocialCardRecord[];
  count: number;
}> {
  const now = input?.now ?? new Date();
  const source = input?.source ?? "cron";
  const { forecastDate, items } = collectTodayPublicCardSources(now);
  const stamp = now.toISOString();

  if (!items.length) {
    const emptyCard: SocialCardRecord = {
      id: cardId(forecastDate, "empty"),
      forecastDate,
      assetId: "empty",
      platforms: ["x", "telegram", "web"],
      width: 1200,
      height: 675,
      payload: {
        brand: "MOOX",
        forecastDate,
        assetName: "正在整理",
        symbol: "—",
        direction: "—",
        probability: "—",
        support: "—",
        resistance: "—",
        summary: "今日预测卡片尚未就绪，稍后自动生成。",
      },
      imageUrl: `/api/social-cards/${cardId(forecastDate, "empty")}/image`,
      shareUrl: `${siteConfig.url}/forecasts/daily`,
      status: "empty",
      createdAt: stamp,
      updatedAt: stamp,
      source,
    };
    await replaceSocialCardsForDate(forecastDate, [emptyCard]);
    return { forecastDate, cards: [emptyCard], count: 0 };
  }

  const cards: SocialCardRecord[] = items.map((item) => {
    const id = cardId(forecastDate, item.assetId);
    return {
      id,
      forecastDate,
      assetId: item.assetId,
      forecastId: item.forecastId,
      platforms: ["x", "telegram", "web"],
      width: 1200,
      height: 675,
      payload: item.payload,
      imageUrl: `/api/social-cards/${id}/image`,
      shareUrl: `${siteConfig.url}/forecasts/daily`,
      status: "ready",
      createdAt: stamp,
      updatedAt: stamp,
      source,
    };
  });

  await replaceSocialCardsForDate(forecastDate, cards);
  return { forecastDate, cards, count: cards.length };
}
