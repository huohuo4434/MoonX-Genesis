import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWeeklyDerivedFallbacks,
  PUBLIC_FALLBACK_MARKETS,
} from "@/lib/forecasts/public-daily-fallback";
import { canonicalAssetCode } from "@/lib/presentation/asset-catalog";

const EXPECTED = [
  "BTC",
  "ETH",
  "SPX",
  "NDX",
  "SHCOMP",
  "HSTECH",
  "GOLD",
  "SILVER",
  "WTI",
].sort();

function symbols(date: string) {
  return buildWeeklyDerivedFallbacks(date, "member")
    .map((row) => canonicalAssetCode(row.symbol))
    .sort();
}

test("2026-08-17 core-nine weekly-derived daily fallback is complete", () => {
  assert.equal(PUBLIC_FALLBACK_MARKETS.length, 9);
  assert.deepEqual(symbols("2026-08-17"), EXPECTED);
});

test("2026-08-18 tomorrow core-nine fallback is complete", () => {
  const rows = buildWeeklyDerivedFallbacks("2026-08-18", "member");
  assert.deepEqual(rows.map((row) => canonicalAssetCode(row.symbol)).sort(), EXPECTED);
  assert.ok(rows.every((row) => row.status === "published"));
  assert.ok(rows.every((row) => row.forecastForDate === "2026-08-18"));
});

test("weekend fallback keeps only 7x24 crypto markets", () => {
  assert.deepEqual(symbols("2026-08-22"), ["BTC", "ETH"]);
});

test("current week uses the locked 2026-08-17 weekly source instead of stale July/August-03 data", () => {
  const rows = buildWeeklyDerivedFallbacks("2026-08-17", "member");
  assert.ok(rows.every((row) => row.id.includes("20260817")));
  assert.ok(rows.some((row) => row.symbol === "SPX"));
  assert.ok(rows.some((row) => row.symbol === "NDX"));
  assert.ok(rows.some((row) => row.symbol === "GOLD"));
});
