import "server-only";

import { unstable_cache } from "next/cache";
import { getMemberAiTradingDeskSnapshot, getMemberAiTradingDeskSettings } from "@/lib/trading-signals/member-ai-trading-desk";
import { applyAiDeskOperationalState } from "@/lib/trading-signals/ai-desk-status";

const readCachedSnapshot = unstable_cache(
  async () => getMemberAiTradingDeskSnapshot(),
  ["member-ai-trading-desk-snapshot-v20260904-private"],
  { revalidate: 15 }
);

/**
 * Shared read-only snapshot for all authorised members.
 * Authentication stays outside this cache; the snapshot itself contains no member identity.
 */
export async function getCachedMemberAiTradingDeskSnapshot() {
  const [snapshot, settings] = await Promise.all([readCachedSnapshot(), getMemberAiTradingDeskSettings()]);
  return applyAiDeskOperationalState({ ...snapshot, settings });
}
