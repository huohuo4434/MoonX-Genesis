import "server-only";

import { prisma } from "@/lib/prisma";
import { buildMemberKeyDateRadar } from "@/lib/data/member-key-date-radar";
import { applyVerifiedGannKeyDateOverlay } from "@/lib/research/gann-prediction-overlay-core";
import { getVerifiedGannPredictionSignals } from "@/lib/research/gann-prediction-signals.server";
import { buildGannForwardCandidates, evaluateGannForwardSample, mergeGannForwardSamples, summarizeGannForwardSnapshot, type GannForwardSnapshot } from "@/lib/research/gann-forward-verification-core";
import { fetchRecentDailyBarsForForecast } from "@/lib/market-data/daily-prices";
import { ensureExternalAnalystTables } from "@/lib/trading-signals/external-analyst-signals";
import type { DailyAccuracyMarket } from "@/types/daily-accuracy";

const STATE_KEY = "gann_forward_verification_v1";

function beijingDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function marketTarget(symbolInput: string): { quoteSymbol: string; market: DailyAccuracyMarket } | null {
  const symbol = symbolInput.toUpperCase().replace(/USDT$/, "");
  if (symbol === "BTC") return { quoteSymbol: "BTC-USD", market: "CRYPTO" };
  if (symbol === "ETH") return { quoteSymbol: "ETH-USD", market: "CRYPTO" };
  if (["XAU", "XAUT", "GOLD", "PAXG"].includes(symbol)) return { quoteSymbol: "GC=F", market: "US_FUTURES" };
  if (["XAG", "SILVER"].includes(symbol)) return { quoteSymbol: "SI=F", market: "US_FUTURES" };
  if (symbol === "SPX" || symbol === "SPX500") return { quoteSymbol: "^GSPC", market: "US" };
  if (symbol === "NDX" || symbol === "NAS100") return { quoteSymbol: "^NDX", market: "US" };
  return /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol) ? { quoteSymbol: symbol, market: "US" } : null;
}

export async function getGannForwardVerificationSnapshot(): Promise<GannForwardSnapshot | null> {
  if (!prisma || !(await ensureExternalAnalystTables())) return null;
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ payload: unknown }>>(
      `SELECT payload FROM trade_external_analyst_state WHERE state_key = $1 LIMIT 1`,
      STATE_KEY,
    );
    const payload = rows[0]?.payload;
    if (!payload) return null;
    return (typeof payload === "string" ? JSON.parse(payload) : payload) as GannForwardSnapshot;
  } catch {
    return null;
  }
}

export async function runGannForwardVerificationCycle(now = new Date()) {
  if (!prisma || !(await ensureExternalAnalystTables())) return { stored: false, ...summarizeGannForwardSnapshot([]) };
  const today = beijingDate(now);
  const [existing, signals] = await Promise.all([getGannForwardVerificationSnapshot(), getVerifiedGannPredictionSignals(now)]);
  const overlaid = applyVerifiedGannKeyDateOverlay(buildMemberKeyDateRadar(today), signals);
  const candidates = buildGannForwardCandidates(overlaid, today, now.toISOString());
  let samples = mergeGannForwardSamples(existing?.samples ?? [], candidates, today);

  for (const sample of samples.filter((row) => row.verdict === "DATA_PENDING").slice(0, 6)) {
    const target = marketTarget(sample.symbol);
    if (!target) continue;
    try {
      const bars = await fetchRecentDailyBarsForForecast({ ...target, asOfDate: addDays(sample.focusDate, 5) });
      const evaluated = evaluateGannForwardSample(sample, bars, now.toISOString());
      samples = samples.map((row) => row.id === sample.id ? evaluated : row);
    } catch {
      // Provider failure is not an empty market and never becomes a fabricated result.
    }
  }

  const snapshot: GannForwardSnapshot = { version: 1, generatedAt: now.toISOString(), samples };
  await prisma.$executeRawUnsafe(
    `INSERT INTO trade_external_analyst_state(state_key, payload, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (state_key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    STATE_KEY,
    JSON.stringify(snapshot),
  );
  return { stored: true, ...summarizeGannForwardSnapshot(samples) };
}
