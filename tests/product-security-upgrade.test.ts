import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DAILY_FORBIDDEN_WEEKLY_TERMS,
  normalizeDailyLanguage,
  signalStrengthFromConfidence,
} from "../lib/forecasts/daily-language.ts";
import { getTradingSessionDisplay } from "../lib/calendar/trading-session-display.ts";
import { generateCoreMarketsFromWeeklyPure } from "../lib/forecasts/daily-pipeline.ts";
import {
  canBindTrustedDevice,
  decideMemberLease,
  MAX_MEMBER_DEVICES,
  MEMBER_LEASE_SECONDS,
} from "../lib/auth/device-policy.ts";

const root = resolve(process.cwd());
const source = (relative: string) => readFileSync(resolve(root, relative), "utf8");

describe("customer-facing forecast consistency", () => {
  test("daily copy normalizes weekly wording into intraday wording", () => {
    const normalized = normalizeDailyLanguage("周初上涨，前半周反弹，后半周观察回落");
    for (const term of DAILY_FORBIDDEN_WEEKLY_TERMS) assert.ok(!normalized.includes(term));
    assert.match(normalized, /开盘后/);
    assert.match(normalized, /盘中前段/);
    assert.match(normalized, /盘中后段/);
  });

  test("gold and silver use their own international trading-day labels", () => {
    const silver = getTradingSessionDisplay({
      market: "commodity",
      symbol: "SILVER",
      forecastDate: "2026-08-03",
      publishedAt: "2026-08-02T08:00:00+08:00",
    });
    const gold = getTradingSessionDisplay({
      market: "commodity",
      symbol: "GLD",
      forecastDate: "2026-08-03",
      publishedAt: "2026-08-02T08:00:00+08:00",
    });
    assert.equal(silver.title, "下一国际银价交易日");
    assert.equal(gold.title, "下一国际金价交易日");
  });

  test("Sunday core generation includes both BTC and ETH", () => {
    const symbols = generateCoreMarketsFromWeeklyPure("2026-08-02", "LOCKED").map(
      (row) => row.marketCode
    );
    assert.ok(symbols.includes("BTC"));
    assert.ok(symbols.includes("ETH"));
  });

  test("signal strength is separate from direction probability", () => {
    assert.equal(signalStrengthFromConfidence(40), "低");
    assert.equal(signalStrengthFromConfidence(55), "中");
    assert.equal(signalStrengthFromConfidence(70), "高");
  });
});

describe("paid-member device policy", () => {
  test("paid members bind at most two trusted devices while admins are exempt", () => {
    assert.equal(MAX_MEMBER_DEVICES, 2);
    assert.equal(canBindTrustedDevice({ activeDeviceCount: 1, isAdmin: false }), true);
    assert.equal(canBindTrustedDevice({ activeDeviceCount: 2, isAdmin: false }), false);
    assert.equal(canBindTrustedDevice({ activeDeviceCount: 20, isAdmin: true }), true);
  });

  test("one active lease is refreshed, expires, or can be explicitly switched", () => {
    assert.equal(MEMBER_LEASE_SECONDS, 120);
    const now = Date.parse("2026-08-03T00:00:00Z");
    assert.equal(
      decideMemberLease({ currentDeviceIdHash: "a", nowMs: now }),
      "ACQUIRE"
    );
    assert.equal(
      decideMemberLease({
        leaseDeviceIdHash: "a",
        leaseExpiresAtMs: now + 60_000,
        currentDeviceIdHash: "a",
        nowMs: now,
      }),
      "REFRESH"
    );
    assert.equal(
      decideMemberLease({
        leaseDeviceIdHash: "b",
        leaseExpiresAtMs: now + 60_000,
        currentDeviceIdHash: "a",
        nowMs: now,
      }),
      "BLOCK"
    );
    assert.equal(
      decideMemberLease({
        leaseDeviceIdHash: "b",
        leaseExpiresAtMs: now - 1,
        currentDeviceIdHash: "a",
        nowMs: now,
      }),
      "ACQUIRE"
    );
    assert.equal(
      decideMemberLease({
        leaseDeviceIdHash: "b",
        leaseExpiresAtMs: now + 60_000,
        currentDeviceIdHash: "a",
        nowMs: now,
        forceAcquire: true,
      }),
      "FORCE_SWITCH"
    );
  });
});

