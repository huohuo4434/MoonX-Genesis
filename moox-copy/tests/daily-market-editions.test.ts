import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DailyMarketForecastEditionDocumentSchema,
  DailyMarketForecastEditionSchema,
} from "../lib/schemas/daily-market-forecast-edition.ts";
import { getCoreDailyAccessMode, resolveCoreDailyAvailabilityForDate } from "../lib/calendar/shanghai-time.ts";
import { shapeDailyMarketEditionTeaser } from "../lib/forecasts/daily-market-edition-shape.ts";

const exampleEdition = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/moonx/daily-editions/example-edition.json"), "utf8")
);

test("daily edition example validates with all four core markets", () => {
  const result = DailyMarketForecastEditionSchema.safeParse(exampleEdition);
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(
    result.data.entries.map((entry) => entry.assetId).sort(),
    ["bitcoin", "gold", "nasdaq100", "sp500"]
  );
});

test("daily edition schema rejects duplicate or incomplete core market set", () => {
  const invalid = {
    ...exampleEdition,
    entries: exampleEdition.entries.slice(0, 3).concat([{ ...exampleEdition.entries[0], assetId: "bitcoin" }]),
  };
  const result = DailyMarketForecastEditionSchema.safeParse(invalid);
  assert.equal(result.success, false);
});

test("shanghai access boundaries honor member-early and public-noon rules", () => {
  const times = resolveCoreDailyAvailabilityForDate("2026-08-01");
  assert.equal(times.memberAvailableAt, "2026-07-31T04:00:00.000Z");
  assert.equal(times.publicAvailableAt, "2026-08-01T04:00:00.000Z");

  assert.equal(
    getCoreDailyAccessMode({
      forecastDate: "2026-08-01",
      isMember: true,
      isAdmin: false,
      now: new Date("2026-07-31T04:00:00.000Z"),
    }),
    "member_early"
  );
  assert.equal(
    getCoreDailyAccessMode({
      forecastDate: "2026-08-01",
      isMember: false,
      isAdmin: false,
      now: new Date("2026-07-31T12:00:00.000Z"),
    }),
    "public_locked"
  );
  assert.equal(
    getCoreDailyAccessMode({
      forecastDate: "2026-08-01",
      isMember: false,
      isAdmin: false,
      now: new Date("2026-08-01T04:00:00.000Z"),
    }),
    "public_open"
  );
});

test("locked daily teaser strips directions, levels, and evidence payloads", () => {
  const teaser = shapeDailyMarketEditionTeaser(exampleEdition);
  const blob = JSON.stringify(teaser);
  assert.equal(blob.includes("mainDirection"), false);
  assert.equal(blob.includes("intradayPath"), false);
  assert.equal(blob.includes("supportLevels"), false);
  assert.equal(blob.includes("frameworkContributions"), false);
});

test("empty edition list is resilient and current selection stays null", () => {
  const list = JSON.parse(readFileSync(resolve(process.cwd(), "content/moonx/daily-editions/index.json"), "utf8"));
  assert.ok(Array.isArray(list));
  assert.equal(list.length, 0);
  assert.equal(DailyMarketForecastEditionDocumentSchema.safeParse(list).success, true);
});
