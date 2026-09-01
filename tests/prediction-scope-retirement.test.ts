import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ACTIVE_PREDICTION_SYMBOLS, RETIRED_PREDICTION_SYMBOLS, isActivePredictionSymbol, isRetiredPredictionSymbol } from "../lib/prediction-scope.ts";

test("prediction scope contains five active and four retired markets", () => {
  assert.deepEqual([...ACTIVE_PREDICTION_SYMBOLS], ["BTC", "ETH", "NDX", "GOLD", "SILVER"]);
  assert.deepEqual([...RETIRED_PREDICTION_SYMBOLS], ["WTI", "SPX", "SHCOMP", "HSTECH"]);
});

test("scope aliases cannot leak retired markets or hide active ones", () => {
  for (const symbol of ["BTCUSDT", "ETHUSDT", "QQQ", "GLD", "XAUUSD", "SI=F", "XAGUSD"]) assert.equal(isActivePredictionSymbol(symbol), true, symbol);
  for (const symbol of ["CL=F", "WTIUSD", "SPY", "000001.SS", "HSTECH.HK"]) {
    assert.equal(isRetiredPredictionSymbol(symbol), true, symbol);
    assert.equal(isActivePredictionSymbol(symbol), false, symbol);
  }
});

test("generation, access and public verification share the scope gate", () => {
  for (const file of ["lib/automation/generate-forecasts.ts", "lib/prediction-access-server.ts", "lib/accuracy/get-public-history.ts", "lib/accuracy/get-weekly-history.ts", "lib/accuracy/get-pending-verification.ts"]) assert.match(readFileSync(file, "utf8"), /isActivePredictionSymbol/);
  assert.match(readFileSync("lib/verification/sync-generated-dailies.ts", "utf8"), /isRetiredPredictionSymbol/);
  const page = readFileSync("components/verification/PublicVerificationCenter.tsx", "utf8");
  assert.match(page, /当前主统计口径：5个现役品种/);
  assert.match(page, /历史全市场基线/);
});
