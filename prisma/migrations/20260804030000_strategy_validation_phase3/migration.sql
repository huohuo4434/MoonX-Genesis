ALTER TABLE trade_three_horizon_decisions
  ADD COLUMN IF NOT EXISTS strategy_version TEXT NOT NULL DEFAULT 'phase2-v1';

CREATE TABLE IF NOT EXISTS trade_strategy_validation_state (
  id TEXT PRIMARY KEY,
  last_run_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  consecutive_errors INTEGER NOT NULL DEFAULT 0,
  real_trading_locked BOOLEAN NOT NULL DEFAULT TRUE,
  last_report JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trade_strategy_validation_real_locked CHECK (real_trading_locked = TRUE)
);
INSERT INTO trade_strategy_validation_state (id, real_trading_locked)
VALUES ('default', TRUE)
ON CONFLICT (id) DO UPDATE SET real_trading_locked = TRUE;
UPDATE trade_strategy_validation_state SET real_trading_locked = TRUE;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trade_strategy_validation_real_locked'
  ) THEN
    ALTER TABLE trade_strategy_validation_state
      ADD CONSTRAINT trade_strategy_validation_real_locked
      CHECK (real_trading_locked = TRUE);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS trade_strategy_equity_snapshots (
  id TEXT PRIMARY KEY,
  equity_usdt DOUBLE PRECISION,
  available_usdt DOUBLE PRECISION,
  unrealised_pnl_usdt DOUBLE PRECISION,
  positions_count INTEGER NOT NULL DEFAULT 0,
  protected_positions_count INTEGER NOT NULL DEFAULT 0,
  heartbeat_at TIMESTAMPTZ,
  market_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trade_strategy_equity_snapshots_time_idx
  ON trade_strategy_equity_snapshots(captured_at DESC);

CREATE TABLE IF NOT EXISTS trade_strategy_reconciliation_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL UNIQUE,
  severity TEXT NOT NULL,
  code TEXT NOT NULL,
  symbol TEXT,
  decision_id TEXT,
  message TEXT NOT NULL,
  payload JSONB,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trade_strategy_reconciliation_severity_check CHECK (severity IN ('INFO','WARNING','CRITICAL'))
);
CREATE INDEX IF NOT EXISTS trade_strategy_reconciliation_open_idx
  ON trade_strategy_reconciliation_events(resolved, severity, created_at DESC);

CREATE TABLE IF NOT EXISTS trade_strategy_trade_metrics (
  decision_id TEXT PRIMARY KEY,
  position_id TEXT NOT NULL UNIQUE,
  strategy_type TEXT NOT NULL,
  strategy_version TEXT NOT NULL DEFAULT 'phase2-v1',
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  planned_entry DOUBLE PRECISION,
  actual_entry DOUBLE PRECISION,
  actual_exit DOUBLE PRECISION,
  quantity DOUBLE PRECISION,
  gross_pnl_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
  open_fee_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
  close_fee_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
  funding_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
  cash_dividend_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
  net_pnl_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
  entry_slippage_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
  entry_slippage_bps DOUBLE PRECISION NOT NULL DEFAULT 0,
  r_multiple DOUBLE PRECISION,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trade_strategy_trade_metrics_strategy_check CHECK (strategy_type IN ('INTRADAY','SWING','POSITION')),
  CONSTRAINT trade_strategy_trade_metrics_direction_check CHECK (direction IN ('LONG','SHORT'))
);
CREATE INDEX IF NOT EXISTS trade_strategy_trade_metrics_strategy_time_idx
  ON trade_strategy_trade_metrics(strategy_type, closed_at DESC);

CREATE TABLE IF NOT EXISTS trade_strategy_daily_reports (
  report_date DATE NOT NULL,
  strategy_type TEXT NOT NULL,
  closed_trades INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  gross_pnl_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
  fees_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
  funding_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
  net_pnl_usdt DOUBLE PRECISION NOT NULL DEFAULT 0,
  average_r DOUBLE PRECISION,
  profit_factor DOUBLE PRECISION,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (report_date, strategy_type)
);

CREATE TABLE IF NOT EXISTS trade_strategy_experiments (
  id TEXT PRIMARY KEY,
  strategy_type TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  confidence_delta INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(strategy_type, version),
  CONSTRAINT trade_strategy_experiments_strategy_check CHECK (strategy_type IN ('INTRADAY','SWING','POSITION')),
  CONSTRAINT trade_strategy_experiments_delta_check CHECK (confidence_delta >= -10 AND confidence_delta <= 10)
);

CREATE TABLE IF NOT EXISTS trade_strategy_experiment_trials (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  strategy_type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  entry_price DOUBLE PRECISION NOT NULL,
  stop_loss DOUBLE PRECISION NOT NULL,
  target_price DOUBLE PRECISION NOT NULL,
  last_price DOUBLE PRECISION NOT NULL,
  max_favorable_price DOUBLE PRECISION NOT NULL,
  max_adverse_price DOUBLE PRECISION NOT NULL,
  exit_price DOUBLE PRECISION,
  r_multiple DOUBLE PRECISION,
  opened_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(experiment_id, decision_id),
  CONSTRAINT trade_strategy_experiment_trials_status_check CHECK (status IN ('OPEN','TARGET','STOP','TIME','CANCELLED'))
);
CREATE INDEX IF NOT EXISTS trade_strategy_experiment_trials_open_idx
  ON trade_strategy_experiment_trials(status, expires_at);

INSERT INTO trade_strategy_experiments (id, strategy_type, name, version, enabled, confidence_delta, description)
VALUES
  ('exp_intraday_baseline', 'INTRADAY', '短线基线', 'phase3-baseline-v1', TRUE, 0, '完全锁定Phase 2强制条件和原始置信度门槛。'),
  ('exp_intraday_strict', 'INTRADAY', '短线严格组', 'phase3-strict-v1', TRUE, 5, '只做影子对照，置信度门槛提高5个百分点。'),
  ('exp_intraday_flex', 'INTRADAY', '短线弹性组', 'phase3-flex-v1', TRUE, -5, '只做影子对照，强制技术条件不变，置信度门槛降低5个百分点。'),
  ('exp_swing_baseline', 'SWING', '波段基线', 'phase3-baseline-v1', TRUE, 0, '完全锁定Phase 2强制条件和原始置信度门槛。'),
  ('exp_swing_strict', 'SWING', '波段严格组', 'phase3-strict-v1', TRUE, 5, '只做影子对照，置信度门槛提高5个百分点。'),
  ('exp_swing_flex', 'SWING', '波段弹性组', 'phase3-flex-v1', TRUE, -5, '只做影子对照，强制技术条件不变，置信度门槛降低5个百分点。'),
  ('exp_position_baseline', 'POSITION', '中长期基线', 'phase3-baseline-v1', TRUE, 0, '完全锁定Phase 2强制条件和原始置信度门槛。'),
  ('exp_position_strict', 'POSITION', '中长期严格组', 'phase3-strict-v1', TRUE, 5, '只做影子对照，置信度门槛提高5个百分点。'),
  ('exp_position_flex', 'POSITION', '中长期弹性组', 'phase3-flex-v1', TRUE, -5, '只做影子对照，强制技术条件不变，置信度门槛降低5个百分点。')
ON CONFLICT (strategy_type, version) DO NOTHING;
