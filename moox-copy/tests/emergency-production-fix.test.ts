/**
 * Production emergency fix coverage (Asia/Shanghai, no hardcoded “today”).
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  checkTodayPredictionAccess,
  checkTomorrowPredictionAccess,
} from "../lib/prediction-access.ts";
import {
  applyTodayFacingCopy,
  getNextPublishedForecastDateKey,
  getPublicTodayForecasts,
  getTomorrowCoreForecasts,
  rewriteTodayFacingCopy,
} from "../lib/data/daily-forecasts.ts";
import { normalizeFormalDirection } from "../lib/forecasts/formal-direction.ts";
import { filterPublicAccuracyHistory } from "../lib/accuracy/public-history-filter.ts";
import { quoteSanityFailure } from "../lib/market-data/quote-symbols.ts";
import {
  ensureReferralInvite,
  generateInviteCode,
  normalizeInviteCode,
  __resetReferralMemoryForTests,
} from "../lib/referral/store.ts";
import { siteBaseUrl } from "../lib/referral/site-url.ts";
import type { DailyForecastRecord, DailyVerificationResult } from "../types/daily-accuracy.ts";

function atBeijing(bjHour: number, bjMinute = 0, day = 29): Date {
  const utcHour = bjHour - 8;
  return new Date(Date.UTC(2026, 6, day, utcHour, bjMinute, 0));
}

function resetReferralStore() {
  process.env.MOONX_REFERRAL_LOCAL_ONLY = "1";
  __resetReferralMemoryForTests();
}

describe("emergency: today date / copy / access", () => {
  test("1) after Beijing day roll, yesterday cannot masquerade as today", () => {
    const now = atBeijing(0, 30, 30); // 2026-07-30 00:30 BJ
    const today = getPublicTodayForecasts(now);
    assert.ok(today.every((f) => f.forecastForDate === "2026-07-30"));
    assert.equal(
      today.some((f) => f.forecastForDate === "2026-07-28" || f.forecastForDate === "2026-07-29"),
      false
    );
  });

  test("2) today-facing copy has no 明日 / 下一交易日", () => {
    const now = atBeijing(10, 0, 29);
    const today = getPublicTodayForecasts(now);
    assert.ok(today.length >= 1);
    for (const f of today.map((row) => applyTodayFacingCopy(row, now))) {
      const blob = `${f.headline ?? ""}\n${f.summary}\n${(f.expectedPath ?? []).join("\n")}`;
      assert.equal(/明日|下一交易日/.test(blob), false, blob);
    }
    assert.equal(rewriteTodayFacingCopy("明日上涨", "2026-07-29", now), "今日上涨");
    assert.equal(rewriteTodayFacingCopy("明日上涨", "2026-07-30", now), "明日上涨");
  });

  test("3) unauthenticated cannot access today", () => {
    assert.deepEqual(checkTodayPredictionAccess({ user: null, now: atBeijing(12) }), {
      allowed: false,
      reason: "LOGIN_REQUIRED",
    });
  });

  test("4) registered user 07:59 cannot see today", () => {
    assert.deepEqual(
      checkTodayPredictionAccess({
        user: { role: "user", email: "u@t.com", membershipStatus: "inactive" },
        now: atBeijing(7, 59),
      }),
      { allowed: false, reason: "WAIT_UNTIL_08" }
    );
  });

  test("5) registered user 08:00 can see today", () => {
    assert.deepEqual(
      checkTodayPredictionAccess({
        user: { role: "user", email: "u@t.com", membershipStatus: "inactive" },
        now: atBeijing(8, 0),
      }),
      { allowed: true, reason: "REGISTERED_AFTER_RELEASE" }
    );
  });

  test("6) active member at 00:01 can see today", () => {
    const now = atBeijing(0, 1);
    assert.deepEqual(
      checkTodayPredictionAccess({
        user: {
          role: "user",
          email: "m@t.com",
          membershipStatus: "active",
          membershipExpiresAt: new Date(now.getTime() + 864e5).toISOString(),
        },
        now,
      }),
      { allowed: true, reason: "ACTIVE_MEMBER" }
    );
  });

  test("7) admin can see today anytime", () => {
    assert.deepEqual(
      checkTodayPredictionAccess({
        user: { role: "admin", email: "a@t.com", membershipStatus: "inactive" },
        now: atBeijing(1, 0),
      }),
      { allowed: true, reason: "ADMIN" }
    );
  });
});

describe("emergency: tomorrow next batch", () => {
  test("8) next formal batch is earliest date > Beijing today", () => {
    const jul28 = atBeijing(12, 0, 28);
    assert.equal(getNextPublishedForecastDateKey(jul28), "2026-07-29");
    const batch = getTomorrowCoreForecasts(jul28);
    assert.equal(batch.length, 7);
    assert.ok(batch.every((f) => f.forecastForDate === "2026-07-29"));
  });

  test("9) active member gate for tomorrow", () => {
    const now = atBeijing(12);
    assert.equal(
      checkTomorrowPredictionAccess({
        user: {
          role: "user",
          email: "m@t.com",
          membershipExpiresAt: new Date(now.getTime() + 864e5).toISOString(),
        },
        now,
      }).allowed,
      true
    );
  });

  test("10) no future batch → empty (not blank substitute)", () => {
    // After the last curated formal date (2026-07-31), tomorrow must stay empty.
    const now = atBeijing(12, 0, 31);
    assert.equal(getNextPublishedForecastDateKey(now), null);
    assert.equal(getTomorrowCoreForecasts(now).length, 0);
  });

  test("11) Wave is not tomorrow subject — formal directions only", () => {
    assert.equal(normalizeFormalDirection("震荡偏多"), "震荡上涨");
    assert.equal(normalizeFormalDirection("高波动回落"), "冲高回落");
    assert.equal(normalizeFormalDirection("观望"), "震荡");
    const jul28 = getTomorrowCoreForecasts(atBeijing(12, 0, 28));
    assert.ok(jul28.every((f) => !/Wave|波浪/.test(f.summary)));
  });
});

describe("emergency: referral", () => {
  test("12-13) member invite code unique and stable across ensure calls", async () => {
    resetReferralStore();
    const a = await ensureReferralInvite("member-stable-1");
    const b = await ensureReferralInvite("member-stable-1");
    assert.equal(a.invite_code, b.invite_code);
    assert.equal(a.invite_code.length, 8);
    assert.equal(/[O0I1]/.test(a.invite_code), false);
  });

  test("14) invite URL uses production domain (never localhost)", () => {
    const prev = {
      SITE: process.env.NEXT_PUBLIC_SITE_URL,
      APP: process.env.NEXT_PUBLIC_APP_URL,
      APP2: process.env.APP_URL,
    };
    process.env.NEXT_PUBLIC_SITE_URL = "";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.APP_URL = "";
    assert.equal(siteBaseUrl("http://localhost:3000").includes("localhost"), false);
    assert.ok(siteBaseUrl(null).startsWith("https://"));
    process.env.NEXT_PUBLIC_SITE_URL = prev.SITE;
    process.env.NEXT_PUBLIC_APP_URL = prev.APP;
    process.env.APP_URL = prev.APP2;
  });

  test("15) invite code alphabet excludes confusing chars", () => {
    for (let i = 0; i < 20; i += 1) {
      const code = generateInviteCode(`seed-${i}`);
      assert.equal(code.length, 8);
      assert.equal(/[O0I1]/.test(code), false);
      assert.equal(normalizeInviteCode(code), code);
    }
  });
});

describe("emergency: history + HSTECH", () => {
  test("16) history never includes today or pending", () => {
    const now = atBeijing(10, 0, 29);
    const forecasts: DailyForecastRecord[] = [
      {
        id: "today",
        forecastDate: "2026-07-29",
        assetName: "比特币",
        symbol: "BTC",
        market: "CRYPTO",
        direction: "UP",
        directionLabel: "上涨",
        publishedAt: "2026-07-28T15:00:00.000Z",
        cutoffAt: "2026-07-28T16:00:00.000Z",
        status: "published",
        originalVersion: 1,
        source: "MoonX",
        quoteSymbol: "BTC-USD",
        createdAt: "2026-07-28T15:00:00.000Z",
        updatedAt: "2026-07-28T15:00:00.000Z",
      },
    ];
    const results: DailyVerificationResult[] = [
      {
        forecastId: "today",
        forecastDate: "2026-07-29",
        assetName: "比特币",
        symbol: "BTC",
        previousClose: 100,
        actualClose: 101,
        actualReturnPct: 1,
        actualDirection: "UP",
        verdict: "PENDING",
        verdictLabel: "待验证",
        verifiedAt: "",
        dataSource: "test",
      } as DailyVerificationResult,
    ];
    const items = filterPublicAccuracyHistory({ forecasts, results, now });
    assert.equal(items.length, 0);
  });

  test("17) HSTECH abnormal close does not auto-verify", () => {
    assert.equal(
      quoteSanityFailure({
        symbol: "HSTECH",
        quoteSymbol: "3033.HK",
        close: 4.644,
        previousClose: 4700,
      }),
      "疑似标的或价格缩放错误"
    );
    assert.equal(
      quoteSanityFailure({
        symbol: "HSTECH",
        quoteSymbol: "HSTECH.HK",
        close: 6000,
        previousClose: 4000,
      }),
      "收盘价相对前日偏差异常，需人工复核"
    );
  });
});

describe("emergency: session refresh contract", () => {
  test("18-19) membership uses expiry timestamp (not stale plan label)", () => {
    const early = atBeijing(7, 0);
    const late = atBeijing(9, 0);
    const expiredAt = new Date(early.getTime() - 1000).toISOString();

    assert.deepEqual(
      checkTodayPredictionAccess({
        user: {
          role: "user",
          email: "x@t.com",
          membershipStatus: "active",
          membershipExpiresAt: expiredAt,
        },
        now: early,
      }),
      { allowed: false, reason: "WAIT_UNTIL_08" }
    );

    assert.deepEqual(
      checkTodayPredictionAccess({
        user: {
          role: "user",
          email: "x@t.com",
          membershipStatus: "active",
          membershipExpiresAt: expiredAt,
        },
        now: late,
      }),
      { allowed: true, reason: "REGISTERED_AFTER_RELEASE" }
    );
  });

  test("cleanup referral memory", () => {
    __resetReferralMemoryForTests();
  });
});
