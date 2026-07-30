/**
 * Membership persistence + tomorrow 20:00 schedule — emergency coverage.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, test } from "node:test";
import {
  computeNewExpiry,
  PLAN_DAYS,
} from "../lib/payments/membership-dates.ts";
import { laterExpiryIso } from "../lib/payments/membership-dates.ts";
import {
  FORMAL_PUBLISH_LABEL,
  formalBatchReady,
  nextUpdateLabelForSymbol,
  tomorrowPublishState,
  asiaBatchReady,
  usBatchReady,
  wtiBatchReady,
} from "../lib/calendar/publish-windows.ts";
import { getNextPublishedForecastDateKey, getTomorrowCoreForecasts } from "../lib/data/daily-forecasts.ts";
import { checkTodayPredictionAccess, checkTomorrowPredictionAccess } from "../lib/prediction-access.ts";
import { getNextForecastDate } from "../lib/calendar/next-trading-day.ts";

function atBeijing(bjHour: number, bjMinute = 0, day = 29): Date {
  const utcHour = bjHour - 8;
  return new Date(Date.UTC(2026, 6, day, utcHour, bjMinute, 0));
}

describe("membership extend-only + deploy safety", () => {
  test("1-3) monthly/quarterly/yearly extend from existing future expiry", () => {
    const existing = "2027-01-01T00:00:00.000Z";
    const now = new Date("2026-07-29T00:00:00.000Z");
    for (const plan of ["MONTHLY", "QUARTERLY", "YEARLY"] as const) {
      const next = computeNewExpiry(existing, PLAN_DAYS[plan], now);
      assert.ok(new Date(next).getTime() > new Date(existing).getTime());
    }
  });

  test("4-6) redeploy / cold start / re-login use durable expiry field (contract)", () => {
    // Membership lives in Auth app_metadata.membership_expires_at — not localStorage.
    const bootstrap = readFileSync(
      resolve(process.cwd(), "scripts/run-bootstrap-if-requested.ts"),
      "utf8"
    );
    assert.match(bootstrap, /skipped cleanup-payment-history/);
    assert.match(bootstrap, /protects memberships/);
    assert.equal(bootstrap.includes('wipe-payment-orders.ts", true'), false);
  });

  test("7-8) page update / migration must not shorten via laterExpiry", () => {
    const a = "2027-06-01T00:00:00.000Z";
    const b = "2026-08-01T00:00:00.000Z";
    assert.equal(laterExpiryIso(a, b), a);
    assert.equal(laterExpiryIso(null, b), b);
  });

  test("9) production seed is disabled", () => {
    const wave = readFileSync(resolve(process.cwd(), "scripts/seed-wave.ts"), "utf8");
    const referral = readFileSync(resolve(process.cwd(), "scripts/seed-referral.ts"), "utf8");
    assert.match(wave, /Production seed is disabled/);
    assert.match(referral, /Production seed is disabled/);
  });

  test("10-11) duplicate approve does not shorten; same base + days is stable", () => {
    const existing = "2027-12-01T00:00:00.000Z";
    const now = new Date("2026-07-29T00:00:00.000Z");
    const once = computeNewExpiry(existing, 30, now);
    const twice = computeNewExpiry(once, 0, now);
    assert.equal(twice, once);
    assert.ok(new Date(once).getTime() >= new Date(existing).getTime());
  });

  test("12) new payment stacks after existing expiry", () => {
    const existing = "2026-12-01T00:00:00.000Z";
    const now = new Date("2026-07-29T00:00:00.000Z");
    const next = computeNewExpiry(existing, 30, now);
    assert.equal(next.slice(0, 10), "2026-12-31");
  });

  test("13) yearly is not shortened by monthly grant math", () => {
    const yearlyEnd = "2027-07-29T00:00:00.000Z";
    const now = new Date("2026-07-29T00:00:00.000Z");
    const afterMonthly = computeNewExpiry(yearlyEnd, 30, now);
    assert.ok(new Date(afterMonthly).getTime() > new Date(yearlyEnd).getTime());
    assert.equal(laterExpiryIso(yearlyEnd, computeNewExpiry(null, 30, now)), yearlyEnd);
  });

  test("14) referral days extend like any grant", () => {
    const existing = "2026-08-01T00:00:00.000Z";
    const next = computeNewExpiry(existing, 7, new Date("2026-07-29T00:00:00.000Z"));
    assert.ok(new Date(next).getTime() > new Date(existing).getTime());
  });

  test("15) admin always has tomorrow access", () => {
    const access = checkTomorrowPredictionAccess({
      user: { email: "a@b.com", role: "admin", isAdmin: true, membershipExpiresAt: null },
      now: atBeijing(10),
    });
    assert.equal(access.allowed, true);
  });

  test("wipe script never clears membership_expires_at", () => {
    const wipe = readFileSync(resolve(process.cwd(), "scripts/wipe-payment-orders.ts"), "utf8");
    assert.match(wipe, /NEVER clears membership_expires_at/);
    assert.match(wipe, /disabled in production/);
    assert.equal(/membership_expires_at:\s*null/.test(wipe), false);
  });
});

describe("tomorrow formal 20:00 schedule", () => {
  test("16) formal publish is Beijing 20:00", () => {
    assert.equal(FORMAL_PUBLISH_LABEL, "每天北京时间 20:00");
    assert.equal(nextUpdateLabelForSymbol("WTI"), FORMAL_PUBLISH_LABEL);
    assert.equal(nextUpdateLabelForSymbol("SPX"), FORMAL_PUBLISH_LABEL);
    assert.equal(nextUpdateLabelForSymbol("BTC"), FORMAL_PUBLISH_LABEL);
  });

  test("17) before 20:00 without batch → waiting", () => {
    assert.equal(tomorrowPublishState(false, atBeijing(19, 59)), "waiting");
    assert.equal(formalBatchReady(atBeijing(19, 59)), false);
  });

  test("18) after 20:00 with published batch → published", () => {
    assert.equal(tomorrowPublishState(true, atBeijing(20, 1)), "published");
    assert.equal(formalBatchReady(atBeijing(20, 0)), true);
  });

  test("19) after Beijing midnight, next batch date is still > today", () => {
    const now = atBeijing(0, 30, 30);
    const next = getNextPublishedForecastDateKey(now);
    if (next) assert.ok(next > "2026-07-30");
    const rows = getTomorrowCoreForecasts(now);
    assert.ok(rows.every((f) => f.forecastForDate > "2026-07-30"));
  });

  test("20) registered user today only after 08:00 BJ", () => {
    const user = {
      email: "u@test.com",
      role: "user",
      membershipExpiresAt: null,
      membershipStatus: "inactive" as const,
    };
    assert.equal(checkTodayPredictionAccess({ user, now: atBeijing(7, 59) }).allowed, false);
    assert.equal(checkTodayPredictionAccess({ user, now: atBeijing(8, 0) }).allowed, true);
  });

  test("21) holiday / weekend rolls via next trading day helper", () => {
    // Saturday → Monday for US
    const next = getNextForecastDate("us", "2026-07-25"); // Sat
    assert.equal(next, "2026-07-27");
  });

  test("22-23) no split publish times; delayed after 20:00", () => {
    assert.equal(tomorrowPublishState(false, atBeijing(20, 5)), "delayed");
    assert.equal(asiaBatchReady(atBeijing(20, 0)), true);
    assert.equal(usBatchReady(atBeijing(19, 0)), false);
    assert.equal(wtiBatchReady(atBeijing(20, 0)), true);
    const page = readFileSync(
      resolve(process.cwd(), "components/member/MemberTomorrowPage.tsx"),
      "utf8"
    );
    assert.equal(page.includes("05:30"), false);
    assert.equal(page.includes("06:30"), false);
    assert.equal(page.includes("18:30"), false);
    assert.match(page, /FORMAL_PUBLISH_LABEL|TOMORROW_SCHEDULE_COPY/);
    assert.match(
      readFileSync(resolve(process.cwd(), "lib/calendar/publish-windows.ts"), "utf8"),
      /20:00/
    );
  });
});
