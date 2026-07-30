/**
 * Altcoin Rotation theme accessor — sourced from content/moonx/latest.json marketThemes.
 */
import "server-only";

import { loadMoonXResearchAsync } from "@/lib/moonx/load-research";
import type { MoonXProcessedAsset, MoonXProcessedMarketTheme } from "@/lib/moonx/types";

export const ALTCOIN_ROTATION_THEME_ID = "theme-altcoin-rotation-2026-07-26";

export interface AltcoinRotationMonitorData {
  theme: MoonXProcessedMarketTheme;
  doge: MoonXProcessedAsset | undefined;
  shib: MoonXProcessedAsset | undefined;
}

export async function getAltcoinRotationTheme(): Promise<MoonXProcessedMarketTheme | undefined> {
  const doc = await loadMoonXResearchAsync();
  return doc.marketThemes.find((theme) => theme.id === ALTCOIN_ROTATION_THEME_ID);
}

export async function getAltcoinRotationMonitorData(): Promise<AltcoinRotationMonitorData | undefined> {
  const doc = await loadMoonXResearchAsync();
  const theme = doc.marketThemes.find((entry) => entry.id === ALTCOIN_ROTATION_THEME_ID);
  if (!theme) return undefined;
  return {
    theme,
    doge: doc.assets.find((asset) => asset.id === "dogecoin"),
    shib: doc.assets.find((asset) => asset.id === "shiba-inu"),
  };
}
