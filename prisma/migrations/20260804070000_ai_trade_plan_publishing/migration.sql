ALTER TABLE trade_three_horizon_profiles
  ADD COLUMN IF NOT EXISTS planning_min_confidence INTEGER NOT NULL DEFAULT 45;

ALTER TABLE trade_three_horizon_decisions
  ADD COLUMN IF NOT EXISTS plan_id TEXT;

CREATE TABLE IF NOT EXISTS trade_ai_plans (
  id TEXT PRIMARY KEY,
  plan_group_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  strategy_type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  plan_tier TEXT NOT NULL,
  status TEXT NOT NULL,
  execution_mode TEXT NOT NULL,
  thesis_summary TEXT NOT NULL,
  planning_confidence INTEGER NOT NULL,
  execution_threshold INTEGER NOT NULL,
  entry_zone_low DOUBLE PRECISION NOT NULL,
  entry_zone_high DOUBLE PRECISION NOT NULL,
  trigger_rule TEXT NOT NULL,
  confirmation_timeframe TEXT NOT NULL,
  order_type_if_triggered TEXT NOT NULL,
  protective_stop DOUBLE PRECISION NOT NULL,
  target_1 DOUBLE PRECISION NOT NULL,
  target_2 DOUBLE PRECISION NOT NULL,
  target_3 DOUBLE PRECISION NOT NULL,
  risk_percent DOUBLE PRECISION NOT NULL,
  max_leverage DOUBLE PRECISION NOT NULL DEFAULT 2,
  valid_from TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  invalidation_rule TEXT NOT NULL,
  cancel_if TEXT NOT NULL,
  conditions_met INTEGER NOT NULL DEFAULT 0,
  conditions_total INTEGER NOT NULL DEFAULT 0,
  current_price DOUBLE PRECISION,
  distance_to_entry_pct DOUBLE PRECISION,
  published_at TIMESTAMPTZ NOT NULL,
  last_checked_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  first_fill_at TIMESTAMPTZ,
  average_fill_price DOUBLE PRECISION,
  closed_at TIMESTAMPTZ,
  close_reason TEXT,
  client_oid TEXT,
  bitget_order_id TEXT,
  source_decision_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trade_ai_plans_strategy_check CHECK (strategy_type IN ('INTRADAY','SWING','POSITION')),
  CONSTRAINT trade_ai_plans_direction_check CHECK (direction IN ('LONG','SHORT','NEUTRAL')),
  CONSTRAINT trade_ai_plans_tier_check CHECK (plan_tier IN ('CANDIDATE','FORMAL')),
  CONSTRAINT trade_ai_plans_execution_mode_check CHECK (execution_mode IN ('SHADOW','BITGET_DEMO')),
  CONSTRAINT trade_ai_plans_status_check CHECK (status IN (
    'PUBLISHED','WATCHING','ARMED','ORDER_SUBMITTED','PARTIALLY_FILLED','OPEN','REDUCED',
    'CLOSED','CANCELLED','EXPIRED','INVALIDATED','SUPERSEDED','EXECUTION_ERROR'
  )),
  CONSTRAINT trade_ai_plans_confidence_check CHECK (
    planning_confidence >= 0 AND planning_confidence <= 100 AND
    execution_threshold >= 0 AND execution_threshold <= 100
  ),
  CONSTRAINT trade_ai_plans_risk_check CHECK (risk_percent > 0 AND risk_percent <= 0.5),
  CONSTRAINT trade_ai_plans_version_unique UNIQUE(plan_group_id, version)
);

CREATE INDEX IF NOT EXISTS trade_ai_plans_active_idx
  ON trade_ai_plans(strategy_type, symbol, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS trade_ai_plans_published_idx
  ON trade_ai_plans(published_at DESC);
CREATE INDEX IF NOT EXISTS trade_ai_plans_client_oid_idx
  ON trade_ai_plans(client_oid) WHERE client_oid IS NOT NULL;
CREATE INDEX IF NOT EXISTS trade_ai_plans_decision_idx
  ON trade_ai_plans(source_decision_id) WHERE source_decision_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS trade_ai_plan_events (
  id TEXT PRIMARY KEY,
  event_key TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  status TEXT,
  bitget_order_id TEXT,
  client_oid TEXT,
  price DOUBLE PRECISION,
  quantity DOUBLE PRECISION,
  payload JSONB,
  event_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trade_ai_plan_events_plan_time_idx
  ON trade_ai_plan_events(plan_id, event_at ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS trade_ai_plan_events_order_idx
  ON trade_ai_plan_events(bitget_order_id) WHERE bitget_order_id IS NOT NULL;
