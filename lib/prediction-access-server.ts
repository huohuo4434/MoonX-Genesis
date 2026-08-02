import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { getAccessUser } from "@/lib/auth/get-access-user";
import {
  checkTodayPredictionAccess,
  checkTomorrowPredictionAccess,
  checkWeeklyPredictionAccess,
  TODAY_PREDICTION_MESSAGES,
  TOMORROW_PREDICTION_MESSAGES,
  WEEKLY_PREDICTION_MESSAGES,
  type MemberPredictionAccess,
  type PredictionAccessUser,
  type TodayPredictionAccess,
} from "@/lib/prediction-access";
import { sortByDailyAssetOrder } from "@/lib/data/daily-asset-order";
import {
  applyTodayFacingCopy,
  getMemberTomorrowForecasts,
  getPublicTodayForecasts,
  isHumanPublishedForecast,
  toTodayPublicTeaserMeta,
} from "@/lib/data/daily-forecasts";
import { normalizeFormalDirection } from "@/lib/forecasts/formal-direction";
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import type { DailyForecast } from "@/types/daily-forecast";

export type FreshPredictionUser = {
  userId: string | null;
  email: string | null;
  accessUser: PredictionAccessUser | null;
};

export async function loadFreshPredictionUser(): Promise<FreshPredictionUser> {
  noStore();
  const snap = await getAccessUser();
  return {
    userId: snap.userId,
    email: snap.email,
    accessUser: snap.accessUser,
  };
}

/** @deprecated use loadFreshPredictionUser */
export const loadFreshTodayPredictionUser = loadFreshPredictionUser;

export async function resolveTodayPredictionAccess(now = new Date()) {
  noStore();
  const fresh = await loadFreshPredictionUser();
  const access = checkTodayPredictionAccess({ user: fresh.accessUser, now });
  return { ...fresh, access };
}

export async function resolveTomorrowPredictionAccess(now = new Date()) {
  noStore();
  const fresh = await loadFreshPredictionUser();
  const access = checkTomorrowPredictionAccess({ user: fresh.accessUser, now });
  return { ...fresh, access };
}

export async function resolveWeeklyPredictionAccess(now = new Date()) {
  noStore();
  const fresh = await loadFreshPredictionUser();
  const access = checkWeeklyPredictionAccess({ user: fresh.accessUser, now });
  return { ...fresh, access };
}

function sanitizeForecastForClient(f: DailyForecast): DailyForecast {
  const directionLabel = normalizeFormalDirection(f.directionLabel ?? f.direction);
  return {
    ...f,
    directionLabel,
  };
}

export async function loadTodayForecastRows(now: Date): Promise<DailyForecast[]> {
  const today = getBeijingTodayKey(now);
  const { getStoreForecastsForToday } = await import("@/lib/data/store-to-ui-forecasts");
  const fromStore = await getStoreForecastsForToday(now);
  const fromLegacy = getPublicTodayForecasts(now);
  const byAsset = new Map<string, DailyForecast>();
  for (const f of fromStore) {
    if (f.forecastForDate === today) byAsset.set(f.assetId, f);
  }
  for (const f of fromLegacy) {
    if (f.forecastForDate === today) byAsset.set(f.assetId, f);
  }

  // Autonomous fallback: derive today's formal rows from the locked weekly source
  // whenever the database batch is missing. This prevents a blank homepage.
  try {
    const { listGeneratedDailiesForDate } = await import("@/lib/weekly-source/store");
    const { generateCoreMarketsFromWeeklyPure } = await import("@/lib/forecasts/daily-pipeline");
    const { generatedDailyToUi } = await import("@/lib/forecasts/generated-to-ui");
    const persisted = await listGeneratedDailiesForDate(today);
    const generated = persisted.length ? persisted : generateCoreMarketsFromWeeklyPure(today, "LOCKED");
    for (const g of generated) {
      const ui = generatedDailyToUi(g, "public");
      if (ui.forecastForDate === today && !byAsset.has(ui.assetId)) byAsset.set(ui.assetId, ui);
    }
  } catch (err) {
    console.warn("[today] autonomous weekly fallback skipped", err);
  }

  // Lightweight fallback: independent of Prisma, Supabase, technical market data,
  // and the automation pipeline. A persistence/provider failure must not leave
  // the homepage blank when a valid weekly forecast exists.
  try {
    const { buildWeeklyDerivedFallbacks } = await import(
      "@/lib/forecasts/public-daily-fallback"
    );
    for (const ui of buildWeeklyDerivedFallbacks(today, "public")) {
      if (ui.forecastForDate === today && !byAsset.has(ui.assetId)) {
        byAsset.set(ui.assetId, ui);
      }
    }
  } catch (err) {
    console.warn("[today] lightweight weekly fallback skipped", err);
  }

  return sortByDailyAssetOrder(
    [...byAsset.values()]
      .filter(isHumanPublishedForecast)
      .filter((f) => f.forecastForDate === today)
      .map((f) => applyTodayFacingCopy(sanitizeForecastForClient(f), now))
  );
}

