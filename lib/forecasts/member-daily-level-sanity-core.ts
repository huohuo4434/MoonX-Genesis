import {
  HSTECH_MIN_INDEX_LEVEL,
  isHstechSymbol,
} from "@/lib/market-data/quote-symbols";

export function isPlausibleMemberTechnicalScale(symbol: string, values: number[]): boolean {
  if (!isHstechSymbol(symbol, symbol)) return true;
  return values.length > 0 && values.every(
    (value) => Number.isFinite(value) && value >= HSTECH_MIN_INDEX_LEVEL,
  );
}

export function numericLevelValues(text: string): number[] {
  return (text.replaceAll(",", "").match(/\d+(?:\.\d+)?/g) ?? [])
    .map(Number)
    .filter(Number.isFinite);
}
