import { isTradingDay } from "@/lib/calendar/next-trading-day";
import type { StaticFocusAssetId } from "@/lib/data/conviction/focus-registry-core";
import type { DailyForecastMarket } from "@/types/daily-forecast";

const FOCUS_SESSION_MARKET: Readonly<Record<StaticFocusAssetId, DailyForecastMarket>> = Object.freeze({
  "ganfeng-lithium": "cn",
  "lian-tech": "cn",
  "lexin-medical": "cn",
  cxmt: "cn",
  asteroid: "crypto",
  sandisk: "us",
  nbis: "us",
  mu: "us",
  nvda: "us",
  aapl: "us",
  amzn: "us",
  hype: "crypto",
  sol: "crypto",
  eth: "crypto",
  btc: "crypto",
  googl: "us",
  msft: "us",
  tencent: "hk",
  "kingsoft-office": "cn",
  tsla: "us",
  lite: "us",
  spcx: "us",
  intel: "us",
  gold: "commodity",
  silver: "commodity",
  "wti-crude": "commodity",
});

/**
 * Canonical exchange calendar for the member focus registry.
 * Unknown assets fail closed as a traditional US session so a missing mapping
 * cannot silently create a weekend forecast. Crypto must be explicitly mapped.
 */
export function focusSessionMarket(assetId: string): DailyForecastMarket {
  return FOCUS_SESSION_MARKET[assetId as StaticFocusAssetId] ?? "us";
}

export function isFocusTradingDay(assetId: string, date: string): boolean {
  return isTradingDay(focusSessionMarket(assetId), date);
}

export function focusClosedSessionSummary(assetId: string): string {
  const market = focusSessionMarket(assetId);
  const marketLabel = market === "cn" ? "A股" : market === "hk" ? "港股" : market === "commodity" ? "商品" : "美股";
  return `${marketLabel}休市观察：不生成正式日方向，不计入命中率或待验证样本。`;
}
