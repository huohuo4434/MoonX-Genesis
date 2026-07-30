/** Client-safe market-cap formatter (no server-only imports). */
import type { ConvictionPublicCard } from "@/types/conviction-asset";

/**
 * Chinese finance convention: 万美元 = units of 10,000 USD.
 * 26,180,000 → 约2618万美元 (NOT 约26万美元).
 */
export function formatMarketCapDisplay(
  asset: Pick<ConvictionPublicCard, "marketCap" | "marketCapCurrency" | "marketCapUpdatedAt">
): { labelZh: string; labelEn: string; updatedAt: string | null } | null {
  if (asset.marketCap == null || !asset.marketCapCurrency) return null;
  const usd = asset.marketCapCurrency.toUpperCase() === "USD";
  const wanUsd = Math.round(asset.marketCap / 10_000);
  const millions = asset.marketCap / 1_000_000;
  const labelZh = usd
    ? `约${wanUsd}万美元`
    : `约${Math.round(millions)}百万${asset.marketCapCurrency}`;
  const labelEn = usd
    ? `~$${millions.toFixed(2)}M`
    : `~${millions.toFixed(1)}M ${asset.marketCapCurrency}`;
  return { labelZh, labelEn, updatedAt: asset.marketCapUpdatedAt ?? null };
}
