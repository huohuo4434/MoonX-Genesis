import "server-only";

import { unstable_cache } from "next/cache";
import { getMemberAiTradingDeskSnapshot } from "@/lib/trading-signals/member-ai-trading-desk";

const readCachedSnapshot = unstable_cache(
  async () => getMemberAiTradingDeskSnapshot(),
  ["member-ai-trading-desk-snapshot-v63"],
  { revalidate: 15 }
);

/**
 * Shared read-only snapshot for all authorised members.
 * Authentication stays outside this cache; the snapshot itself contains no member identity.
 */
export async function getCachedMemberAiTradingDeskSnapshot() {
  return readCachedSnapshot();
}
