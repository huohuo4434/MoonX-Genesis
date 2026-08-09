ALTER TABLE trade_ai_plans
  ADD COLUMN IF NOT EXISTS forecast_id TEXT,
  ADD COLUMN IF NOT EXISTS forecast_version TEXT,
  ADD COLUMN IF NOT EXISTS forecast_horizon TEXT,
  ADD COLUMN IF NOT EXISTS forecast_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS forecast_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS forecast_valid_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS forecast_valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS forecast_source TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS trade_ai_plans_forecast_version_unique
  ON trade_ai_plans(strategy_type, symbol, forecast_version)
  WHERE forecast_version IS NOT NULL;
