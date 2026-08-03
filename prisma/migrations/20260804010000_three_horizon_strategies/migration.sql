CREATE TABLE IF NOT EXISTS trade_three_horizon_profiles (
  strategy_type TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  mode TEXT NOT NULL DEFAULT 'SHADOW',
  symbols JSONB NOT NULL DEFAULT '["BTCUSDT","ETHUSDT"]'::jsonb,
  scan_interval_minutes INTEGER NOT NULL,
  risk_per_trade_pct DOUBLE PRECISION NOT NULL,
  max_holding_minutes INTEGER NOT NULL,
  min_confidence INTEGER NOT NULL,
  max_trades_per_day INTEGER NOT NULL,
  last_scan_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trade_three_horizon_profiles_mode_check CHECK (mode IN ('SHADOW','DEMO')),
  CONSTRAINT trade_three_horizon_profiles_risk_check CHECK (risk_per_trade_pct > 0 AND risk_per_trade_pct <= 0.5)
);

CREATE TABLE IF NOT EXISTS trade_three_horizon_decisions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  decision_key TEXT NOT NULL UNIQUE,
  strategy_type TEXT NOT NULL,
  mode TEXT NOT NULL,
  symbol TEXT NOT NULL,
  status TEXT NOT NULL,
  direction TEXT NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 0,
  technical_score INTEGER NOT NULL DEFAULT 0,
  forecast_score INTEGER NOT NULL DEFAULT 0,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  rejection_code TEXT NOT NULL DEFAULT '',
  rejection_reason TEXT NOT NULL DEFAULT '',
  current_price DOUBLE PRECISION,
  entry_price DOUBLE PRECISION,
  stop_loss DOUBLE PRECISION,
  target_1 DOUBLE PRECISION,
  target_2 DOUBLE PRECISION,
  quantity DOUBLE PRECISION,
  risk_amount_usdt DOUBLE PRECISION,
  risk_pct DOUBLE PRECISION,
  max_holding_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  client_oid TEXT,
  bitget_order_id TEXT,
  protection_order_id TEXT,
  tp1_done BOOLEAN NOT NULL DEFAULT FALSE,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  realized_pnl_usdt DOUBLE PRECISION,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trade_three_horizon_decisions_strategy_check CHECK (strategy_type IN ('INTRADAY','SWING','POSITION')),
  CONSTRAINT trade_three_horizon_decisions_mode_check CHECK (mode IN ('SHADOW','DEMO')),
  CONSTRAINT trade_three_horizon_decisions_direction_check CHECK (direction IN ('LONG','SHORT','NEUTRAL'))
);

CREATE INDEX IF NOT EXISTS trade_three_horizon_decisions_strategy_time_idx
  ON trade_three_horizon_decisions(strategy_type, created_at DESC);
CREATE INDEX IF NOT EXISTS trade_three_horizon_decisions_active_idx
  ON trade_three_horizon_decisions(status, symbol, updated_at DESC);
CREATE INDEX IF NOT EXISTS trade_three_horizon_decisions_client_oid_idx
  ON trade_three_horizon_decisions(client_oid)
  WHERE client_oid IS NOT NULL;

INSERT INTO trade_three_horizon_profiles (
  strategy_type, enabled, mode, symbols, scan_interval_minutes,
  risk_per_trade_pct, max_holding_minutes, min_confidence,
  max_trades_per_day, updated_at
) VALUES
  ('INTRADAY', TRUE, 'SHADOW', '["BTCUSDT","ETHUSDT"]'::jsonb, 5, 0.35, 480, 58, 4, NOW()),
  ('SWING', TRUE, 'SHADOW', '["BTCUSDT","ETHUSDT"]'::jsonb, 30, 0.5, 10080, 60, 2, NOW()),
  ('POSITION', TRUE, 'SHADOW', '["BTCUSDT","ETHUSDT"]'::jsonb, 240, 0.35, 40320, 62, 1, NOW())
ON CONFLICT (strategy_type) DO NOTHING;
