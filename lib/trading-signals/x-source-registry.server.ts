import "server-only";

export type XSourceFamily =
  | "ALTCOIN_RADAR"
  | "MARKET_STRUCTURE"
  | "FLOW_LIQUIDITY"
  | "CYCLE_TIMING"
  | "METAPHYSICAL_TIMING"
  | "FUNDAMENTAL_EVENT"
  | "TACTICAL_SENTIMENT"
  | "OTHER";

export type XSourceRegistryEntry = {
  handle: string;
  family: XSourceFamily;
};

// Private operating registry only. Member-facing pages must not expose handles.
export const X_SOURCE_REGISTRY: readonly XSourceRegistryEntry[] = [
  { handle: "btckik", family: "ALTCOIN_RADAR" },
  { handle: "BTCTW0", family: "MARKET_STRUCTURE" },
  { handle: "haliluya8911", family: "MARKET_STRUCTURE" },
  { handle: "Deltaking888", family: "CYCLE_TIMING" },
  { handle: "btcpiggy", family: "METAPHYSICAL_TIMING" },
  { handle: "Meta8Mate", family: "ALTCOIN_RADAR" },
  { handle: "ximihoo1", family: "CYCLE_TIMING" },
  { handle: "cfsq143", family: "MARKET_STRUCTURE" },
  { handle: "big_hunter11", family: "FLOW_LIQUIDITY" },
  { handle: "hibtc37", family: "FLOW_LIQUIDITY" },
  { handle: "Cycle_King1913", family: "CYCLE_TIMING" },
  { handle: "Lvzhishi", family: "FLOW_LIQUIDITY" },
  { handle: "formnoshape", family: "CYCLE_TIMING" },
  { handle: "thankUcrypto", family: "ALTCOIN_RADAR" },
  { handle: "Young852560", family: "MARKET_STRUCTURE" },
  { handle: "pcwler66", family: "METAPHYSICAL_TIMING" },
  { handle: "shawnus88896948", family: "TACTICAL_SENTIMENT" },
  { handle: "yijiangren", family: "FUNDAMENTAL_EVENT" },
  { handle: "laban_li", family: "ALTCOIN_RADAR" },
  { handle: "iiiinvest", family: "MARKET_STRUCTURE" },
  { handle: "ArtofSpecuycky", family: "FUNDAMENTAL_EVENT" },
  { handle: "roger73005305", family: "MARKET_STRUCTURE" },
  { handle: "thewindisfree", family: "TACTICAL_SENTIMENT" },
  { handle: "mat78704", family: "CYCLE_TIMING" },
  { handle: "eastweb3eth", family: "FUNDAMENTAL_EVENT" },
  { handle: "WallStreet0Name", family: "MARKET_STRUCTURE" },
] as const;

const FAMILY_BY_HANDLE = new Map(
  X_SOURCE_REGISTRY.map((entry) => [entry.handle.trim().toLowerCase(), entry.family] as const)
);

export function normalizeXSourceHandle(value: string | null | undefined): string {
  return String(value ?? "").replace(/^@+/, "").trim().toLowerCase();
}

export function xSourceFamilyForHandle(value: string | null | undefined): XSourceFamily {
  const normalized = normalizeXSourceHandle(value);
  if (!normalized) return "OTHER";
  return FAMILY_BY_HANDLE.get(normalized) ?? "OTHER";
}

export function configuredXWatchHandles(): string[] {
  return X_SOURCE_REGISTRY.map((entry) => entry.handle);
}
