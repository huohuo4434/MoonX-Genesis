ALTER TABLE trade_bitget_runtime_state
  ADD COLUMN IF NOT EXISTS run_lock_owner TEXT;
