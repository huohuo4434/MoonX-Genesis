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
  memberAlias?: string;
  specialty?: string;
  priorityTier?: 1 | 2;
  priorityRank?: number;
};

// Private operating registry only. Member-facing pages must not expose handles.
export const X_SOURCE_REGISTRY: readonly XSourceRegistryEntry[] = [
  { handle: "BTCTW0", family: "CYCLE_TIMING", memberAlias: "江恩跨市场分析师", specialty: "江恩周期、加密、美股与贵金属", priorityTier: 1, priorityRank: 1 },
  { handle: "formnoshape", family: "MARKET_STRUCTURE", memberAlias: "低风险策略分析师", specialty: "日内结构、低风险交易与执行纪律", priorityTier: 1, priorityRank: 2 },
  { handle: "btcpiggy", family: "METAPHYSICAL_TIMING", memberAlias: "奇门周期分析师", specialty: "奇门遁甲、玄学周期与市场择时", priorityTier: 1, priorityRank: 3 },
  { handle: "yijiangren", family: "MARKET_STRUCTURE", memberAlias: "建模趋势分析师", specialty: "趋势建模、仓位结构与Web3", priorityTier: 1, priorityRank: 4 },
  { handle: "laban_li", family: "FUNDAMENTAL_EVENT", memberAlias: "宏观趋势分析师", specialty: "宏观、趋势预判与AI策略", priorityTier: 1, priorityRank: 5 },
  { handle: "WallStreet0Name", family: "MARKET_STRUCTURE", memberAlias: "市场结构观察员", specialty: "美股与加密市场结构", priorityTier: 2, priorityRank: 1 },
  { handle: "ximihoo1", family: "CYCLE_TIMING", memberAlias: "周期轮动分析师", specialty: "资产轮动、趋势与宏观周期", priorityTier: 2, priorityRank: 2 },
  { handle: "KeHenryA8", family: "TACTICAL_SENTIMENT", memberAlias: "短线交易分析师", specialty: "美股与加密短线交易", priorityTier: 2, priorityRank: 3 },
  { handle: "iiiinvest", family: "FUNDAMENTAL_EVENT", memberAlias: "前沿资产分析师", specialty: "SpaceX与高弹性前沿资产", priorityTier: 2, priorityRank: 4 },
  { handle: "coseryaya", family: "ALTCOIN_RADAR", memberAlias: "山寨动量分析师", specialty: "山寨币、AI交易与短线动量", priorityTier: 2, priorityRank: 5 },
  { handle: "jiujinshan2022", family: "ALTCOIN_RADAR" },
  { handle: "btckik", family: "ALTCOIN_RADAR" },
  { handle: "haliluya8911", family: "MARKET_STRUCTURE" },
  { handle: "Deltaking888", family: "CYCLE_TIMING" },
  { handle: "Meta8Mate", family: "ALTCOIN_RADAR" },
  { handle: "cfsq143", family: "MARKET_STRUCTURE" },
  { handle: "big_hunter11", family: "FLOW_LIQUIDITY" },
  { handle: "hibtc37", family: "FLOW_LIQUIDITY" },
  { handle: "Cycle_King1913", family: "CYCLE_TIMING" },
  { handle: "Lvzhishi", family: "FLOW_LIQUIDITY" },
  { handle: "thankUcrypto", family: "ALTCOIN_RADAR" },
  { handle: "Young852560", family: "MARKET_STRUCTURE" },
  { handle: "pcwler66", family: "METAPHYSICAL_TIMING" },
  { handle: "shawnus88896948", family: "TACTICAL_SENTIMENT" },
  { handle: "ArtofSpecuycky", family: "FUNDAMENTAL_EVENT" },
  { handle: "roger73005305", family: "MARKET_STRUCTURE" },
  { handle: "thewindisfree", family: "TACTICAL_SENTIMENT" },
  { handle: "mat78704", family: "CYCLE_TIMING" },
  { handle: "eastweb3eth", family: "FUNDAMENTAL_EVENT" },
] as const;

const ENTRY_BY_HANDLE = new Map(
  X_SOURCE_REGISTRY.map((entry) => [entry.handle.trim().toLowerCase(), entry] as const)
);

export function normalizeXSourceHandle(value: string | null | undefined): string {
  return String(value ?? "").replace(/^@+/, "").trim().toLowerCase();
}

export function xSourceFamilyForHandle(value: string | null | undefined): XSourceFamily {
  const normalized = normalizeXSourceHandle(value);
  if (!normalized) return "OTHER";
  return ENTRY_BY_HANDLE.get(normalized)?.family ?? "OTHER";
}

export function xSourceRegistryEntryForHandle(value: string | null | undefined): XSourceRegistryEntry | null {
  const normalized = normalizeXSourceHandle(value);
  if (!normalized) return null;
  return ENTRY_BY_HANDLE.get(normalized) ?? null;
}

export function configuredXWatchHandles(): string[] {
  return X_SOURCE_REGISTRY.map((entry) => entry.handle);
}
