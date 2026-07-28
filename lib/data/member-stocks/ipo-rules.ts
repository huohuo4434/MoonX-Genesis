import {
  CHANGXIN_IPO_HIGH_VOL_DATES,
  CHANGXIN_STOCK_ID,
} from "@/lib/data/member-stocks/changxin-688825";

export function isIpoHighVolatilityDate(stockId: string, date: string): boolean {
  if (stockId !== CHANGXIN_STOCK_ID) return false;
  return (CHANGXIN_IPO_HIGH_VOL_DATES as readonly string[]).includes(date);
}

export function capIpoConfidence(stockId: string, date: string, confidence: number): number {
  if (!isIpoHighVolatilityDate(stockId, date)) return confidence;
  return Math.min(confidence, 60);
}
