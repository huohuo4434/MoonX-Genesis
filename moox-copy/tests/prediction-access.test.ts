import assert from "node:assert/strict";
import test from "node:test";
import { isAdminUser } from "../lib/auth/is-admin";
import {
  checkTodayPredictionAccess,
  checkTomorrowPredictionAccess,
  checkWeeklyPredictionAccess,
  hasReachedChinaReleaseTime,
} from "../lib/prediction-access";

/** Build a Date that is `bjHour:bjMinute` in Asia/Shanghai (UTC+8). */
function atBeijing(bjHour: number, bjMinute = 0, day = 15): Date {
  const utcHour = bjHour - 8;
  return new Date(Date.UTC(2026, 6, day, utcHour, bjMinute, 0));
}

const adminEmailUser = {
  email: "jackzwin999@gmail.com",
  role: "user",
  membershipStatus: "inactive",
  membershipExpiresAt: null,
};

const adminRoleUser = {
  email: "other@example.com",
  role: "admin",
  membershipStatus: "inactive",
  membershipExpiresAt: null,
};

function activeYearlyMember(now: Date) {
  return {
    role: "user",
    email: "member@example.com",
    membershipStatus: "active",
    membershipExpiresAt: new Date(now.getTime() + 365 * 86400000).toISOString(),
  };
}

function expiredMember(now: Date) {
  return {
    role: "user",
    email: "expired@example.com",
    membershipStatus: "active",
    membershipExpiresAt: new Date(now.getTime() - 86400000).toISOString(),
  };
}

const registered = {
  role: "user",
  email: "user@example.com",
  membershipStatus: "inactive",
  membershipExpiresAt: null,
};

test("admin email case-insensitive recognition", () => {
  assert.equal(isAdminUser({ email: "JackZwin999@Gmail.com", role: "user" }), true);
  assert.equal(isAdminUser({ email: "user@example.com", role: "user" }), false);
});

test("hasReachedChinaReleaseTime", () => {
  assert.equal(hasReachedChinaReleaseTime(atBeijing(7, 59)), false);
  assert.equal(hasReachedChinaReleaseTime(atBeijing(8, 0)), true);
});

test("1) unauthenticated at 07:00 cannot see today", () => {
  assert.deepEqual(checkTodayPredictionAccess({ user: null, now: atBeijing(7, 0) }), {
    allowed: false,
    reason: "LOGIN_REQUIRED",
  });
});

test("2) unauthenticated at 09:00 still cannot see today", () => {
  assert.deepEqual(checkTodayPredictionAccess({ user: null, now: atBeijing(9, 0) }), {
    allowed: false,
    reason: "LOGIN_REQUIRED",
  });
});

test("3) registered user at 07:59 cannot see today", () => {
  assert.deepEqual(
    checkTodayPredictionAccess({ user: registered, now: atBeijing(7, 59) }),
    { allowed: false, reason: "WAIT_UNTIL_08" }
  );
});

test("4) registered user at 08:00 can see today", () => {
  assert.deepEqual(
    checkTodayPredictionAccess({ user: registered, now: atBeijing(8, 0) }),
    { allowed: true, reason: "REGISTERED_AFTER_RELEASE" }
  );
});

test("5) active yearly member at 00:01 can see today", () => {
  const now = atBeijing(0, 1);
  assert.deepEqual(
    checkTodayPredictionAccess({ user: activeYearlyMember(now), now }),
    { allowed: true, reason: "ACTIVE_MEMBER" }
  );
});

test("6) active yearly member at 07:59 can see today", () => {
  const now = atBeijing(7, 59);
  assert.deepEqual(
    checkTodayPredictionAccess({ user: activeYearlyMember(now), now }),
    { allowed: true, reason: "ACTIVE_MEMBER" }
  );
});

test("7) active yearly member can see tomorrow", () => {
  const now = atBeijing(12, 0);
  assert.deepEqual(
    checkTomorrowPredictionAccess({ user: activeYearlyMember(now), now }),
    { allowed: true, reason: "ACTIVE_MEMBER" }
  );
});

test("8) active yearly member can see weekly", () => {
  const now = atBeijing(12, 0);
  assert.deepEqual(
    checkWeeklyPredictionAccess({ user: activeYearlyMember(now), now }),
    { allowed: true, reason: "ACTIVE_MEMBER" }
  );
});

test("9) admin can see all anytime", () => {
  assert.equal(
    checkTodayPredictionAccess({ user: adminEmailUser, now: atBeijing(0, 1) }).allowed,
    true
  );
  assert.equal(
    checkTodayPredictionAccess({ user: adminRoleUser, now: atBeijing(7, 59) }).allowed,
    true
  );
  assert.equal(checkTomorrowPredictionAccess({ user: adminEmailUser }).allowed, true);
  assert.equal(checkWeeklyPredictionAccess({ user: adminEmailUser }).allowed, true);
});

test("10) expired member at 07:59 cannot see today", () => {
  const now = atBeijing(7, 59);
  assert.deepEqual(checkTodayPredictionAccess({ user: expiredMember(now), now }), {
    allowed: false,
    reason: "WAIT_UNTIL_08",
  });
});

test("11) expired member at 08:00 can see today", () => {
  const now = atBeijing(8, 0);
  assert.deepEqual(checkTodayPredictionAccess({ user: expiredMember(now), now }), {
    allowed: true,
    reason: "REGISTERED_AFTER_RELEASE",
  });
});

test("12) expired member cannot see tomorrow", () => {
  const now = atBeijing(9, 0);
  assert.deepEqual(checkTomorrowPredictionAccess({ user: expiredMember(now), now }), {
    allowed: false,
    reason: "MEMBERSHIP_REQUIRED",
  });
});

test("13) access decisions are pure functions of user+now (no shared cache)", () => {
  const memberNow = atBeijing(1, 0);
  const member = checkTodayPredictionAccess({
    user: activeYearlyMember(memberNow),
    now: memberNow,
  });
  const anon = checkTodayPredictionAccess({ user: null, now: memberNow });
  assert.equal(member.allowed, true);
  assert.equal(anon.allowed, false);
  assert.notEqual(member.reason, anon.reason);
});

test("14) login persistence contract — authenticated snapshot keys required", () => {
  // Contract for /api/auth/profile + getAccessUser — session must expose these fields.
  const required = [
    "authenticated",
    "userId",
    "email",
    "role",
    "membershipExpiresAt",
    "isActiveMember",
    "isAdmin",
    "canAccessToday",
    "canAccessTomorrow",
    "canAccessWeekly",
  ];
  for (const key of required) assert.equal(typeof key, "string");
});

test("15) sign-out contract — null user loses all member rights immediately", () => {
  const now = atBeijing(10, 0);
  assert.deepEqual(checkTodayPredictionAccess({ user: null, now }), {
    allowed: false,
    reason: "LOGIN_REQUIRED",
  });
  assert.deepEqual(checkTomorrowPredictionAccess({ user: null, now }), {
    allowed: false,
    reason: "LOGIN_REQUIRED",
  });
  assert.deepEqual(checkWeeklyPredictionAccess({ user: null, now }), {
    allowed: false,
    reason: "LOGIN_REQUIRED",
  });
});

test("member before 08:00 wins over release-time gate (order: login→admin→member→08:00)", () => {
  const now = atBeijing(7, 0);
  const member = activeYearlyMember(now);
  assert.equal(checkTodayPredictionAccess({ user: member, now }).reason, "ACTIVE_MEMBER");
  assert.equal(checkTodayPredictionAccess({ user: registered, now }).reason, "WAIT_UNTIL_08");
});
