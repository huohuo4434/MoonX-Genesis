import { prisma } from "@/lib/prisma";
import { UNIFIED_LIVE_HORIZON_LIMITS } from "@/lib/trading-signals/unified-live-config";
import type {
  UnifiedLiveExchangePosition,
  UnifiedLiveHorizon,
  UnifiedLiveHorizonSetting,
  UnifiedLiveMode,
} from "@/types/unified-live-trading";

export const DEFAULT_UNIFIED_LIVE_SETTINGS: UnifiedLiveHorizonSetting[] = [
  {
    horizon: "SHORT",
    enabled: true,
    sizingMode: "FIXED_MARGIN",
    sizingValue: 200,
    leverage: 2,
    maxOpenPositions: 2,
    maxLossPercent: 0.35,
    dailyLossPercent: 1,
    weeklyLossPercent: 2.5,
    maxMarginUsePercent: 20,
    target1ReducePercent: 30,
    isolatedMargin: true,
  },
  {
    horizon: "MEDIUM",
    enabled: true,
    sizingMode: "EQUITY_PERCENT",
    sizingValue: 8,
    leverage: 2,
    maxOpenPositions: 2,
    maxLossPercent: 0.5,
    dailyLossPercent: 1,
    weeklyLossPercent: 2.5,
    maxMarginUsePercent: 25,
    target1ReducePercent: 35,
    isolatedMargin: true,
  },
  {
    horizon: "LONG",
    enabled: true,
    sizingMode: "EQUITY_PERCENT",
    sizingValue: 10,
    leverage: 1,
    maxOpenPositions: 2,
    maxLossPercent: 0.4,
    dailyLossPercent: 1,
    weeklyLossPercent: 2.5,
    maxMarginUsePercent: 25,
    target1ReducePercent: 30,
    isolatedMargin: true,
  },
];

function isMissingTableError(error: unknown): boolean {
  const text = String(error instanceof Error ? error.message : error);
  return /MooxUnifiedLive|does not exist|no such table|P2021/i.test(text);
}

function requireUnifiedLiveDatabase() {
  const database = prisma;
  if (!database) {
    throw new Error("UNIFIED_LIVE_DATABASE_UNAVAILABLE");
  }
  return database;
}

export async function ensureUnifiedLiveAccount(input: {
  ownerKey: string;
  accountScope: "OFFICIAL" | "MEMBER";
  displayName?: string;
}) {
  const database = prisma;
  if (!database) {
    return { ok: false as const, migrationRequired: true, account: null };
  }

  try {
    const account = await database.mooxUnifiedLiveAccount.upsert({
      where: { ownerKey: input.ownerKey },
      create: {
        ownerKey: input.ownerKey,
        accountScope: input.accountScope,
        displayName: input.displayName,
        mode: "MANAGE_ONLY",
        newEntriesEnabled: false,
        positionManagementEnabled: true,
        settings: {
          create: DEFAULT_UNIFIED_LIVE_SETTINGS.map((setting) => ({ ...setting })),
        },
      },
      update: input.displayName ? { displayName: input.displayName } : {},
      include: { settings: true },
    });
    return { ok: true as const, migrationRequired: false, account };
  } catch (error) {
    if (isMissingTableError(error)) {
      return { ok: false as const, migrationRequired: true, account: null };
    }
    throw error;
  }
}

export async function getUnifiedLiveAccount(ownerKey: string) {
  const database = prisma;
  if (!database) {
    return { migrationRequired: true, account: null };
  }

  try {
    const account = await database.mooxUnifiedLiveAccount.findUnique({
      where: { ownerKey },
      include: {
        settings: { orderBy: { horizon: "asc" } },
        slices: { orderBy: { openedAt: "desc" }, take: 200 },
      },
    });
    return { migrationRequired: false, account };
  } catch (error) {
    if (isMissingTableError(error)) return { migrationRequired: true, account: null };
    throw error;
  }
}

export async function setUnifiedLiveMode(input: {
  ownerKey: string;
  mode: UnifiedLiveMode;
  newEntriesEnabled: boolean;
  positionManagementEnabled: boolean;
}) {
  const database = requireUnifiedLiveDatabase();
  return database.mooxUnifiedLiveAccount.update({
    where: { ownerKey: input.ownerKey },
    data: {
      mode: input.mode,
      newEntriesEnabled: input.newEntriesEnabled,
      positionManagementEnabled: input.positionManagementEnabled,
    },
  });
}

