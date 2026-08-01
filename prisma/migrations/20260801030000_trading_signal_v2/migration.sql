ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS auto_draft_key TEXT;
ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS draft_source TEXT;
ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS revision_of_id TEXT;
ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS revision_reason TEXT;
ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS last_price DOUBLE PRECISION;
ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;
ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMPTZ;
ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS entered_at TIMESTAMPTZ;
ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS target1_hit_at TIMESTAMPTZ;
ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS target2_hit_at TIMESTAMPTZ;
ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS target3_hit_at TIMESTAMPTZ;
ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS stopped_at TIMESTAMPTZ;
ALTER TABLE trade_signals ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS trade_signals_auto_draft_key_idx
ON trade_signals(auto_draft_key) WHERE auto_draft_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS trade_risk_settings (
  id TEXT PRIMARY KEY,
  risk_per_trade_pct DOUBLE PRECISION NOT NULL DEFAULT 1,
  max_position_pct DOUBLE PRECISION NOT NULL DEFAULT 20,
  star_1_position_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  star_2_position_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  star_3_position_pct DOUBLE PRECISION NOT NULL DEFAULT 5,
  star_4_position_pct DOUBLE PRECISION NOT NULL DEFAULT 12,
  star_5_position_pct DOUBLE PRECISION NOT NULL DEFAULT 20,
  daily_loss_stop_pct DOUBLE PRECISION NOT NULL DEFAULT 3,
  max_consecutive_losses INTEGER NOT NULL DEFAULT 3,
  breakeven_after_target1 BOOLEAN NOT NULL DEFAULT TRUE,
  target1_close_pct DOUBLE PRECISION NOT NULL DEFAULT 50,
  target2_close_pct DOUBLE PRECISION NOT NULL DEFAULT 25,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trade_paper_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  initial_cash DOUBLE PRECISION NOT NULL,
  cash_balance DOUBLE PRECISION NOT NULL,
  realized_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
  unrealized_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
  current_equity DOUBLE PRECISION NOT NULL,
  peak_equity DOUBLE PRECISION NOT NULL,
  max_drawdown_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  consecutive_losses INTEGER NOT NULL DEFAULT 0,
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  pause_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trade_paper_positions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES trade_paper_accounts(id) ON DELETE CASCADE,
  signal_id TEXT NOT NULL UNIQUE REFERENCES trade_signals(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  direction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  original_quantity DOUBLE PRECISION NOT NULL,
  remaining_quantity DOUBLE PRECISION NOT NULL,
  average_entry_price DOUBLE PRECISION NOT NULL,
  current_price DOUBLE PRECISION NOT NULL,
  stop_loss DOUBLE PRECISION,
  target_1 DOUBLE PRECISION,
  target_2 DOUBLE PRECISION,
  target_3 DOUBLE PRECISION,
  realized_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
  unrealized_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trade_paper_positions_status_idx
ON trade_paper_positions(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS trade_paper_orders (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES trade_paper_accounts(id) ON DELETE CASCADE,
  signal_id TEXT NOT NULL REFERENCES trade_signals(id) ON DELETE CASCADE,
  position_id TEXT REFERENCES trade_paper_positions(id) ON DELETE SET NULL,
  order_type TEXT NOT NULL,
  side TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'FILLED',
  quantity DOUBLE PRECISION NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  notional DOUBLE PRECISION NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  filled_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS trade_paper_orders_signal_idx
ON trade_paper_orders(signal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS trade_paper_equity_snapshots (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES trade_paper_accounts(id) ON DELETE CASCADE,
  equity DOUBLE PRECISION NOT NULL,
  cash DOUBLE PRECISION NOT NULL,
  realized_pnl DOUBLE PRECISION NOT NULL,
  unrealized_pnl DOUBLE PRECISION NOT NULL,
  drawdown_pct DOUBLE PRECISION NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trade_paper_equity_time_idx
ON trade_paper_equity_snapshots(account_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS trade_signal_alerts (
  id TEXT PRIMARY KEY,
  signal_id TEXT NOT NULL REFERENCES trade_signals(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'INFO',
  price DOUBLE PRECISION,
  message TEXT NOT NULL,
  action_required TEXT NOT NULL DEFAULT '',
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS trade_signal_alerts_open_idx
ON trade_signal_alerts(resolved, created_at DESC);

INSERT INTO trade_risk_settings (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;

INSERT INTO trade_paper_accounts (
  id, name, base_currency, initial_cash, cash_balance, current_equity, peak_equity
) VALUES (
  'default', 'MoonX模拟账户', 'USD', 100000, 100000, 100000, 100000
) ON CONFLICT (id) DO NOTHING;

ALTER TABLE trade_risk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_paper_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_paper_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_paper_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_paper_equity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_signal_alerts ENABLE ROW LEVEL SECURITY;
