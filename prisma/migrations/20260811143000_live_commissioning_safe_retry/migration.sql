-- Preserve failed forecast-bound plans while allowing exactly one active plan per
-- strategy/symbol/locked forecast. A retry is only created by the server-side
-- authoritative reconciliation gate; this index is the final concurrency guard.
DROP INDEX IF EXISTS trade_ai_plans_forecast_version_unique;

CREATE UNIQUE INDEX IF NOT EXISTS trade_ai_plans_active_forecast_version_unique
  ON trade_ai_plans(strategy_type, symbol, forecast_version)
  WHERE forecast_version IS NOT NULL
    AND status IN (
      'PUBLISHED',
      'WATCHING',
      'ARMED',
      'ORDER_SUBMITTED',
      'PARTIALLY_FILLED',
      'OPEN',
      'REDUCED'
    );
