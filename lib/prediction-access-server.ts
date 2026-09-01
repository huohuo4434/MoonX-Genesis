import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { cookies, headers } from "next/headers";
import { evaluateMemberDeviceAccess, MEMBER_DEVICE_COOKIE } from "@/lib/auth/device-security";
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
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import type { DailyForecast } from "@/types/daily-forecast";
import { canonicalAssetCode } from "@/lib/presentation/asset-catalog";
import {
  mergeCanonicalForecastCandidates,
  normalizeForecastContract,
  type ForecastCandidate,
} from "@/lib/forecasts/forecast-contract";
import { isActivePredictionSymbol } from "@/lib/prediction-scope";

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

async function checkPaidDevice(userId: string | null, isAdmin: boolean) {
  if (!userId) return null;
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return evaluateMemberDeviceAccess({
    userId,
    deviceToken: cookieStore.get(MEMBER_DEVICE_COOKIE)?.value,
    userAgent: headerStore.get("user-agent"),
    ip:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip"),
    region: headerStore.get("x-vercel-ip-country"),
    isAdmin,
  });
}

export async function resolveTodayPredictionAccess(now = new Date()) {
  noStore();
  const snap = await getAccessUser(now);
  const fresh = { userId: snap.userId, email: snap.email, accessUser: snap.accessUser };
  let accessUser = fresh.accessUser;
  let device = null;
  if (snap.userId && snap.isActiveMember && !snap.isAdmin) {
    device = await checkPaidDevice(snap.userId, false);
    if (!device?.allowed && accessUser) {
      // A member without the active device lease receives exactly the free registered-user view.
      accessUser = { ...accessUser, membershipStatus: "inactive", membershipExpiresAt: null };
    }
  }
  const access = checkTodayPredictionAccess({ user: accessUser, now });
  return { ...fresh, access, device };
}

export async function resolveTomorrowPredictionAccess(now = new Date()) {
  noStore();
  const snap = await getAccessUser(now);
  const fresh = { userId: snap.userId, email: snap.email, accessUser: snap.accessUser };
  const access = checkTomorrowPredictionAccess({ user: fresh.accessUser, now });
  if (access.allowed && access.reason === "ACTIVE_MEMBER" && snap.userId) {
    const device = await checkPaidDevice(snap.userId, false);
    if (!device?.allowed) {
      return { ...fresh, access: { allowed: false as const, reason: "DEVICE_REQUIRED" as const }, device };
    }
    return { ...fresh, access, device };
  }
  return { ...fresh, access, device: null };
}

export async function resolveWeeklyPredictionAccess(now = new Date()) {
  noStore();
  const snap = await getAccessUser(now);
  const fresh = { userId: snap.userId, email: snap.email, accessUser: snap.accessUser };
  const access = checkWeeklyPredictionAccess({ user: fresh.accessUser, now });
  if (access.allowed && access.reason === "ACTIVE_MEMBER" && snap.userId) {
    const device = await checkPaidDevice(snap.userId, false);
    if (!device?.allowed) {
      return { ...fresh, access: { allowed: false as const, reason: "DEVICE_REQUIRED" as const }, device };
    }
    return { ...fresh, access, device };
  }
  return { ...fresh, access, device: null };
}

function sanitizeForecastForClient(f: DailyForecast): DailyForecast {
  return normalizeForecastContract(f);
}

