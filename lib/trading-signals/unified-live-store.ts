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
  if (!database) return [];

  try {
    return await database.mooxUnifiedLiveSlice.findMany({
      where: { publicVisible: true },
      orderBy: [{ status: "asc" }, { openedAt: "desc" }],
      take: 100,
    });
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}
