export type TradeSignalDirection = "LONG" | "SHORT" | "NEUTRAL";
export type TradeSignalStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ARMED"
  | "TRIGGERED"
  | "ACTIVE"
  | "TAKE_PROFIT"
  | "STOPPED"
  | "CANCELLED"
  | "CLOSED";
export type TradeSignalEntryMode =
  | "BUY_ZONE"
  | "BREAKOUT"
  | "PULLBACK"
  | "MARKET"
  | "MANUAL";

export interface TradeSignalMethodVote {
  id: string;
  signalId: string;
  method: string;
  direction: TradeSignalDirection;
  weight: number;
  confidence: number;
  evidence: string;
  createdAt: string;
}

export interface TradeSignalResult {
  id: string;
  signalId: string;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  maxFavorablePct: number | null;
  maxAdversePct: number | null;
  verdict: "WIN" | "LOSS" | "FLAT" | "UNVERIFIABLE";
  note: string;
  closedAt: string;
  createdAt: string;
}

export interface TradeSignalEvent {
  id: string;
  signalId: string;
  eventType: string;
  provider: string;
  externalOrderId: string | null;
  price: number | null;
  quantity: number | null;
  payload: Record<string, unknown> | null;
  note: string;
  occurredAt: string;
  createdAt: string;
}

export interface TradeSignalRecord {
  id: string;
  assetId: string;
  symbol: string;
  assetName: string;
  market: string;
  timeframe: string;
  direction: TradeSignalDirection;
  status: TradeSignalStatus;
  starLevel: number;
  consensusScore: number;
  entryMode: TradeSignalEntryMode;
  entryLow: number | null;
  entryHigh: number | null;
  triggerPrice: number | null;
  stopLoss: number | null;
  stopConfirmTimeframe: string;
  target1: number | null;
  target2: number | null;
  target3: number | null;
  quantity: number | null;
  notionalAmount: number | null;
  positionSizePct: number | null;
  maxRiskPct: number | null;
  validFrom: string;
  validUntil: string | null;
  rationale: string;
  executionPlan: string;
  invalidation: string;
  sourceForecastId: string | null;
  apiVisible: boolean;
  paperOnly: boolean;
  version: number;
  publishedAt: string | null;
  lockedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  methods: TradeSignalMethodVote[];
  result: TradeSignalResult | null;
}

export interface TradeSignalStarStat {
  starLevel: number;
  sampleCount: number;
  winCount: number;
  lossCount: number;
  flatCount: number;
  winRate: number | null;
  averageReturnPct: number | null;
  averageFavorablePct: number | null;
  averageAdversePct: number | null;
}

export type TradeSignalDatabaseMode = "PRISMA" | "SUPABASE_TABLES_MISSING" | "MISSING";

export interface TradeSignalDashboardSnapshot {
  signals: TradeSignalRecord[];
  starStats: TradeSignalStarStat[];
  activeCount: number;
  armedCount: number;
  closedCount: number;
  databaseReady: boolean;
  databaseMode: TradeSignalDatabaseMode;
  databaseMessage: string;
}

export interface TradeSignalApiPayload {
  schema: "moonx.trade.signal.v1";
  generatedAt: string;
  signal: {
    id: string;
    asset: { id: string; symbol: string; name: string; market: string };
    timeframe: string;
    direction: TradeSignalDirection;
    status: TradeSignalStatus;
    confidence: { stars: number; score: number };
    entry: {
      mode: TradeSignalEntryMode;
      low: number | null;
      high: number | null;
      trigger: number | null;
    };
    risk: {
      stopLoss: number | null;
      confirmationTimeframe: string;
      maxRiskPct: number | null;
      positionSizePct: number | null;
    };
    targets: Array<number>;
    execution: {
      quantity: number | null;
      notionalAmount: number | null;
      paperOnly: boolean;
    };
    validFrom: string;
    validUntil: string | null;
    rationale: string;
    executionPlan: string;
    invalidation: string;
    methods: Array<{
      method: string;
      direction: TradeSignalDirection;
      weight: number;
      confidence: number;
      evidence: string;
    }>;
  };
}