async function applyQimenToAccessRows(rows: DailyForecast[]): Promise<DailyForecast[]> { // MOOX_QIMEN_DAILY_RESONANCE_V7201_ACCESS
  if (!rows.length) return rows;
  try {
    const [{ applyQimenFirstToGeneratedDaily }, { generateCoreMarketsFromWeeklyPure }] = await Promise.all([
      import("@/lib/forecasts/qimen-first-policy"),
      import("@/lib/forecasts/daily-pipeline"),
    ]);
    const pureByDate = new Map<string, ReturnType<typeof generateCoreMarketsFromWeeklyPure>>();
    const pureDailyFor = (forecast: DailyForecast) => {
      let rowsForDate = pureByDate.get(forecast.forecastForDate);
      if (!rowsForDate) {
        rowsForDate = generateCoreMarketsFromWeeklyPure(forecast.forecastForDate, "LOCKED");
        pureByDate.set(forecast.forecastForDate, rowsForDate);
      }
      const canonical = canonicalAssetCode(forecast.symbol);
      return rowsForDate.find((row) => canonicalAssetCode(row.marketCode) === canonical) ?? null;
    };
    return rows.map((forecast) => {
      const pure = pureDailyFor(forecast);
      const liuyaoEvidence = forecast.liuyaoEvidence || pure?.liuyaoEvidence || undefined;
      const evidenceDay = liuyaoEvidence?.match(/日判[：:=]?\s*([^；。]+)/u)?.[1]?.trim();
      // Pure generation is pre-Qimen. Its direction is the daily Liuyao view derived
      // from the locked weekly source + target-day Ganzhi/moving-line timing.
      const liuyaoDirection = evidenceDay || pure?.direction || null;
      const enriched = liuyaoEvidence && !forecast.liuyaoEvidence ? { ...forecast, liuyaoEvidence } : forecast;
      return applyQimenFirstToGeneratedDaily(enriched, {
        liuyaoDirection,
        previousQimenEvidence: forecast.qimenEvidence ?? null,
      });
    });
  } catch (error) {
    console.warn("[prediction-access] Qimen-first access overlay skipped", error);
    return rows;
  }
}

async function applyExternalAdvisoriesToAccessRows(rows: DailyForecast[]): Promise<DailyForecast[]> {
  if (!rows.length) return rows;
  try {
    const { applyExternalViewAdvisories } = await import("@/lib/forecasts/external-view-advisory.server");
    return await applyExternalViewAdvisories(rows);
  } catch (error) {
    console.warn("[prediction-access] dated external advisory skipped", error);
    return rows;
  }
}

export async function loadTodayForecastRows(now: Date): Promise<DailyForecast[]> {
  const today = getBeijingTodayKey(now);
  const { getStoreForecastsForToday } = await import("@/lib/data/store-to-ui-forecasts");
  const candidates: ForecastCandidate[] = [];
  const accept = (forecast: DailyForecast, source: ForecastCandidate["source"]) => {
    if (!isActivePredictionSymbol(forecast.symbol)) return;
    if (forecast.forecastForDate !== today || !isHumanPublishedForecast(forecast)) return;
    candidates.push({ forecast, source });
  };

  for (const forecast of await getStoreForecastsForToday(now)) accept(forecast, "STORE");
  for (const forecast of getPublicTodayForecasts(now)) accept(forecast, "CURATED");

  // Autonomous fallback: derive today's formal rows from the locked weekly source
  // whenever the database batch is missing. The final merge still keeps only one
  // answer per asset + target session and gives the formal store highest priority.
  try {
    const { listGeneratedDailiesForDate } = await import("@/lib/weekly-source/store");
    const { generateCoreMarketsFromWeeklyPure } = await import("@/lib/forecasts/daily-pipeline");
    const { generatedDailyToUi } = await import("@/lib/forecasts/generated-to-ui");
    const persisted = await listGeneratedDailiesForDate(today);
    for (const row of persisted) {
      accept(generatedDailyToUi(row, "public"), "GENERATED");
    }
    // Persisted rows may be only a partial batch (for example BTC/ETH only).
    // Always generate the canonical nine-market fallback, then let the merger
    // keep the authoritative stored version and fill every missing market.
    for (const row of generateCoreMarketsFromWeeklyPure(today, "LOCKED")) {
      accept(generatedDailyToUi(row, "public"), "GENERATED");
    }
  } catch (err) {
    console.warn("[today] autonomous weekly fallback skipped", err);
  }

  try {
    const { buildWeeklyDerivedFallbacks } = await import("@/lib/forecasts/public-daily-fallback");
    for (const forecast of buildWeeklyDerivedFallbacks(today, "public")) {
      accept(forecast, "FALLBACK");
    }
  } catch (err) {
    console.warn("[today] lightweight weekly fallback skipped", err);
  }

  const rows = mergeCanonicalForecastCandidates(candidates)
    .filter((forecast) => forecast.forecastForDate === today)
    .map((forecast) => applyTodayFacingCopy(sanitizeForecastForClient(forecast), now));
  const qimenRows = await applyQimenToAccessRows(rows);
  return sortByDailyAssetOrder(await applyExternalAdvisoriesToAccessRows(qimenRows));
}

