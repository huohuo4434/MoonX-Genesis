import assert from "node:assert/strict";
import test from "node:test";
import { selectCryptoBeijingV2Candidates } from "../lib/verification/crypto-beijing-v2-candidates.ts";
import type { DailyForecastRecord, DailyVerificationResult } from "../types/daily-accuracy.ts";

const forecast = (overrides: Partial<DailyForecastRecord> = {}): DailyForecastRecord => ({
  id: "eth-2026-08-09",
  forecastDate: "2026-08-09",
  assetName: "以太坊",
  symbol: "ETH",
  quoteSymbol: "ETH-USD",
  market: "CRYPTO",
  direction: "FLAT",
  directionLabel: "震荡",
  status: "verified",
  publishedAt: "2026-08-08T12:00:00.000Z",
  cutoffAt: "2026-08-08T16:00:00.000Z",
  originalVersion: 1,
  source: "test",
  isSystemTest: false,
  createdAt: "2026-08-08T12:00:00.000Z",
  updatedAt: "2026-08-10T00:00:00.000Z",
  ...overrides,
});

const result = (overrides: Partial<DailyVerificationResult> = {}): DailyVerificationResult => ({
  forecastId: "eth-2026-08-09",
  forecastDate: "2026-08-09",
  assetName: "以太坊",
  symbol: "ETH",
  previousClose: 1923,
  actualClose: 1926,
  actualReturnPct: 0.156,
  actualDirection: "UP",
  verdict: "MISS",
  verdictLabel: "未命中",
  verifiedAt: "2026-08-10T00:00:00.000Z",
  dataSource: "yahoo-finance:ETH-USD",
  isSystemTest: false,
  ...overrides,
} as DailyVerificationResult);

test("only old auditable crypto records since 2026-08-01 are selected", () => {
  assert.deepEqual(selectCryptoBeijingV2Candidates([forecast()], [result()]), ["eth-2026-08-09"]);
  assert.deepEqual(selectCryptoBeijingV2Candidates([forecast({ market: "US" })], [result()]), []);
  assert.deepEqual(selectCryptoBeijingV2Candidates([forecast({ forecastDate: "2026-07-31" })], [result()]), []);
  assert.deepEqual(selectCryptoBeijingV2Candidates([forecast()], [result({ dataSource: "yahoo-finance-1h-BJ:ETH-USD; crypto-beijing-v2" })]), []);
  assert.deepEqual(selectCryptoBeijingV2Candidates([forecast()], [result({ verdict: "UNVERIFIABLE" })]), []);
});
