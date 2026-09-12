import "server-only";

import { unstable_cache } from "next/cache";
import { getMemberAiTradingDeskSnapshot, getMemberAiTradingDeskSettings } from "@/lib/trading-signals/member-ai-trading-desk";
import { applyAiDeskOperationalState } from "@/lib/trading-signals/ai-desk-status";
import { encodeDeskCache, decodeDeskCache } from "@/lib/presentation/desk-cache-codec";
import type { AiTradingDeskSnapshot } from "@/types/ai-trading-desk";

const readCachedSnapshot = unstable_cache(
  async () => encodeDeskCache(await getMemberAiTradingDeskSnapshot()),
  ["member-ai-trading-desk-snapshot-v20260912-gzip-private"],
  { revalidate: 15 }
);

/**
 * Shared read-only snapshot for all authorised members.
 * Authentication stays outside this cache; the snapshot itself contains no member identity.
 */
export async function getCachedMemberAiTradingDeskSnapshot() {
  const [packed, settings] = await Promise.all([readCachedSnapshot(), getMemberAiTradingDeskSettings()]);
  const snapshot = await decodeDeskCache<AiTradingDeskSnapshot>(packed);
  return applyAiDeskOperationalState({ ...snapshot, settings });
}
