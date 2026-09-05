import "server-only";

import { listStaticFocusEvidence } from "@/lib/data/conviction/access";
import { RETIRED_STATIC_FOCUS_ASSET_IDS } from "@/lib/data/conviction/focus-registry-core";
import { listStaticFocusForecasts } from "@/lib/data/conviction/focus-static-forecast-registry";
import { CONVICTION_ASSET_SEED } from "@/lib/data/conviction/seed";

/** Historical verification needs the archived identity, not current focus eligibility.
 * This reader neither publishes forecasts nor adds assets to any active registry.
 */
export async function listFocusVerificationEvidence() {
  const active = await listStaticFocusEvidence();
  const archived = RETIRED_STATIC_FOCUS_ASSET_IDS.map((assetId) => {
    const asset = CONVICTION_ASSET_SEED.find((item) => item.id === assetId);
    if (!asset) throw new Error(`archived-focus-metadata-unavailable:${assetId}`);
    return {
      assetId, symbol: asset.symbol, assetType: asset.assetType,
      exchange: asset.exchange ?? null, forecasts: listStaticFocusForecasts(assetId),
    };
  });
  return [...active, ...archived];
}
