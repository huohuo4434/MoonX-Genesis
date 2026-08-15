import "server-only";
import { listAiTradingFocusRegistry } from "@/lib/trading-signals/ai-trading-focus";
import { intersectFocusWithBitget, type BitgetPublicInstrument } from "@/lib/trading-signals/member-instrument-registry";
import type { MemberTradingInstrument } from "@/types/member-trading-plan";

export async function loadMemberTradingInstruments(now = new Date()): Promise<{
  discoveryStatus: "ONLINE" | "UNAVAILABLE"; discoveredAt: string; instruments: MemberTradingInstrument[];
}> {
  const discoveredAt = now.toISOString();
  let contracts: BitgetPublicInstrument[] = [];
  let discoveryStatus: "ONLINE" | "UNAVAILABLE" = "UNAVAILABLE";
  try {
    const response = await fetch("https://api.bitget.com/api/v3/market/instruments?category=USDT-FUTURES", {
      cache: "no-store", signal: AbortSignal.timeout(5_000), headers: { Accept: "application/json" },
    });
    const body = await response.json() as { code?: string; data?: unknown };
    if (!response.ok || body.code !== "00000" || !Array.isArray(body.data)) throw new Error("Bitget instruments unavailable");
    contracts = body.data as BitgetPublicInstrument[];
    discoveryStatus = "ONLINE";
  } catch { /* fail closed: every focus item remains research-only */ }
  return { discoveryStatus, discoveredAt, instruments: intersectFocusWithBitget({ focus: listAiTradingFocusRegistry(), contracts, discoveredAt }) };
}