export async function saveUnifiedLiveSettings(
  ownerKey: string,
  settings: UnifiedLiveHorizonSetting[],
) {
  const database = requireUnifiedLiveDatabase();
  const account = await database.mooxUnifiedLiveAccount.findUniqueOrThrow({ where: { ownerKey } });
  await database.$transaction(
    settings.map((setting) =>
      database.mooxUnifiedLiveSetting.upsert({
        where: { accountId_horizon: { accountId: account.id, horizon: setting.horizon } },
        create: { accountId: account.id, ...setting, isolatedMargin: true },
        update: { ...setting, isolatedMargin: true },
      }),
    ),
  );
  return getUnifiedLiveAccount(ownerKey);
}

export async function claimUnifiedLivePosition(input: {
  ownerKey: string;
  position: UnifiedLiveExchangePosition;
  horizon: UnifiedLiveHorizon;
  sourceKind?: string;
}) {
  const database = requireUnifiedLiveDatabase();
  const account = await database.mooxUnifiedLiveAccount.findUniqueOrThrow({
    where: { ownerKey: input.ownerKey },
  });
  return database.mooxUnifiedLiveSlice.create({
    data: {
      accountId: account.id,
      symbol: input.position.symbol,
      horizon: input.horizon,
      side: input.position.side,
      status: "OPEN",
      sourceKind: input.sourceKind ?? "LEGACY_CLAIMED",
      exchangePositionKey: input.position.positionKey,
      marginAmount: 0,
      notionalAmount: Math.abs(input.position.quantity * input.position.entryPrice),
      quantity: Math.abs(input.position.quantity),
      leverage: Math.min(10, Math.max(1, Math.trunc(input.position.leverage ?? 1))),
      entryPrice: input.position.entryPrice,
      maxHoldMinutes: UNIFIED_LIVE_HORIZON_LIMITS[input.horizon],
      openedAt: new Date(),
      lastManagedAt: new Date(),
      nextCheckAt: new Date(Date.now() + 5 * 60_000),
      publicVisible: account.accountScope === "OFFICIAL",
    },
  });
}


export async function getUnifiedLiveSetting(
  ownerKey: string,
  horizon: UnifiedLiveHorizon,
): Promise<UnifiedLiveHorizonSetting | null> {
  const state = await getUnifiedLiveAccount(ownerKey);
  if (!state.account) return null;
  const row = state.account.settings.find((setting) => setting.horizon === horizon);
  if (!row) return DEFAULT_UNIFIED_LIVE_SETTINGS.find((setting) => setting.horizon === horizon) ?? null;
  return {
    horizon: row.horizon as UnifiedLiveHorizon,
    enabled: row.enabled,
    sizingMode: row.sizingMode as UnifiedLiveHorizonSetting["sizingMode"],
    sizingValue: row.sizingValue,
    leverage: row.leverage,
    maxOpenPositions: row.maxOpenPositions,
    maxLossPercent: row.maxLossPercent,
    dailyLossPercent: row.dailyLossPercent,
    weeklyLossPercent: row.weeklyLossPercent,
    maxMarginUsePercent: row.maxMarginUsePercent,
    target1ReducePercent: row.target1ReducePercent,
    isolatedMargin: true,
  };
}

