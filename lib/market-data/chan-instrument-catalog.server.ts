import "server-only";
import { buildOrderlyChanInstruments, CHAN_INSTRUMENTS, mergeChanInstrumentCatalog } from "@/lib/market-data/chan-instrument-catalog";
import type { ChanInstrument } from "@/types/chan-execution";

export async function loadChanInstrumentCatalog(timeoutMs = 4_500): Promise<{ instruments: ChanInstrument[]; source: "MOONXDEX_ORDERLY" | "FALLBACK" }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(500, Math.min(timeoutMs, 5_000)));
  try {
    const response = await fetch("https://api.orderly.org/v1/public/futures", {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "MOOX-Chan-Catalog/1.0" },
    });
    if (!response.ok) throw new Error(`ORDERLY_MARKETS_HTTP_${response.status}`);
    const payload = await response.json() as { success?: boolean; data?: { rows?: Array<{ symbol?: unknown }> } };
    if (payload.success === false || !Array.isArray(payload.data?.rows)) throw new Error("ORDERLY_MARKETS_INVALID");
    const orderly = buildOrderlyChanInstruments(payload.data.rows);
    if (!orderly.length) throw new Error("ORDERLY_MARKETS_EMPTY");
    return { instruments: mergeChanInstrumentCatalog(orderly), source: "MOONXDEX_ORDERLY" };
  } catch {
    return { instruments: [...CHAN_INSTRUMENTS], source: "FALLBACK" };
  } finally {
    clearTimeout(timer);
  }
}
