import { isChartTradingDay, isChartCrypto } from "./chart-market-calendar";
import { isValidChanCandle } from "@/lib/market-data/chan-market-data-core";
import type { ChanCandle } from "@/types/chan-execution";
import type { ChartBar } from "./key-date-chart";

export const addChartDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
export function exchangeDate(now: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
}
export function expectedClosedSession(asset: string, timeZone: string, now: number) {
  const today = exchangeDate(now, timeZone);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(now));
  const minute = Number(parts.find(p => p.type === "hour")?.value) * 60 + Number(parts.find(p => p.type === "minute")?.value);
  // Equities: closing auction plus 30-minute provider-finalization buffer.
  // Futures: retain conservative next-exchange-date rule until contract sessions are verified.
  const sameDay = timeZone !== "UTC" && !["gold", "silver"].includes(asset) && minute >= 16 * 60 + 30;
  let date = sameDay ? today : addChartDays(today, -1);
  for (let i = 0; i < 16 && !isChartTradingDay(asset, date); i++) date = addChartDays(date, -1);
  return date;
}
export function finalizedChartBars(candles: ChanCandle[], asset: string, timeZone: string, now: number): ChartBar[] {
  const expected = expectedClosedSession(asset, timeZone, now);
  return [...new Map(candles.filter(isValidChanCandle).filter(bar => bar.timestamp < now)
    .filter(bar => !isChartCrypto(asset) || (timeZone === 'UTC' && bar.timestamp % 86_400_000 === 0 && bar.timestamp + 86_400_000 <= now))
    .map(bar => ({ ...bar, date: exchangeDate(bar.timestamp, timeZone) }))
    .filter(bar => bar.date <= expected && isChartTradingDay(asset, bar.date))
    .sort((a, b) => a.timestamp - b.timestamp).map(bar => [bar.date, bar])).values()].slice(-100);
}