/** Next formal batch after Beijing today — used by member + public teaser metadata. */
function sameMarketCode(left: string, right: string): boolean {
  const normalize = (value: string) => {
    if (value === "SSEC" || value === "000001.SS") return "SHCOMP";
    if (value === "Gold") return "GLD";
    if (value === "CL" || value === "CL=F") return "WTI";
    return value;
  };
  return normalize(left) === normalize(right);
}


/** Next formal batch after Beijing today — each market keeps its own next session date. */
export async function loadTomorrowForecastRows(now: Date): Promise<DailyForecast[]> {
  const today = getBeijingTodayKey(now);
  const { getNextForecastDate } = await import("@/lib/calendar/next-trading-day");
  const { marketMeta } = await import("@/lib/forecasts/weekly-to-daily");
  const { getStoreForecastsForTomorrow } = await import("@/lib/data/store-to-ui-forecasts");
  const storeTomorrow = await getStoreForecastsForTomorrow(now);
  const legacy = getMemberTomorrowForecasts(now);
  const byAsset = new Map<string, DailyForecast>();

  const acceptIfCorrectSession = (forecast: DailyForecast) => {
    const expectedDate = getNextForecastDate(forecast.market, today);
    if (
      forecast.forecastForDate === expectedDate &&
      isHumanPublishedForecast(forecast)
    ) {
      byAsset.set(forecast.assetId, forecast);
    }
  };

  for (const forecast of storeTomorrow) acceptIfCorrectSession(forecast);
  for (const forecast of legacy) acceptIfCorrectSession(forecast);

  // Merge DB and deterministic weekly-derived rows one market at a time.
  // This prevents a weekend crypto date from being incorrectly reused by
  // equity, commodity, or Hong Kong forecasts.
  try {
    const { listGeneratedDailiesForDate } = await import("@/lib/weekly-source/store");
    const { generateCoreMarketsFromWeeklyPure, CORE_DAILY_MARKETS } = await import(
      "@/lib/forecasts/daily-pipeline"
    );
    const { generatedDailyToUi } = await import("@/lib/forecasts/generated-to-ui");

    for (const marketCode of CORE_DAILY_MARKETS) {
      const targetDate = getNextForecastDate(marketMeta(marketCode).legacyMarket, today);
      const persisted = await listGeneratedDailiesForDate(targetDate);
      const persistedHit = persisted.find((row) => sameMarketCode(row.marketCode, marketCode));
      if (persistedHit) {
        const ui = generatedDailyToUi(persistedHit, "member");
        acceptIfCorrectSession(ui);
      }

      const assetIdByMarket: Record<string, string> = {
        BTC: "bitcoin",
        ETH: "eth",
        SPX: "sp500",
        NDX: "nasdaq-100",
        SHCOMP: "shanghai-composite",
        HSTECH: "hang-seng",
        GLD: "gold",
        SILVER: "silver",
        WTI: "wti-crude",
      };
      if (!byAsset.has(assetIdByMarket[marketCode] ?? marketCode.toLowerCase())) {
        const generatedHit = generateCoreMarketsFromWeeklyPure(targetDate, "LOCKED").find(
          (row) => sameMarketCode(row.marketCode, marketCode)
        );
        if (generatedHit) {
          const ui = generatedDailyToUi(generatedHit, "member");
          acceptIfCorrectSession(ui);
        }
      }
    }
  } catch (err) {
    console.warn("[tomorrow] weekly-to-daily merge skipped", err);
  }

  // Independent fallback, also generated one market at a time.
  try {
    const {
      buildWeeklyDerivedFallbackForMarket,
      PUBLIC_FALLBACK_MARKETS,
    } = await import("@/lib/forecasts/public-daily-fallback");

    for (const marketCode of PUBLIC_FALLBACK_MARKETS) {
      const targetDate = getNextForecastDate(marketMeta(marketCode).legacyMarket, today);
      const ui = buildWeeklyDerivedFallbackForMarket(marketCode, targetDate, "member");
      if (ui && !byAsset.has(ui.assetId)) {
        acceptIfCorrectSession(ui);
      }
    }
  } catch (err) {
    console.warn("[tomorrow] lightweight weekly fallback skipped", err);
  }

  const rows = [...byAsset.values()].filter((forecast) => {
    const expectedDate = getNextForecastDate(forecast.market, today);
    return isHumanPublishedForecast(forecast) && forecast.forecastForDate === expectedDate;
  });

  return sortByDailyAssetOrder(rows.map(sanitizeForecastForClient));
}

