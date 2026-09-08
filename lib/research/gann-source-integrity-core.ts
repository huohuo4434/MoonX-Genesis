// Guard the Gann consumer without widening the shared trading parser's symbol universe.
const EQUIVALENTS: Record<string, string> = {
  XAU: "XAUT", XAUUSD: "XAUT", GOLD: "XAUT", XAG: "XAG", XAGUSD: "XAG", SILVER: "XAG",
  SPX: "SPY", NDX: "QQQ", GOOG: "GOOGL", WTI: "CL",
};
function canonical(value: string) {
  const symbol = value.toUpperCase().replace(/USDT$/, "");
  return EQUIVALENTS[symbol] ?? symbol;
}

export function gannHasUnambiguousSymbol(text: string, parsedSymbol: string): boolean {
  const expected = canonical(parsedSymbol);
  const mentions = [...text.matchAll(/\$([A-Za-z][A-Za-z0-9]{0,9})\b/g)].map(match => match[1]!);
  // These equities are absent from the legacy parser. A BTC comparison must not
  // turn their support, target or return figures into BTC levels.
  mentions.push(...[...text.matchAll(/\b(?:MSTR|CRCL|SNDK|SPCX|HOOD|COIN|LITE|MSFT|PLTR|TSLA|NVDA|AMD|SOXL|SOXX)\b/gi)].map(match => match[0]));
  if (/微策略|微战略|微戰略|MicroStrategy/i.test(text)) mentions.push("MSTR");
  return mentions.every(symbol => canonical(symbol) === expected);
}

export function explicitGannTimeWindows(windows: string[]): string[] {
  // Legacy parser can read 35.82, 8.71% and price ranges as calendar dates.
  // Ambiguous punctuation-only values require manual review, never auto-lock.
  return windows.filter(window => /月|日|号|周|今天|明天|后天|^20\d{2}-\d{2}-\d{2}$/.test(window));
}
