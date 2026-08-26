-- Read-only member diagnostics filter one Beijing-day UTC range. Keep the
-- range probe indexable as the minute-level decision audit table grows.
CREATE INDEX IF NOT EXISTS trade_three_horizon_decisions_updated_at_funnel_idx
ON trade_three_horizon_decisions(updated_at DESC, strategy_type, UPPER(symbol), created_at DESC);
