import assert from "node:assert/strict";
import test from "node:test";

import {
  isUnifiedLiveActiveExecutionEnabled,
  readAuthoritativeTradingControlMode,
  readUnifiedLiveRuntimeConfig,
} from "../lib/trading-signals/unified-live-config";

const CONTROL_KEYS = [
  "MOOX_TRADING_CONTROL_MODE",
  "MOOX_UNIFIED_LIVE_MODE",
  "MOOX_UNIFIED_LIVE_ALLOW_LIVE_SWITCH",
  "MOOX_UNIFIED_LIVE_NEW_ENTRIES",
  "MOOX_UNIFIED_LIVE_POSITION_MANAGEMENT",
  "MOOX_LIVE_ACTIVE_EXECUTION_V641",
] as const;

function withEnvironment(values: Partial<Record<(typeof CONTROL_KEYS)[number], string>>, run: () => void) {
  const before = Object.fromEntries(CONTROL_KEYS.map((key) => [key, process.env[key]]));
  try {
    for (const key of CONTROL_KEYS) delete process.env[key];
    Object.assign(process.env, values);
    run();
  } finally {
    for (const key of CONTROL_KEYS) {
      const value = before[key];
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("single LIVE control authorizes entries and position management", () => {
  withEnvironment({ MOOX_TRADING_CONTROL_MODE: "LIVE" }, () => {
    assert.deepEqual(readAuthoritativeTradingControlMode(), { configured: true, mode: "LIVE" });
    assert.deepEqual(readUnifiedLiveRuntimeConfig(), {
      mode: "LIVE",
      allowLiveSwitch: true,
      allowNewEntriesByEnv: true,
      positionManagementEnabled: true,
      controlSource: "MOOX_TRADING_CONTROL_MODE",
      isolatedOnly: true,
      maxLeverage: 10,
    });
    assert.equal(isUnifiedLiveActiveExecutionEnabled(), true);
  });
});

test("MANAGE_ONLY keeps management on while preventing new exposure", () => {
  withEnvironment({ MOOX_TRADING_CONTROL_MODE: "MANAGE_ONLY" }, () => {
    const config = readUnifiedLiveRuntimeConfig();
    assert.equal(config.allowNewEntriesByEnv, false);
    assert.equal(config.positionManagementEnabled, true);
    assert.equal(isUnifiedLiveActiveExecutionEnabled(), false);
  });
});

test("invalid authoritative control fails closed even if legacy flags say LIVE", () => {
  withEnvironment({
    MOOX_TRADING_CONTROL_MODE: "LIVEE",
    MOOX_UNIFIED_LIVE_MODE: "LIVE",
    MOOX_UNIFIED_LIVE_ALLOW_LIVE_SWITCH: "true",
    MOOX_UNIFIED_LIVE_NEW_ENTRIES: "true",
    MOOX_LIVE_ACTIVE_EXECUTION_V641: "true",
  }, () => {
    const config = readUnifiedLiveRuntimeConfig();
    assert.equal(config.mode, "PAUSED");
    assert.equal(config.allowNewEntriesByEnv, false);
    assert.equal(config.positionManagementEnabled, false);
    assert.equal(isUnifiedLiveActiveExecutionEnabled(), false);
  });
});

test("legacy controls remain a fail-closed migration fallback", () => {
  withEnvironment({
    MOOX_UNIFIED_LIVE_MODE: "LIVE",
    MOOX_UNIFIED_LIVE_ALLOW_LIVE_SWITCH: "true",
    MOOX_UNIFIED_LIVE_NEW_ENTRIES: "true",
    MOOX_UNIFIED_LIVE_POSITION_MANAGEMENT: "true",
  }, () => {
    const config = readUnifiedLiveRuntimeConfig();
    assert.equal(config.mode, "LIVE");
    assert.equal(config.controlSource, "LEGACY_ENV_COMPATIBILITY");
  });
});
