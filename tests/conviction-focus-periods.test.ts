import test from "node:test";
import assert from "node:assert/strict";
import {
  LONGXIN_VISIBLE_PERIOD_ORDER,
  LONGXIN_FULL_PERIOD_ORDER,
  listLongxinPeriodForecasts,
} from "@/lib/data/conviction/longxin-forecasts";
import {
  ASTEROID_PERIOD_ORDER,
  listAsteroidPeriodForecasts,
} from "@/lib/data/conviction/asteroid-forecasts";
import {
  ETH_VISIBLE_PERIOD_ORDER,
  listEthPeriodForecasts,
} from "@/lib/data/conviction/eth-forecasts";

test("focus assets expose weekly and monthly research, with longer horizons archived", () => {
  assert.deepEqual(LONGXIN_VISIBLE_PERIOD_ORDER, ["WEEK_4", "WEEK_5", "WEEK_6", "WEEK_7", "WEEK_8", "MONTH_1", "MONTH_3"]);
  assert.ok(LONGXIN_FULL_PERIOD_ORDER.includes("YEAR_10"));
  assert.deepEqual(ASTEROID_PERIOD_ORDER.slice(0, 10), ["WEEK", "WEEK_2", "WEEK_3", "WEEK_4", "WEEK_5", "WEEK_6", "WEEK_7", "WEEK_8", "WEEK_9", "MONTH_1"]);
  assert.deepEqual(ETH_VISIBLE_PERIOD_ORDER, ["WEEK", "WEEK_2", "MONTH_1"]);

  const visible = [
    ...listLongxinPeriodForecasts(),
    ...listAsteroidPeriodForecasts(),
    ...listEthPeriodForecasts(),
  ].filter((record) => ["WEEK", "MONTH_1"].includes(record.forecastType));

  assert.ok(visible.length >= 6);
  assert.ok(
    visible.every(
      (record) =>
        record.direction !== "待复核" &&
        record.summary.length > 20 &&
        record.expectedPath.length > 10
    )
  );
});
