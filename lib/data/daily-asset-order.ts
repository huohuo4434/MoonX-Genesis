/** Fixed public display order for daily forecast cards. */
export const DAILY_ASSET_ORDER_IDS = [
  "bitcoin",
  "sp500",
  "nasdaq-100",
  "shanghai-composite",
  "hang-seng",
  "gold",
  "wti-crude",
] as const;

export const DAILY_SYMBOL_ORDER = ["BTC", "SPX", "NDX", "SSEC", "HSTECH", "GLD", "WTI"] as const;

export function dailyAssetOrderIndex(assetId: string): number {
  const i = (DAILY_ASSET_ORDER_IDS as readonly string[]).indexOf(assetId);
  return i < 0 ? 999 : i;
}

export function dailySymbolOrderIndex(symbol: string): number {
  const normalized =
    symbol === "000001.SS"
      ? "SSEC"
      : symbol === "^GSPC"
        ? "SPX"
        : symbol === "CL=F"
          ? "WTI"
          : symbol === "GOLD" || symbol === "GC=F"
            ? "GLD"
            : symbol;
  const i = (DAILY_SYMBOL_ORDER as readonly string[]).indexOf(normalized);
  return i < 0 ? 999 : i;
}

export function sortByDailyAssetOrder<T extends { assetId?: string; symbol?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ai = a.assetId ? dailyAssetOrderIndex(a.assetId) : dailySymbolOrderIndex(a.symbol ?? "");
    const bi = b.assetId ? dailyAssetOrderIndex(b.assetId) : dailySymbolOrderIndex(b.symbol ?? "");
    if (ai !== bi) return ai - bi;
    return (a.symbol ?? "").localeCompare(b.symbol ?? "");
  });
}
