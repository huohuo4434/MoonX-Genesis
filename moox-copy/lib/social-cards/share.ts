import type { SocialCardPublicPayload } from "@/types/social-card";

/** Shared share text for X / Telegram / clipboard — public marketing only. */
export function buildSocialShareText(payload: {
  forecastDate: string;
  assetName?: string;
  direction?: string;
  summary?: string;
}): string {
  const parts = [
    `MOOX 每日预测 ${payload.forecastDate}`,
    payload.assetName && payload.direction
      ? `${payload.assetName} · ${payload.direction}`
      : payload.assetName,
    payload.summary,
  ].filter(Boolean);
  return parts.join(" — ");
}

export function buildXShareUrl(url: string, text: string): string {
  const u = new URL("https://twitter.com/intent/tweet");
  u.searchParams.set("text", text);
  u.searchParams.set("url", url);
  return u.toString();
}

export function buildTelegramShareUrl(url: string, text: string): string {
  const u = new URL("https://t.me/share/url");
  u.searchParams.set("url", url);
  u.searchParams.set("text", text);
  return u.toString();
}

export function cardPayloadShareSnippet(payload: SocialCardPublicPayload): string {
  return buildSocialShareText({
    forecastDate: payload.forecastDate,
    assetName: payload.assetName,
    direction: payload.direction,
    summary: payload.summary,
  });
}
