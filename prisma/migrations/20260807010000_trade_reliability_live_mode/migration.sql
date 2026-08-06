-- V6.4.1: allow the reliability state to describe either UTA V3 Demo or UTA V3 Live.
-- This changes constraints only; no table, row, order, position, or audit history is deleted.
ALTER TABLE trade_reliability_state
  DROP CONSTRAINT IF EXISTS trade_reliability_api_mode_check,
  DROP CONSTRAINT IF EXISTS trade_reliability_paper_check,
  DROP CONSTRAINT IF EXISTS trade_reliability_real_lock_check;

ALTER TABLE trade_reliability_state
  ADD CONSTRAINT trade_reliability_api_mode_check
    CHECK (api_mode IN ('UTA_V3_DEMO','UTA_V3_LIVE')),
  ADD CONSTRAINT trade_reliability_paper_check
    CHECK (
      (api_mode='UTA_V3_DEMO' AND paptrading_required=TRUE) OR
      (api_mode='UTA_V3_LIVE' AND paptrading_required=FALSE)
    ),
  ADD CONSTRAINT trade_reliability_real_lock_check
    CHECK (
      (api_mode='UTA_V3_DEMO' AND real_trading_locked=TRUE) OR
      (api_mode='UTA_V3_LIVE' AND real_trading_locked=FALSE)
    );