export async function registerUnifiedLiveStrategySlice(input: {
  ownerKey: string;
  strategyDecisionId: string;
  symbol: string;
  horizon: UnifiedLiveHorizon;
  side: "LONG" | "SHORT";
  marginAmount: number;
  notionalAmount: number;
  quantity: number;
  leverage: number;
  entryPrice: number;
  stopPrice?: number | null;
  target1?: number | null;
  target2?: number | null;
  maxHoldMinutes?: number;
  sourceKind?: string;
  technicalEntry?: string | null;
  qimenDirection?: string | null;
  liuyaoDirection?: string | null;
  resonance?: "RESONANT" | "DIVERGENT" | "UNKNOWN" | null;
}) {
  const database = requireUnifiedLiveDatabase();
  const account = await database.mooxUnifiedLiveAccount.findUniqueOrThrow({
    where: { ownerKey: input.ownerKey },
  });
  const existing = await database.mooxUnifiedLiveSlice.findFirst({
    where: {
      accountId: account.id,
      strategyDecisionId: input.strategyDecisionId,
      status: { in: ["PENDING", "OPEN", "PARTIALLY_CLOSED"] },
    },
  });
  if (existing) return existing;
  return database.mooxUnifiedLiveSlice.create({
    data: {
      accountId: account.id,
      symbol: input.symbol,
      horizon: input.horizon,
      side: input.side,
      status: "PENDING",
      sourceKind: input.sourceKind ?? "THREE_HORIZON_LIVE",
      strategyDecisionId: input.strategyDecisionId,
      marginAmount: Math.max(0, input.marginAmount),
      notionalAmount: Math.max(0, input.notionalAmount),
      quantity: Math.abs(input.quantity),
      leverage: Math.min(input.ownerKey === "official" ? 2 : 10, Math.max(1, Math.trunc(input.leverage))),
      entryPrice: input.entryPrice,
      stopPrice: input.stopPrice ?? null,
      target1: input.target1 ?? null,
      target2: input.target2 ?? null,
      maxHoldMinutes: input.maxHoldMinutes ?? UNIFIED_LIVE_HORIZON_LIMITS[input.horizon],
      openedAt: new Date(),
      lastManagedAt: new Date(),
      nextCheckAt: new Date(Date.now() + 60_000),
      technicalEntry: input.technicalEntry ?? null,
      qimenDirection: input.qimenDirection ?? null,
      liuyaoDirection: input.liuyaoDirection ?? null,
      resonance: input.resonance ?? null,
      publicVisible: account.accountScope === "OFFICIAL",
    },
  });
}

export async function markUnifiedLiveManualClosures(ownerKey: string, sliceIds: string[]) {
  if (!sliceIds.length) return { count: 0 };
  const database = requireUnifiedLiveDatabase();
  const account = await database.mooxUnifiedLiveAccount.findUnique({ where: { ownerKey } });
  if (!account) return { count: 0 };
  return database.mooxUnifiedLiveSlice.updateMany({
    where: {
      accountId: account.id,
      id: { in: sliceIds },
      status: { in: ["PENDING", "OPEN", "PARTIALLY_CLOSED"] },
    },
    data: {
      status: "CLOSED_MANUAL",
      closedAt: new Date(),
      closeReason: "EXCHANGE_POSITION_ABSENT",
    },
  });
}

export async function recordUnifiedLiveEvents(
  ownerKey: string,
  events: Array<{
    code: string;
    severity: string;
    detail: string;
    symbol?: string;
    sliceId?: string;
    positionKey?: string;
  }>,
) {
  if (!events.length) return;
  const database = requireUnifiedLiveDatabase();
  const account = await database.mooxUnifiedLiveAccount.findUnique({ where: { ownerKey } });
  if (!account) return;
  await database.mooxUnifiedLiveEvent.createMany({
    data: events.map((event) => ({ accountId: account.id, ...event })),
  });
}

export async function listPublicUnifiedLiveSlices() {
  const database = prisma;
  if (!database) return { active: [], pending: [], recentHistory: [] };

  try {
    const [active, pending, recentHistory] = await Promise.all([
      database.mooxUnifiedLiveSlice.findMany({
        where: { publicVisible: true, status: { in: ["OPEN", "PARTIALLY_CLOSED"] } },
        orderBy: { openedAt: "desc" },
        take: 50,
      }),
      database.mooxUnifiedLiveSlice.findMany({
        where: { publicVisible: true, status: "PENDING" },
        orderBy: { openedAt: "desc" },
        take: 50,
      }),
      database.mooxUnifiedLiveSlice.findMany({
        where: { publicVisible: true, status: { notIn: ["OPEN", "PARTIALLY_CLOSED", "PENDING"] } },
        orderBy: [{ closedAt: "desc" }, { updatedAt: "desc" }],
        take: 20,
      }),
    ]);
    return { active, pending, recentHistory };
  } catch (error) {
    if (isMissingTableError(error)) return { active: [], pending: [], recentHistory: [] };
    throw error;
  }
}
