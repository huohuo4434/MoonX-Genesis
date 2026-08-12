import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  dailyPathTemporalStatus,
  prioritizeCurrentPeriods,
  prioritizeDailyPath,
} from "../lib/data/conviction/freshness";

test("current conviction period is presented before expired and future periods", () => {
  const meta = [{ type: "WEEK" }, { type: "WEEK_2" }, { type: "WEEK_3" }];
  const slots = [
    { type: "WEEK", freshnessStatus: "EXPIRED" as const },
    { type: "WEEK_2", freshnessStatus: "CURRENT" as const },
    { type: "WEEK_3", freshnessStatus: "UPCOMING" as const },
  ];
  assert.deepEqual(prioritizeCurrentPeriods(meta, slots).map((item) => item.type), [
    "WEEK_2",
    "WEEK_3",
    "WEEK",
  ]);
});

test("daily path automatically follows the Beijing date without rewriting source records", () => {
  const source = [
    { date: "2026-08-07", summary: "old" },
    { date: "2026-08-14", summary: "future" },
    { date: "2026-08-13", summary: "today" },
    { date: "2026-08-12", summary: "recent" },
  ];
  const ordered = prioritizeDailyPath(source, "2026-08-13");
  assert.deepEqual(ordered.map((item) => item.date), [
    "2026-08-13",
    "2026-08-14",
    "2026-08-12",
    "2026-08-07",
  ]);
  assert.equal(dailyPathTemporalStatus("2026-08-13", "2026-08-13"), "TODAY");
  assert.equal(dailyPathTemporalStatus("2026-08-14", "2026-08-13"), "FUTURE");
  assert.equal(dailyPathTemporalStatus("2026-08-07", "2026-08-13"), "PAST");
  assert.deepEqual(source.map((item) => item.date), [
    "2026-08-07",
    "2026-08-14",
    "2026-08-13",
    "2026-08-12",
  ]);
});

test("server payload and member page use automatic rollover while cron remains immutable", () => {
  const access = readFileSync("lib/data/conviction/access.ts", "utf8");
  const page = readFileSync("components/conviction/ConvictionDetailClient.tsx", "utf8");
  const cron = JSON.parse(readFileSync("vercel.json", "utf8")) as {
    crons: Array<{ path: string; schedule: string }>;
  };
  assert.match(access, /prioritizeCurrentPeriods\(publicPeriodMeta\(staticPeriodAsset\), staticPeriodSlots\)/);
  assert.match(page, /prioritizeDailyPath\(f\.dailyPath, asOfDate\)/);
  assert.match(page, /当前周期 · 自动定位 \{asOfDate\}/);
  assert.ok(cron.crons.some((item) => item.path === "/api/cron/generate-daily-forecasts"));
  assert.ok(cron.crons.some((item) => item.path === "/api/cron/moonx-cycle"));
});
