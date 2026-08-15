CREATE TABLE IF NOT EXISTS member_paper_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  initial_cash DOUBLE PRECISION NOT NULL CHECK (initial_cash > 0),
  cash_balance DOUBLE PRECISION NOT NULL,
  realized_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
  peak_equity DOUBLE PRECISION NOT NULL,
  max_drawdown_pct DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (max_drawdown_pct >= 0),
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  pause_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_signal_api_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  token_prefix TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['plans:read']::TEXT[],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  CHECK (scopes <@ ARRAY['plans:read']::TEXT[])
);
CREATE INDEX IF NOT EXISTS member_signal_api_tokens_user_idx
ON member_signal_api_tokens(user_id, active, created_at DESC);

CREATE TABLE IF NOT EXISTS member_paper_positions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES member_paper_accounts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  source_plan_id TEXT NOT NULL,
  source_plan_version INTEGER NOT NULL,
  source_revision_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  quantity DOUBLE PRECISION NOT NULL CHECK (quantity > 0),
  entry_price DOUBLE PRECISION NOT NULL CHECK (entry_price > 0),
  current_price DOUBLE PRECISION NOT NULL CHECK (current_price > 0),
  stop_loss DOUBLE PRECISION NOT NULL CHECK (stop_loss > 0),
  target_1 DOUBLE PRECISION NOT NULL CHECK (target_1 > 0),
  target_2 DOUBLE PRECISION NOT NULL CHECK (target_2 > 0),
  target_3 DOUBLE PRECISION NOT NULL CHECK (target_3 > 0),
  realized_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
  unrealized_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, source_plan_id, source_plan_version)
);
CREATE INDEX IF NOT EXISTS member_paper_positions_user_status_idx
ON member_paper_positions(user_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS member_paper_events (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES member_paper_accounts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  position_id TEXT REFERENCES member_paper_positions(id) ON DELETE SET NULL,
  source_plan_id TEXT NOT NULL,
  source_plan_version INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('ENTER', 'EXIT')),
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL CHECK (price > 0),
  quantity DOUBLE PRECISION NOT NULL CHECK (quantity > 0),
  realized_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
  result_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS member_paper_events_user_time_idx
ON member_paper_events(user_id, created_at DESC);

ALTER TABLE member_paper_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_signal_api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_paper_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_paper_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE member_paper_accounts IS 'Per-member isolated simulation ledger; never exchange or live funds.';
COMMENT ON TABLE member_signal_api_tokens IS 'Hashed, revocable, expiring member read-only Signal API credentials.';
COMMENT ON TABLE member_paper_events IS 'Immutable idempotent audit events for member paper execution only.';
