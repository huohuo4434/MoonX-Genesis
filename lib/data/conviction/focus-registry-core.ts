export const STATIC_FOCUS_ASSET_IDS = Object.freeze([
  "ganfeng-lithium",
  "lian-tech",
  "lexin-medical",
  "cxmt",
  "asteroid",
  "sandisk",
  "nbis",
  "mu",
  "nvda",
  "hype",
  "sol",
  "eth",
  "btc",
  "googl",
  "msft",
  "tencent",
  "kingsoft-office",
  "tsla",
  "lite",
  "spcx",
  "intel",
  "gold",
  "silver",
  "wti-crude",
] as const);

export type StaticFocusAssetId = (typeof STATIC_FOCUS_ASSET_IDS)[number];

export const RETIRED_STATIC_FOCUS_ASSET_IDS = Object.freeze([
  "ganfeng-lithium",
  "lian-tech",
  "lexin-medical",
  "kingsoft-office",
] as const satisfies readonly StaticFocusAssetId[]);

export type ActiveStaticFocusAssetId = Exclude<
  StaticFocusAssetId,
  (typeof RETIRED_STATIC_FOCUS_ASSET_IDS)[number]
>;

const RETIRED_STATIC_FOCUS_SET = new Set<StaticFocusAssetId>(RETIRED_STATIC_FOCUS_ASSET_IDS);

export const ACTIVE_STATIC_FOCUS_ASSET_IDS: readonly ActiveStaticFocusAssetId[] = Object.freeze(
  STATIC_FOCUS_ASSET_IDS.filter(
    (assetId): assetId is ActiveStaticFocusAssetId => !RETIRED_STATIC_FOCUS_SET.has(assetId)
  )
);

export type MemberAutomationFocusDefinition = {
  assetId: string;
  canonicalSymbol: string | null;
  displayName: string;
  assetClass: "CRYPTO" | "COMMODITY" | "EQUITY" | "ETF";
};

/** Single production mapping for every member focus asset; null means no exact Bitget contract identity. */
export const STATIC_MEMBER_AUTOMATION_FOCUS: Readonly<Record<StaticFocusAssetId, MemberAutomationFocusDefinition>> = Object.freeze({
  "ganfeng-lithium": { assetId: "ganfeng-lithium", canonicalSymbol: null, displayName: "赣锋锂业", assetClass: "EQUITY" },
  "lian-tech": { assetId: "lian-tech", canonicalSymbol: null, displayName: "利安科技", assetClass: "EQUITY" },
  "lexin-medical": { assetId: "lexin-medical", canonicalSymbol: null, displayName: "乐心医疗", assetClass: "EQUITY" },
  cxmt: { assetId: "cxmt", canonicalSymbol: null, displayName: "长鑫科技", assetClass: "EQUITY" },
  asteroid: { assetId: "asteroid", canonicalSymbol: null, displayName: "太空狗", assetClass: "CRYPTO" },
  sandisk: { assetId: "sandisk", canonicalSymbol: "SNDKUSDT", displayName: "闪迪", assetClass: "EQUITY" },
  nbis: { assetId: "nbis", canonicalSymbol: "NBISUSDT", displayName: "Nebius", assetClass: "EQUITY" },
  mu: { assetId: "mu", canonicalSymbol: "MUUSDT", displayName: "美光", assetClass: "EQUITY" },
  nvda: { assetId: "nvda", canonicalSymbol: null, displayName: "英伟达", assetClass: "EQUITY" },
  hype: { assetId: "hype", canonicalSymbol: "HYPEUSDT", displayName: "HYPE", assetClass: "CRYPTO" },
  sol: { assetId: "sol", canonicalSymbol: "SOLUSDT", displayName: "Solana", assetClass: "CRYPTO" },
  eth: { assetId: "eth", canonicalSymbol: "ETHUSDT", displayName: "以太坊", assetClass: "CRYPTO" },
  btc: { assetId: "btc", canonicalSymbol: "BTCUSDT", displayName: "比特币", assetClass: "CRYPTO" },
  googl: { assetId: "googl", canonicalSymbol: "GOOGLUSDT", displayName: "谷歌", assetClass: "EQUITY" },
  msft: { assetId: "msft", canonicalSymbol: "MSFTUSDT", displayName: "微软", assetClass: "EQUITY" },
  tencent: { assetId: "tencent", canonicalSymbol: "TENCENTUSDT", displayName: "腾讯", assetClass: "EQUITY" },
  "kingsoft-office": { assetId: "kingsoft-office", canonicalSymbol: null, displayName: "金山办公", assetClass: "EQUITY" },
  tsla: { assetId: "tsla", canonicalSymbol: "TSLAUSDT", displayName: "特斯拉", assetClass: "EQUITY" },
  lite: { assetId: "lite", canonicalSymbol: "LITEUSDT", displayName: "Lumentum", assetClass: "EQUITY" },
  spcx: { assetId: "spcx", canonicalSymbol: null, displayName: "SpaceX / SPCX", assetClass: "EQUITY" },
  intel: { assetId: "intel", canonicalSymbol: "INTCUSDT", displayName: "英特尔", assetClass: "EQUITY" },
  gold: { assetId: "gold", canonicalSymbol: "XAUTUSDT", displayName: "黄金", assetClass: "COMMODITY" },
  silver: { assetId: "silver", canonicalSymbol: "XAGUSDT", displayName: "白银", assetClass: "COMMODITY" },
  "wti-crude": { assetId: "wti-crude", canonicalSymbol: "CLUSDT", displayName: "WTI原油", assetClass: "COMMODITY" },
});

export function listStaticMemberAutomationFocus(): MemberAutomationFocusDefinition[] {
  return ACTIVE_STATIC_FOCUS_ASSET_IDS.map((assetId) => STATIC_MEMBER_AUTOMATION_FOCUS[assetId]);
}
