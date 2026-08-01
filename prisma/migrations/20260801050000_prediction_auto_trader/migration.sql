CREATE TABLE IF NOT EXISTS trade_prediction_auto_settings (
  id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  btc_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  eth_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  position_pct DOUBLE PRECISION NOT NULL DEFAULT 2,
  stop_loss_pct DOUBLE PRECISION NOT NULL DEFAULT 1,
  target_1_pct DOUBLE PRECISION NOT NULL DEFAULT 1.5,
  target_2_pct DOUBLE PRECISION NOT NULL DEFAULT 2.5,
  target_3_pct DOUBLE PRECISION NOT NULL DEFAULT 3.5,
  min_dip_pct DOUBLE PRECISION NOT NULL DEFAULT 0.6,
  rebound_confirm_pct DOUBLE PRECISION NOT NULL DEFAULT 0.25,
  min_rally_pct DOUBLE PRECISION NOT NULL DEFAULT 0.6,
  reversal_confirm_pct DOUBLE PRECISION NOT NULL DEFAULT 0.25,
  min_forecast_confidence DOUBLE PRECISION NOT NULL DEFAULT 55,
  max_trades_per_symbol_day INTEGER NOT NULL DEFAULT 1,
  require_daily_weekly_alignment BOOLEAN NOT NULL DEFAULT TRUE,
  started_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  last_message TEXT NOT NULL DEFAULT '尚未运行',
  run_lock_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO trade_prediction_auto_settings (id)
VALUES ('default') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS trade_prediction_auto_runs (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  trading_date DATE NOT NULL,
  status TEXT NOT NULL,
  action TEXT NOT NULL,
  direction TEXT NOT NULL,
  price DOUBLE PRECISION,
  weekly_forecast_id TEXT,
  daily_forecast_id TEXT,
  signal_id TEXT,
  reason TEXT NOT NULL DEFAULT '',
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trade_prediction_auto_runs_time_idx
ON trade_prediction_auto_runs(created_at DESC);

CREATE INDEX IF NOT EXISTS trade_prediction_auto_runs_symbol_date_idx
ON trade_prediction_auto_runs(symbol, trading_date, status);

ALTER TABLE trade_prediction_auto_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_prediction_auto_runs ENABLE ROW LEVEL SECURITY;
