import type { MemberTradingInstrument } from "@/types/member-trading-plan";

export type BitgetPublicInstrument = { symbol?: string; category?: string; status?: string };

export function intersectFocusWithBitget(input: {
  focus: Array<{ canonicalSymbol: string; displayName: string; assetClass: MemberTradingInstrument["assetClass"] }>;
  contracts: readonly BitgetPublicInstrument[];
  discoveredAt: string;
}): MemberTradingInstrument[] {
  const online = new Set(input.contracts
    .filter((row) => row.category === "USDT-FUTURES" && row.status === "online" && typeof row.symbol === "string")
    .map((row) => row.symbol!.toUpperCase()));
  return input.focus.map((row) => {
    const exact = row.canonicalSymbol.toUpperCase();
    const available = online.has(exact);
    return {
      canonicalSymbol: exact,
      displayName: row.displayName,
      assetClass: row.assetClass,
      bitgetSymbol: available ? exact : null,
      availability: available ? "AVAILABLE" : "UNAVAILABLE",
      executionScope: available ? "PAPER_LOCAL" : "RESEARCH_ONLY",
      discoveredAt: input.discoveredAt,
    };
  });
}
