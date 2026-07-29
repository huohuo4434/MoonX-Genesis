export const ICHING_ASSET_OPTIONS = [
  "FED",
  "SPX",
  "NASDAQ",
  "BTC",
  "GOLD",
  "WTI",
  "SHCOMP",
  "HSTECH",
  "CHANGXIN",
  "ASTEROID",
  "CUSTOM",
] as const;

export const ICHING_FORECAST_TYPE_OPTIONS = [
  "TODAY",
  "TOMORROW",
  "WEEK",
  "MONTH",
  "THREE_MONTH",
  "HALF_YEAR",
  "YEAR",
  "FIVE_YEAR",
  "CUSTOM",
] as const;

export const ICHING_PRIORITY_OPTIONS = ["HIGHEST", "HIGH", "NORMAL"] as const;

export const ICHING_RESEARCH_STATUS_OPTIONS = [
  "DRAFT",
  "RESEARCH",
  "WAITING_MASTER",
  "MASTER_CONFIRMED",
  "ADOPTED",
  "REJECTED",
  "VERIFIED",
  "ARCHIVED",
] as const;

export const ICHING_SPECIAL_TYPES = [
  "NORMAL",
  "STATIC",
  "SIX_CONFLICT",
  "SIX_HARMONY",
  "WANDERING_SOUL",
  "RETURNING_SOUL",
] as const;

export const ICHING_DIRECTION_ALLOWED = [
  "上涨",
  "下跌",
  "震荡",
  "震荡上涨",
  "震荡下跌",
  "先涨后跌",
  "先跌后涨",
  "冲高回落",
  "探底回升",
] as const;

