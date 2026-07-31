CREATE TABLE IF NOT EXISTS trade_signals (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  market TEXT NOT NULL DEFAULT '',
  timeframe TEXT NOT NULL DEFAULT '1D',
  direction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  star_level INTEGER NOT NULL DEFAULT 1,
  consensus_score INTEGER NOT NULL DEFAULT 0,
  entry_mode TEXT NOT NULL DEFAULT 'MANUAL',
  entry_low DOUBLE PRECISION,
  entry_high DOUBLE PRECISION,
  trigger_price DOUBLE PRECISION,
  stop_loss DOUBLE PRECISION,
  stop_confirm_timeframe TEXT NOT NULL DEFAULT '4H',
  target_1 DOUBLE PRECISION,
  target_2 DOUBLE PRECISION,
  target_3 DOUBLE PRECISION,
  quantity DOUBLE PRECISION,
  notional_amount DOUBLE PRECISION,
  position_size_pct INTEGER,
  max_risk_pct DOUBLE PRECISION,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  rationale TEXT NOT NULL DEFAULT '',
  execution_plan TEXT NOT NULL DEFAULT '',
  invalidation TEXT NOT NULL DEFAULT '',
  source_forecast_id TEXT,
  api_visible BOOLEAN NOT NULL DEFAULT FALSE,
  paper_only BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trade_signals_status_idx ON trade_signals(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS trade_signals_symbol_idx ON trade_signals(symbol, timeframe);

CREATE TABLE IF NOT EXISTS trade_signal_methods (
  id TEXT PRIMARY KEY,
  signal_id TEXT NOT NULL REFERENCES trade_signals(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  direction TEXT NOT NULL,
  weight DOUBLE PRECISION NOT NULL DEFAULT 0,
  confidence INTEGER NOT NULL DEFAULT 0,
  evidence TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trade_signal_methods_signal_idx ON trade_signal_methods(signal_id);

CREATE TABLE IF NOT EXISTS trade_signal_results (
  id TEXT PRIMARY KEY,
  signal_id TEXT NOT NULL UNIQUE REFERENCES trade_signals(id) ON DELETE CASCADE,
  entry_price DOUBLE PRECISION NOT NULL,
  exit_price DOUBLE PRECISION NOT NULL,
  return_pct DOUBLE PRECISION NOT NULL,
  max_favorable_pct DOUBLE PRECISION,
  max_adverse_pct DOUBLE PRECISION,
  verdict TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trade_signal_results_verdict_idx ON trade_signal_results(verdict, closed_at DESC);

CREATE TABLE IF NOT EXISTS trade_signal_events (
  id TEXT PRIMARY KEY,
  signal_id TEXT NOT NULL REFERENCES trade_signals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'MOONX',
  external_order_id TEXT,
  price DOUBLE PRECISION,
  quantity DOUBLE PRECISION,
  payload JSONB,
  note TEXT NOT NULL DEFAULT '',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trade_signal_events_signal_idx ON trade_signal_events(signal_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS trade_signal_api_keys (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '["read"]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
