export const STATIC_FOCUS_ASSET_IDS = Object.freeze([
  "ganfeng-lithium",
  "lian-tech",
  "lexin-medical",
  "cxmt",
  "asteroid",
  "sandisk",
  "nbis",
  "mu",
  "hype",
  "sol",
  "eth",
  "btc",
  "googl",
  "msft",
  "tencent",
  "kingsoft-office",
] as const);

export type StaticFocusAssetId = (typeof STATIC_FOCUS_ASSET_IDS)[number];

