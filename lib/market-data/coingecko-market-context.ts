import "server-only";

import type { CoinGeckoMarketContext, CoinGeckoTrendingCoin } from "@/types/market-microstructure";

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchCoinGeckoJson(path: string): Promise<unknown> {
  const proKey = process.env.COINGECKO_PRO_API_KEY?.trim();
  const demoKey = process.env.COINGECKO_DEMO_API_KEY?.trim();
  const base = proKey ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "MOOX-Market-Context/1.0",
  };
  if (proKey) headers["x-cg-pro-api-key"] = proKey;
  else if (demoKey) headers["x-cg-demo-api-key"] = demoKey;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const response = await fetch(`${base}${path}`, {
      headers,
      signal: controller.signal,
      next: { revalidate: 600 },
    });
    if (!response.ok) throw new Error(`COINGECKO_HTTP_${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function parseTrending(payload: unknown): CoinGeckoTrendingCoin[] {
  const rows = (payload as { coins?: Array<{ item?: Record<string, unknown> }> })?.coins ?? [];
  return rows.slice(0, 10).flatMap((row): CoinGeckoTrendingCoin[] => {
    const item = row.item;
    if (!item) return [];
    const id = typeof item.id === "string" ? item.id : "";
    const symbol = typeof item.symbol === "string" ? item.symbol.toUpperCase() : "";
    const name = typeof item.name === "string" ? item.name : symbol;
    if (!id || !symbol) return [];
    const data = item.data as Record<string, unknown> | undefined;
    const changes = data?.price_change_percentage_24h as Record<string, unknown> | undefined;
    return [{
      id,
      symbol,
      name,
      marketCapRank: finiteNumber(item.market_cap_rank),
      priceUsd: finiteNumber(data?.price),
      priceChangePct24h: finiteNumber(changes?.usd),
    }];
  });
}

export async function loadCoinGeckoMarketContext(): Promise<CoinGeckoMarketContext> {
  const updatedAt = new Date().toISOString();
  try {
    const settled = await Promise.allSettled([
      fetchCoinGeckoJson("/global"),
      fetchCoinGeckoJson("/search/trending"),
    ]);
    const globalPayload = settled[0]?.status === "fulfilled" ? settled[0].value : null;
    const trendingPayload = settled[1]?.status === "fulfilled" ? settled[1].value : null;
    const data = (globalPayload as { data?: Record<string, unknown> } | null)?.data;
    const totalMarketCap = data?.total_market_cap as Record<string, unknown> | undefined;
    const totalVolume = data?.total_volume as Record<string, unknown> | undefined;
    const dominance = data?.market_cap_percentage as Record<string, unknown> | undefined;
    return {
      available: Boolean(data || trendingPayload),
      totalMarketCapUsd: finiteNumber(totalMarketCap?.usd),
      totalVolumeUsd: finiteNumber(totalVolume?.usd),
      marketCapChangePct24h: finiteNumber(data?.market_cap_change_percentage_24h_usd),
      btcDominancePct: finiteNumber(dominance?.btc),
      ethDominancePct: finiteNumber(dominance?.eth),
      trending: parseTrending(trendingPayload),
      updatedAt,
      errorCode: data || trendingPayload ? null : "COINGECKO_UNAVAILABLE",
    };
  } catch {
    return {
      available: false,
      totalMarketCapUsd: null,
      totalVolumeUsd: null,
      marketCapChangePct24h: null,
      btcDominancePct: null,
      ethDominancePct: null,
      trending: [],
      updatedAt,
      errorCode: "COINGECKO_UNAVAILABLE",
    };
  }
}
