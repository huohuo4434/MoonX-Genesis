export type ExactUsdtSymbol = `${string}USDT`;

function normalize(value: string): ExactUsdtSymbol | null {
  const normalized = value.trim().toUpperCase().replace(/[-_\/\s]/g, "");
  const base = normalized.endsWith("USDT") ? normalized.slice(0, -4) : normalized;
  return /^[A-Z0-9]{2,15}$/.test(base) ? `${base}USDT` : null;
}

/** Pure environment-policy resolver. Opt-outs remove symbols even when they also appear in the base value. */
export function resolveAllowedSymbolUniverse(input: {
  defaultSymbols: readonly ExactUsdtSymbol[];
  configuredSymbols?: string;
  stockPerps: readonly ExactUsdtSymbol[];
  focusPerps: readonly ExactUsdtSymbol[];
  includeStockPerps?: boolean;
  includeFocusPerps?: boolean;
}): ExactUsdtSymbol[] {
  const raw = input.configuredSymbols?.trim() || input.defaultSymbols.join(",");
  const stockSet = new Set<string>(input.stockPerps);
  const focusSet = new Set<string>(input.focusPerps);
  const values = raw.split(",")
    .map(normalize)
    .filter((value): value is ExactUsdtSymbol => Boolean(value))
    .filter((value) => input.includeStockPerps !== false || !stockSet.has(value))
    .filter((value) => input.includeFocusPerps !== false || !focusSet.has(value));
  const stockPerps = input.includeStockPerps === false ? [] : input.stockPerps;
  const focusPerps = input.includeFocusPerps === false ? [] : input.focusPerps;
  return Array.from(new Set([...values, ...stockPerps, ...focusPerps]));
}