/** Next formal batch after Beijing today — used by member + public teaser metadata. */
function sameMarketCode(left: string, right: string): boolean {
  return canonicalAssetCode(left) === canonicalAssetCode(right);
}

/** Next formal batch after Beijing today — each market keeps its own next session date. */
export async function loadTomorrowForecastRows(now: Date): Promise<DailyForecast[]> {
  const today = getBeijingTodayKey(now);
  const { getNextForecastDate } = await import("@/lib/calendar/next-trading-day");
  const { marketMeta } = await import("@/lib/forecasts/weekly-to-daily");
  const { getStoreForecastsForTomorrow } = await import("@/lib/data/store-to-ui-forecasts");
  const candidates: ForecastCandidate[] = [];
  const acceptedAssetSessions = new Set<string>();

  const acceptIfCorrectSession = (
    forecast: DailyForecast,
    source: ForecastCandidate["source"]
  ) => {
    if (!isActivePredictionSymbol(forecast.symbol)) return;
    const normalized = normalizeForecastContract(forecast);
    const expectedDate = getNextForecastDate(normalized.market, today);
    if (normalized.forecastForDate !== expectedDate || !isHumanPublishedForecast(normalized)) return;
    candidates.push({ forecast: normalized, source });
    acceptedAssetSessions.add(`${canonicalAssetCode(normalized.symbol)}:${normalized.forecastForDate}`);
  };

  for (const forecast of await getStoreForecastsForTomorrow(now)) {
    acceptIfCorrectSession(forecast, "STORE");
  }
  for (const forecast of getMemberTomorrowForecasts(now)) {
    acceptIfCorrectSession(forecast, "CURATED");
  }

  try {
    const { listGeneratedDailiesForDate } = await import("@/lib/weekly-source/store");
    const { generateCoreMarketFromWeeklyPure, CORE_DAILY_MARKETS } = await import(
      "@/lib/forecasts/daily-pipeline"
    );
    const { generatedDailyToUi } = await import("@/lib/forecasts/generated-to-ui");

    for (const marketCode of CORE_DAILY_MARKETS) {
      try {
        const targetDate = getNextForecastDate(marketMeta(marketCode).legacyMarket, today);
        const persisted = await listGeneratedDailiesForDate(targetDate);
        const persistedHit = persisted.find((row) => sameMarketCode(row.marketCode, marketCode));
        if (persistedHit) {
          acceptIfCorrectSession(generatedDailyToUi(persistedHit, "member"), "GENERATED");
        }
        const identity = `${canonicalAssetCode(marketCode)}:${targetDate}`;
        if (!acceptedAssetSessions.has(identity)) {
          const generatedHit = generateCoreMarketFromWeeklyPure(
            marketCode,
            targetDate,
            "LOCKED"
          );
          if (generatedHit) {
            acceptIfCorrectSession(generatedDailyToUi(generatedHit, "member"), "GENERATED");
          }
        }
      } catch (error) {
        console.warn(`[tomorrow] single-market fallback skipped ${marketCode}`, error);
      }
    }
  } catch (err) {
    console.warn("[tomorrow] weekly-to-daily merge skipped", err);
  }

  try {
    const {
      buildWeeklyDerivedFallbackForMarket,
      PUBLIC_FALLBACK_MARKETS,
    } = await import("@/lib/forecasts/public-daily-fallback");
    for (const marketCode of PUBLIC_FALLBACK_MARKETS) {
      const targetDate = getNextForecastDate(marketMeta(marketCode).legacyMarket, today);
      const identity = `${canonicalAssetCode(marketCode)}:${targetDate}`;
      if (acceptedAssetSessions.has(identity)) continue;
      const forecast = buildWeeklyDerivedFallbackForMarket(marketCode, targetDate, "member");
      if (forecast) acceptIfCorrectSession(forecast, "FALLBACK");
    }
  } catch (err) {
    console.warn("[tomorrow] lightweight weekly fallback skipped", err);
  }

  const rows = mergeCanonicalForecastCandidates(candidates).filter((forecast) => {
    const expectedDate = getNextForecastDate(forecast.market, today);
    return isHumanPublishedForecast(forecast) && forecast.forecastForDate === expectedDate;
  });
  const sanitizedRows = rows.map(sanitizeForecastForClient);
  const qimenRows = await applyQimenToAccessRows(sanitizedRows);
  return sortByDailyAssetOrder(await applyExternalAdvisoriesToAccessRows(qimenRows));
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
  // Resolve visibility before any database, external-view or technical work.
  // Anonymous and pre-release callers must never wait for content they cannot see.
  let accessTimer: ReturnType<typeof setTimeout> | undefined;
  const { access } = await Promise.race([
    resolveTodayPredictionAccess(now).catch((error) => {
      console.warn("[today] access resolution failed closed", error);
      return { access: checkTodayPredictionAccess({ user: null, now }) };
    }),
    new Promise<{ access: TodayPredictionAccess }>((resolve) => {
      accessTimer = setTimeout(
        () => resolve({ access: checkTodayPredictionAccess({ user: null, now }) }),
        1_500
      );
    }),
  ]).finally(() => {
    if (accessTimer) clearTimeout(accessTimer);
  });

  if (!access.allowed) {
    const teaser = toTodayPublicTeaserMeta(getPublicTodayForecasts(now));
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

  const rows = await loadTodayForecastRowsWithDeadline(now);

  return {
    allowed: true,
    access,
    forecasts: rows,
    verifying: rows.some((f) => f.status === "published"),
    teaser: null,
  };
}

async function loadTodayForecastRowsWithDeadline(now: Date): Promise<DailyForecast[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const rows = await Promise.race([
      loadTodayForecastRows(now),
      new Promise<DailyForecast[]>((resolve) => {
        timer = setTimeout(() => resolve([]), 1_800);
      }),
    ]);
    if (rows.length) return rows;
  } catch (error) {
    console.warn("[today] primary forecast read degraded", error);
  } finally {
    if (timer) clearTimeout(timer);
  }

  // This fallback is local and source-locked. It derives the current day from
  // the active weekly/stage record and does not invent a separate daily chart.
  try {
    const { buildWeeklyDerivedFallbacks } = await import("@/lib/forecasts/public-daily-fallback");
    const today = getBeijingTodayKey(now);
    return sortByDailyAssetOrder(
      buildWeeklyDerivedFallbacks(today, "public")
        .filter(isHumanPublishedForecast)
        .map((forecast) => applyTodayFacingCopy(sanitizeForecastForClient(forecast), now))
    );
  } catch (error) {
    console.error("[today] source-locked fallback unavailable", error);
    return [];
  }
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
          : access.reason === "DEVICE_REQUIRED"
            ? TOMORROW_PREDICTION_MESSAGES.DEVICE_REQUIRED
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
          : access.reason === "DEVICE_REQUIRED"
            ? WEEKLY_PREDICTION_MESSAGES.DEVICE_REQUIRED
            : WEEKLY_PREDICTION_MESSAGES.MEMBERSHIP_REQUIRED,
    };
  }
  return { allowed: true as const, access };
}