describe("conversion and privacy regression checks", () => {
  test("public support copy does not expose internal deployment instructions", () => {
    const publicCopy = [
      source("app/support/page.tsx"),
      source("app/terms/page.tsx"),
      source("app/pricing/page.tsx"),
      source("app/privacy/page.tsx"),
    ].join("\n");
    assert.doesNotMatch(publicCopy, /不需要在Vercel验证|CRON_SECRET|Prisma|Resend/i);
  });

  test("login/register mode clears password and uses correct autocomplete", () => {
    const form = source("components/auth/LoginForm.tsx");
    assert.match(form, /setPassword\(""\)/);
    assert.match(form, /autoComplete=\{tab === "login" \? "current-password" : "new-password"\}/);
  });


  test("login persistence uses server-issued HttpOnly cookies rather than access tokens in localStorage", () => {
    const route = source("app/api/auth/login/route.ts");
    const navbar = source("components/layout/NavbarSession.tsx");
    const sessionLite = source("lib/client/session-lite.ts");
    assert.match(route, /httpOnly:\s*true/);
    assert.match(route, /sameSite:\s*"lax"/);
    assert.doesNotMatch(route, /localStorage|access_token|refresh_token/);
    assert.match(navbar, /loadSessionLite/);
    assert.match(sessionLite, /credentials:\s*"include"/);
    assert.doesNotMatch(sessionLite, /access_token|refresh_token/i);
  });

  test("new untrusted devices require account-password confirmation", () => {
    const claim = source("app/api/account/devices/claim/route.ts");
    const verifier = source("lib/auth/verify-account-password.ts");
    const logoutOthers = source("app/api/account/devices/logout-others/route.ts");
    assert.match(claim, /PASSWORD_REQUIRED/);
    assert.match(claim, /verifyAccountPassword/);
    assert.match(verifier, /signInWithPassword/);
    assert.match(verifier, /persistSession:\s*false/);
    assert.match(logoutOthers, /PASSWORD_REQUIRED/);
    assert.match(logoutOthers, /verifyAccountPassword/);
  });

  test("paid APIs call the common device guard and a user-plus-device rate limiter", () => {
    const guarded = [
      "app/api/member/ai-trading-desk/route.ts",
      "app/api/member/conviction-list/[slug]/forecast/route.ts",
      "app/api/member/stocks/[symbol]/route.ts",
    ];
    for (const file of guarded) {
      const text = source(file);
      assert.match(text, /getMemberDevicePageAccess/);
      assert.match(text, /checkMemberApiRateLimit/);
    }
    assert.match(source("app/api/forecasts/tomorrow/route.ts"), /DEVICE_REQUIRED/);
    assert.match(source("app/api/forecasts/tomorrow/route.ts"), /checkMemberApiRateLimit/);
    assert.match(source("app/api/forecasts/weekly/route.ts"), /DEVICE_REQUIRED/);
    assert.match(source("app/api/forecasts/weekly/route.ts"), /checkMemberApiRateLimit/);
  });

  test("missing levels show an honest pending state", () => {
    assert.match(source("components/forecasts/PriceLevelsBlock.tsx"), /技术点位待补充/);
  });

  test("monthly and trading features render public previews before paid access", () => {
    const files = [
      "app/member/monthly/page.tsx",
      "app/member/ai-trading/page.tsx",
      "app/member/signals/page.tsx",
    ];
    for (const file of files) assert.match(source(file), /PublicFeaturePreview/);
  });

  test("device schema and additive migration are present", () => {
    const schema = source("prisma/schema.prisma");
    const migration = source("prisma/migrations/20260803010000_member_device_security/migration.sql");
    assert.match(schema, /model TrustedDevice/);
    assert.match(schema, /model MemberAccessLease/);
    assert.match(schema, /model SecurityEvent/);
    assert.match(migration, /CREATE TABLE IF NOT EXISTS "TrustedDevice"/);
    assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN/i);
  });
});
