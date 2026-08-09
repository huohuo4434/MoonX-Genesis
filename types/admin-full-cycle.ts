export type AdminCycleAssetClass = "CORE" | "FOCUS";
export type AdminCycleMarket = "crypto" | "us" | "cn" | "hk" | "commodity" | "stock";
export type AdminCycleHorizon = "DAY" | "WEEK" | "MONTH";
export type AdminLevelTimeframe = "4H" | "1D" | "1W";

export type AdminCycleAsset = {
  id: string;
  name: string;
  symbol: string;
  assetClass: AdminCycleAssetClass;
  market: AdminCycleMarket;
};

export type AdminCycleForecastRow = {
  id: string;
  assetId: string;
  horizon: AdminCycleHorizon;
  periodStart: string;
  periodEnd: string;
  direction: string;
  path: string;
  probabilityLabel: string;
  sourceLabel: string;
  status: string;
  version: number | null;
  publishedAt?: string | null;
  lockedAt?: string | null;
};

export type AdminKeyDateRecord = {
  id: string;
  assetId: string;
  date: string;
  ganzhi: string | null;
  branchRule: string | null;
  effect: string;
  source: string;
  label: string;
  note: string | null;
  enabled: boolean;
  createdAt: string;
};

export type AdminPriceZone = {
  id: string;
  assetId: string;
  timeframe: AdminLevelTimeframe;
  effectiveDate: string;
  supportLevels: string[];
  resistanceLevels: string[];
  confirmation: string | null;
  invalidation: string | null;
  note: string | null;
  enabled: boolean;
  updatedAt: string;
};

export type AdminBreakoutEvent = {
  id: string;
  assetId: string;
  timeframe: AdminLevelTimeframe;
  eventDate: string;
  closePrice: number;
  eventType: "PRESSURE_BREAK" | "SUPPORT_BREAK" | "IN_RANGE";
  alignment: "ALIGNED" | "CONFLICT" | "UNCLEAR";
  evidence: string;
  note: string | null;
};

export type AdminFullCycleSnapshot = {
  generatedAt: string;
  databaseReady: boolean;
  assets: AdminCycleAsset[];
  forecasts: AdminCycleForecastRow[];
  keyDates: AdminKeyDateRecord[];
  priceZones: AdminPriceZone[];
  breakoutEvents: AdminBreakoutEvent[];
};
