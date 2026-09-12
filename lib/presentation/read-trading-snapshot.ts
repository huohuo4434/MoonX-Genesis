import type { AiTradingDeskSnapshot } from "@/types/ai-trading-desk";

/** Member read only; does not refresh the exchange or alter execution authority. */
export async function readTradingSnapshot(cancel: AbortSignal): Promise<AiTradingDeskSnapshot> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  cancel.addEventListener("abort", abort, { once: true });
  if (cancel.aborted) controller.abort();
  const timer = setTimeout(abort, 25_000);
  try {
    const response = await fetch("/api/member/ai-trading-desk", {
      cache: "no-store", signal: controller.signal, headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("SNAPSHOT_UNAVAILABLE");
    const data = await response.json() as AiTradingDeskSnapshot;
    if (!data?.settings || !data.runtime || !data.experiment || !data.stats || !data.planSummary ||
      !["BITGET_DEMO", "BITGET_LIVE"].includes(data.ledgerSource) ||
      ![data.publishedPlans, data.positions, data.recentTrades, data.strategies].every(Array.isArray)) {
      throw new Error("SNAPSHOT_INVALID");
    }
    return data;
  } catch {
    // Never reflect private server errors into a member-facing message.
    throw new Error("SNAPSHOT_UNAVAILABLE");
  } finally {
    clearTimeout(timer);
    cancel.removeEventListener("abort", abort);
  }
}
