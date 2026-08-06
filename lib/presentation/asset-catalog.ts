export type AssetPresentation = {
  assetId: string;
  nameZh: string;
  /** Stable application/database code. */
  symbol: string;
  /** Public symbol. Keep this equal to the stable code for core markets. */
  displaySymbol: string;
  venue: string;
  marketLabel: string;
  aliases: string[];
};

export const ASSET_PRESENTATIONS: AssetPresentation[] = [
  { assetId: "bitcoin", nameZh: "比特币", symbol: "BTC", displaySymbol: "BTC", venue: "全球加密市场", marketLabel: "加密资产", aliases: ["BTCUSDT", "BTC-USD"] },
  { assetId: "eth", nameZh: "以太坊", symbol: "ETH", displaySymbol: "ETH", venue: "全球加密市场", marketLabel: "加密资产", aliases: ["ETHUSDT", "ETH-USD"] },
  { assetId: "sp500", nameZh: "标普500指数", symbol: "SPX", displaySymbol: "SPX", venue: "美国指数市场", marketLabel: "美国指数", aliases: ["^GSPC", "GSPC", "SPY", "SPYUSDT"] },
  { assetId: "nasdaq-100", nameZh: "纳斯达克100指数", symbol: "NDX", displaySymbol: "NDX", venue: "美国指数市场", marketLabel: "美国指数", aliases: ["^NDX", "QQQ", "QQQUSDT"] },
  { assetId: "shanghai-composite", nameZh: "上证指数", symbol: "SHCOMP", displaySymbol: "SHCOMP", venue: "上海证券交易所", marketLabel: "A股指数", aliases: ["000001.SS", "SSEC", "SSE"] },
  { assetId: "hang-seng", nameZh: "恒生科技指数", symbol: "HSTECH", displaySymbol: "HSTECH", venue: "香港交易所", marketLabel: "港股指数", aliases: ["HSTECH.HK"] },
  {
    assetId: "gold",
    nameZh: "国际金价",
    symbol: "GOLD",
    displaySymbol: "GOLD",
    venue: "COMEX黄金期货",
    marketLabel: "贵金属",
    aliases: ["GLD", "GC", "GC=F", "XAU", "XAUUSD", "XAUT", "XAUTUSDT", "Gold"],
  },
  {
    assetId: "silver",
    nameZh: "国际银价",
    symbol: "SILVER",
    displaySymbol: "SILVER",
    venue: "COMEX白银期货",
    marketLabel: "贵金属",
    aliases: ["SI", "SI=F", "SLV", "XAG", "XAGUSD", "XAGUSDT"],
  },
  {
    assetId: "wti-crude",
    nameZh: "WTI原油",
    symbol: "WTI",
    displaySymbol: "WTI",
    venue: "NYMEX原油期货",
    marketLabel: "能源商品",
    aliases: ["CL", "CL=F", "CLUSDT", "WTIUSD", "USOIL"],
  },
  { assetId: "changxin-memory", nameZh: "长鑫科技", symbol: "688825", displaySymbol: "688825", venue: "上海证券交易所科创板", marketLabel: "股票", aliases: ["688825.SS"] },
  { assetId: "micron", nameZh: "美光科技", symbol: "MU", displaySymbol: "MU", venue: "纳斯达克证券交易所", marketLabel: "股票", aliases: ["MUUSDT"] },
  { assetId: "sandisk", nameZh: "闪迪", symbol: "SNDK", displaySymbol: "SNDK", venue: "纳斯达克证券交易所", marketLabel: "股票", aliases: ["SanDisk", "Sandisk", "闪迪", "闪迪科技"] },
  { assetId: "alphabet", nameZh: "Alphabet · 谷歌母公司", symbol: "GOOGL", displaySymbol: "GOOGL", venue: "纳斯达克证券交易所", marketLabel: "股票", aliases: ["GOOG", "GOOGLUSDT", "Google", "谷歌", "Alphabet Inc."] },
  { assetId: "microsoft", nameZh: "微软", symbol: "MSFT", displaySymbol: "MSFT", venue: "纳斯达克证券交易所", marketLabel: "股票", aliases: ["Microsoft"] },
  { assetId: "tencent", nameZh: "腾讯控股", symbol: "00700", displaySymbol: "00700", venue: "香港交易所", marketLabel: "股票", aliases: ["0700.HK", "700.HK", "Tencent", "腾讯"] },
  { assetId: "kingsoft-office", nameZh: "金山办公", symbol: "688111", displaySymbol: "688111", venue: "上海证券交易所科创板", marketLabel: "股票", aliases: ["688111.SS", "WPS"] },
  { assetId: "hype", nameZh: "HYPE", symbol: "HYPE", displaySymbol: "HYPE", venue: "Hyperliquid", marketLabel: "加密资产", aliases: ["HYPEUSDT"] },
  { assetId: "asteroid", nameZh: "Asteroid（太空狗）", symbol: "ASTEROID", displaySymbol: "ASTEROID", venue: "以太坊链上市场", marketLabel: "加密资产", aliases: ["太空狗", "Asteroid"] },
];

function normalized(value: string): string {
  return value.trim().toUpperCase().replace(/[\s_\-/]/g, "");
}

export function getAssetPresentation(value: string): AssetPresentation | null {
  const key = normalized(value);
  return ASSET_PRESENTATIONS.find((item) =>
    [item.assetId, item.symbol, item.displaySymbol, ...item.aliases].some(
      (candidate) => normalized(candidate) === key
    )
  ) ?? null;
}

export function canonicalAssetCode(value: string): string {
  return getAssetPresentation(value)?.symbol ?? value.trim().toUpperCase();
}

export function canonicalAssetId(value: string): string {
  return getAssetPresentation(value)?.assetId ?? value.trim().toLowerCase();
}

export function assetVenue(value: string, fallback = "市场数据源"): string {
  return getAssetPresentation(value)?.venue ?? fallback;
}

export function assetDisplayName(value: string, fallback?: string): string {
  return getAssetPresentation(value)?.nameZh ?? fallback ?? value;
}

export function assetDisplaySymbol(value: string): string {
  return getAssetPresentation(value)?.displaySymbol ?? value;
}
