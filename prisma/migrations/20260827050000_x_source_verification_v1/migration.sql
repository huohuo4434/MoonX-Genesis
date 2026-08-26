CREATE TABLE IF NOT EXISTS trade_external_analyst_verifications (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  post_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  source_family TEXT NOT NULL,
  horizon TEXT NOT NULL,
  forecast_date DATE NOT NULL,
  locked_direction TEXT NOT NULL,
  locked_confidence INTEGER NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL,
  evidence_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  actual_direction TEXT,
  actual_return_pct DOUBLE PRECISION,
  score DOUBLE PRECISION,
  score_version TEXT NOT NULL DEFAULT 'X_SOURCE_DIRECTION_V1',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trade_external_analyst_verifications_direction_check CHECK (locked_direction IN ('LONG', 'SHORT')),
  CONSTRAINT trade_external_analyst_verifications_horizon_check CHECK (horizon IN ('SHORT', 'MEDIUM', 'LONG')),
  CONSTRAINT trade_external_analyst_verifications_status_check CHECK (status IN ('PENDING', 'HIT', 'PARTIAL', 'MISS', 'VOID'))
);

CREATE UNIQUE INDEX IF NOT EXISTS trade_external_analyst_verifications_source_sample_uq
ON trade_external_analyst_verifications(username, post_id, symbol);

CREATE INDEX IF NOT EXISTS trade_external_analyst_verifications_stats_idx
ON trade_external_analyst_verifications(username, symbol, horizon, status, forecast_date DESC);

CREATE INDEX IF NOT EXISTS trade_external_analyst_verifications_pending_idx
ON trade_external_analyst_verifications(status, forecast_date);
