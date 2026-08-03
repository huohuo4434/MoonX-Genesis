CREATE TABLE IF NOT EXISTS trade_reliability_state (
  id TEXT PRIMARY KEY,
  api_mode TEXT NOT NULL DEFAULT 'UTA_V3_DEMO',
  paptrading_required BOOLEAN NOT NULL DEFAULT TRUE,
  real_trading_locked BOOLEAN NOT NULL DEFAULT TRUE,
  mode TEXT NOT NULL DEFAULT 'RECOVERING',
  admin_override TEXT,
  mode_reason TEXT NOT NULL DEFAULT '等待Phase 4首次健康检查',
  server_time_offset_ms INTEGER,
  last_server_time_sync_at TIMESTAMPTZ,
  last_watchdog_at TIMESTAMPTZ,
  last_healthy_at TIMESTAMPTZ,
  consecutive_healthy_runs INTEGER NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  heartbeat_age_seconds INTEGER,
  market_age_seconds INTEGER,
  unprotected_positions INTEGER NOT NULL DEFAULT 0,
  orphan_positions INTEGER NOT NULL DEFAULT 0,
  unknown_protection_orders INTEGER NOT NULL DEFAULT 0,
  last_report JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trade_reliability_api_mode_check CHECK (api_mode = 'UTA_V3_DEMO'),
  CONSTRAINT trade_reliability_paper_check CHECK (paptrading_required = TRUE),
  CONSTRAINT trade_reliability_real_lock_check CHECK (real_trading_locked = TRUE),
  CONSTRAINT trade_reliability_mode_check CHECK (mode IN ('RUNNING','OPENING_DISABLED','MANAGE_ONLY','EMERGENCY_CLOSE_ONLY','PAUSED','RECOVERING')),
  CONSTRAINT trade_reliability_admin_override_check CHECK (admin_override IS NULL OR admin_override IN ('MANAGE_ONLY','PAUSED'))
);

INSERT INTO trade_reliability_state (
  id, api_mode, paptrading_required, real_trading_locked, mode, mode_reason
) VALUES (
  'default', 'UTA_V3_DEMO', TRUE, TRUE, 'RECOVERING', '等待Phase 4首次健康检查'
) ON CONFLICT (id) DO UPDATE SET
  api_mode = 'UTA_V3_DEMO',
  paptrading_required = TRUE,
  real_trading_locked = TRUE,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS trade_execution_outbox (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  decision_id TEXT,
  action_type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  client_oid TEXT,
  bitget_order_id TEXT,
  last_error TEXT NOT NULL DEFAULT '',
  acknowledged_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trade_execution_outbox_action_check CHECK (action_type IN ('OPEN_MARKET','CLOSE_MARKET','PLACE_PROTECTION','CANCEL_PROTECTION')),
  CONSTRAINT trade_execution_outbox_status_check CHECK (status IN ('PENDING','PROCESSING','ACKNOWLEDGED','CONFIRMED','FAILED','RECONCILED'))
);

CREATE INDEX IF NOT EXISTS trade_execution_outbox_ready_idx
  ON trade_execution_outbox(status, next_attempt_at, created_at);
CREATE INDEX IF NOT EXISTS trade_execution_outbox_decision_idx
  ON trade_execution_outbox(decision_id, created_at DESC);
CREATE INDEX IF NOT EXISTS trade_execution_outbox_client_oid_idx
  ON trade_execution_outbox(client_oid) WHERE client_oid IS NOT NULL;

CREATE TABLE IF NOT EXISTS trade_reliability_incidents (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  severity TEXT NOT NULL,
  code TEXT NOT NULL,
  symbol TEXT,
  decision_id TEXT,
  message TEXT NOT NULL,
  payload JSONB,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  notified_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trade_reliability_incident_severity_check CHECK (severity IN ('INFO','WARNING','CRITICAL'))
);

CREATE INDEX IF NOT EXISTS trade_reliability_incidents_open_idx
  ON trade_reliability_incidents(resolved, severity, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS trade_reliability_incidents_code_idx
  ON trade_reliability_incidents(code, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS trade_watchdog_runs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  mode TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  issue_count INTEGER NOT NULL DEFAULT 0,
  repair_count INTEGER NOT NULL DEFAULT 0,
  report JSONB NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trade_watchdog_runs_source_check CHECK (source IN ('CRON','ADMIN'))
);

CREATE INDEX IF NOT EXISTS trade_watchdog_runs_time_idx
  ON trade_watchdog_runs(created_at DESC);