export type TodayPublicTeaser = {
  published: boolean;
  marketCount: number;
  forecastDate: string | null;
  publishedAt: string | null;
  locked: true;
};

export type TodayForecastAccessPayload =
  | {
      allowed: true;
      access: Extract<TodayPredictionAccess, { allowed: true }>;
      forecasts: DailyForecast[];
      verifying: boolean;
      teaser: null;
    }
  | {
      allowed: false;
      access: Extract<TodayPredictionAccess, { allowed: false }>;
      /** Always empty — never leak body to unauthorized clients. */
      forecasts: [];
      verifying: false;
      message: string;
      releaseTime?: "08:00";
      timezone?: "Asia/Shanghai";
      teaser: TodayPublicTeaser;
    };

export type TomorrowForecastAccessPayload =
  | {
      allowed: true;
      access: Extract<MemberPredictionAccess, { allowed: true }>;
      forecasts: DailyForecast[];
    }
  | {
      allowed: false;
      access: Extract<MemberPredictionAccess, { allowed: false }>;
      forecasts: [];
      message: string;
    };

export async function getTodayForecastAccessPayload(
  now = new Date()
): Promise<TodayForecastAccessPayload> {
  noStore();
  const { access } = await resolveTodayPredictionAccess(now);
  const rows = await loadTodayForecastRows(now);
  const teaser = toTodayPublicTeaserMeta(rows);

  if (!access.allowed) {
    if (access.reason === "LOGIN_REQUIRED") {
      return {
        allowed: false,
        access,
        forecasts: [],
        verifying: false,
        message: TODAY_PREDICTION_MESSAGES.LOGIN_REQUIRED,
        teaser,
      };
    }
    return {
      allowed: false,
      access,
      forecasts: [],
      verifying: false,
      message: TODAY_PREDICTION_MESSAGES.WAIT_UNTIL_08,
      releaseTime: "08:00",
      timezone: "Asia/Shanghai",
      teaser,
    };
  }

  return {
    allowed: true,
    access,
    forecasts: rows,
    verifying: rows.some((f) => f.status === "published"),
    teaser: null,
  };
}

export async function getTomorrowForecastAccessPayload(
  now = new Date()
): Promise<TomorrowForecastAccessPayload> {
  noStore();
  const { access } = await resolveTomorrowPredictionAccess(now);

  if (!access.allowed) {
    return {
      allowed: false,
      access,
      forecasts: [],
      message:
        access.reason === "LOGIN_REQUIRED"
          ? TOMORROW_PREDICTION_MESSAGES.LOGIN_REQUIRED
          : TOMORROW_PREDICTION_MESSAGES.MEMBERSHIP_REQUIRED,
    };
  }

  const rows = await loadTomorrowForecastRows(now);
  return {
    allowed: true,
    access,
    forecasts: rows,
  };
}

export async function getWeeklyForecastAccessDecision(now = new Date()) {
  noStore();
  const { access } = await resolveWeeklyPredictionAccess(now);
  if (!access.allowed) {
    return {
      allowed: false as const,
      access,
      message:
        access.reason === "LOGIN_REQUIRED"
          ? WEEKLY_PREDICTION_MESSAGES.LOGIN_REQUIRED
          : WEEKLY_PREDICTION_MESSAGES.MEMBERSHIP_REQUIRED,
    };
  }
  return { allowed: true as const, access };
}
