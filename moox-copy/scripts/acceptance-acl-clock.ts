/**
 * Pure ACL time-injection acceptance (no secrets).
 * Run: npx tsx scripts/acceptance-acl-clock.ts
 */
import {
  checkTodayPredictionAccess,
  checkTomorrowPredictionAccess,
  checkWeeklyPredictionAccess,
} from "../lib/prediction-access";

function beijingAt(ymd: string, hm: string): Date {
  // Construct an instant that is that Asia/Shanghai wall time.
  return new Date(`${ymd}T${hm}:00+08:00`);
}

const today = "2026-07-30";
const guest = null;
const registered = { email: "user@example.com", role: "user", membershipStatus: "inactive" };
const member = {
  email: "member@example.com",
  role: "user",
  membershipStatus: "active",
  membershipExpiresAt: "2026-12-31T00:00:00.000Z",
};
const expired = {
  email: "expired@example.com",
  role: "user",
  membershipStatus: "active",
  membershipExpiresAt: "2026-07-01T00:00:00.000Z",
};
const admin = { email: "admin@example.com", role: "admin", isAdmin: true };

const clocks = [
  { label: "07:59", now: beijingAt(today, "07:59") },
  { label: "08:00", now: beijingAt(today, "08:00") },
  { label: "08:01", now: beijingAt(today, "08:01") },
];

const roles = [
  { label: "guest", user: guest },
  { label: "registered", user: registered },
  { label: "member", user: member },
  { label: "expired", user: expired },
  { label: "admin", user: admin },
] as const;

const rows: Array<Record<string, string>> = [];
for (const clock of clocks) {
  for (const role of roles) {
    const todayA = checkTodayPredictionAccess({ user: role.user, now: clock.now });
    const tomA = checkTomorrowPredictionAccess({ user: role.user, now: clock.now });
    const weekA = checkWeeklyPredictionAccess({ user: role.user, now: clock.now });
    rows.push({
      clock: clock.label,
      role: role.label,
      today: todayA.allowed ? todayA.reason : todayA.reason,
      tomorrow: tomA.allowed ? tomA.reason : tomA.reason,
      weekly: weekA.allowed ? weekA.reason : weekA.reason,
    });
  }
}

console.log(JSON.stringify({ beijingBusinessDate: today, rows }, null, 2));

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(
  !checkTodayPredictionAccess({ user: guest, now: beijingAt(today, "08:01") }).allowed,
  "guest never today"
);
assert(
  !checkTodayPredictionAccess({ user: registered, now: beijingAt(today, "07:59") }).allowed,
  "registered blocked before 08"
);
assert(
  checkTodayPredictionAccess({ user: registered, now: beijingAt(today, "08:00") }).allowed,
  "registered open at 08"
);
assert(
  !checkTomorrowPredictionAccess({ user: registered, now: beijingAt(today, "08:01") }).allowed,
  "registered no tomorrow"
);
assert(
  checkTodayPredictionAccess({ user: member, now: beijingAt(today, "07:59") }).allowed,
  "member today before 08"
);
assert(
  checkTomorrowPredictionAccess({ user: member, now: beijingAt(today, "07:59") }).allowed,
  "member tomorrow before 08"
);
assert(
  !checkTodayPredictionAccess({ user: expired, now: beijingAt(today, "07:59") }).allowed,
  "expired like registered before 08"
);
assert(
  checkTodayPredictionAccess({ user: expired, now: beijingAt(today, "08:00") }).allowed,
  "expired like registered after 08"
);
assert(
  !checkTomorrowPredictionAccess({ user: expired, now: beijingAt(today, "08:01") }).allowed,
  "expired no tomorrow"
);
assert(checkTodayPredictionAccess({ user: admin, now: beijingAt(today, "07:59") }).allowed, "admin today");
assert(checkTomorrowPredictionAccess({ user: admin, now: beijingAt(today, "07:59") }).allowed, "admin tomorrow");

console.log("ACL_CLOCK_ACCEPTANCE_OK");
