-- Additive only: no status, deadline, equity, risk limit or execution permission is changed.
-- Existing fixed experiments must not silently become active continuous accounts.
ALTER TABLE IF EXISTS trade_bitget_live_experiment
  ADD COLUMN IF NOT EXISTS duration_mode TEXT NOT NULL DEFAULT 'FIXED'
  CHECK (duration_mode IN ('FIXED', 'CONTINUOUS'));
ALTER TABLE IF EXISTS trade_bitget_live_experiment
  ADD COLUMN IF NOT EXISTS entry_epoch_at TIMESTAMPTZ;
