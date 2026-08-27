ALTER TABLE trade_bitget_runtime_state
  ADD COLUMN IF NOT EXISTS live_scan_cursor BIGINT NOT NULL DEFAULT 0;
