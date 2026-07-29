/** Client-safe market-cap formatter (no server-only imports). */
import type { ConvictionPublicCard } from "@/types/conviction-asset";

export function formatMarketCapDisplay(
  asset: Pick<ConvictionPublicCard, "marketCap" | "marketCapCurrency" | "marketCapUpdatedAt">
): { labelZh: string; labelEn: string; updatedAt: string | null } | null {
  if (asset.marketCap == null || !asset.marketCapCurrency) return null;
  const usd = asset.marketCapCurrency.toUpperCase() === "USD";
  const millions = asset.marketCap / 1_000_000;
  const labelZh = usd
    ? `约${Math.round(millions)}万美元`
    : `约${Math.round(millions)}百万${asset.marketCapCurrency}`;
  const labelEn = usd
    ? `~$${millions.toFixed(1)}M`
    : `~${millions.toFixed(1)}M ${asset.marketCapCurrency}`;
  return { labelZh, labelEn, updatedAt: asset.marketCapUpdatedAt };
}
