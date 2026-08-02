import type { VibeEvidenceAssetId } from "@/types/vibe-evidence";

export type VibeEvidenceAssetConfig = {
  assetId: VibeEvidenceAssetId;
  symbol: string;
  nameZh: string;
  market: "A" | "HK" | "US";
  querySymbol: string;
  benchmarkSymbol: string;
  benchmarkNameZh: string;
  endpoints: string[];
};

export const VIBE_EVIDENCE_ASSETS: VibeEvidenceAssetConfig[] = [
  {
    assetId: "googl",
    symbol: "GOOGL",
    nameZh: "Alphabet",
    market: "US",
    querySymbol: "GOOGL",
    benchmarkSymbol: "NDX",
    benchmarkNameZh: "纳斯达克100指数",
    endpoints: ["/api/global/stock?symbol=GOOGL"],
  },
  {
    assetId: "msft",
    symbol: "MSFT",
    nameZh: "微软",
    market: "US",
    querySymbol: "MSFT",
    benchmarkSymbol: "NDX",
    benchmarkNameZh: "纳斯达克100指数",
    endpoints: ["/api/global/stock?symbol=MSFT"],
  },
  {
    assetId: "tencent",
    symbol: "00700",
    nameZh: "腾讯控股",
    market: "HK",
    querySymbol: "00700",
    benchmarkSymbol: "HSTECH",
    benchmarkNameZh: "恒生科技指数",
    endpoints: ["/api/global/stock?symbol=00700", "/api/global/hk/cashflow?symbol=00700"],
  },
  {
    assetId: "kingsoft-office",
    symbol: "688111",
    nameZh: "金山办公",
    market: "A",
    querySymbol: "688111",
    benchmarkSymbol: "SSE",
    benchmarkNameZh: "上证指数",
    endpoints: [
      "/api/quote?codes=688111",
      "/api/valuation?code=688111",
      "/api/valuation/percentile?code=688111",
      "/api/financials?code=688111",
      "/api/fund-flow?code=688111",
      "/api/margin?code=688111",
      "/api/holders?code=688111",
      "/api/announcements?code=688111",
      "/api/news?code=688111",
      "/api/industry?code=688111",
    ],
  },
  {
    assetId: "mu",
    symbol: "MU",
    nameZh: "美光科技",
    market: "US",
    querySymbol: "MU",
    benchmarkSymbol: "SMH",
    benchmarkNameZh: "半导体ETF",
    endpoints: ["/api/global/stock?symbol=MU"],
  },
  {
    assetId: "cxmt",
    symbol: "688825",
    nameZh: "长鑫科技",
    market: "A",
    querySymbol: "688825",
    benchmarkSymbol: "SSE",
    benchmarkNameZh: "上证指数",
    endpoints: [
      "/api/quote?codes=688825",
      "/api/valuation?code=688825",
      "/api/valuation/percentile?code=688825",
      "/api/financials?code=688825",
      "/api/fund-flow?code=688825",
      "/api/margin?code=688825",
      "/api/holders?code=688825",
      "/api/announcements?code=688825",
      "/api/news?code=688825",
      "/api/industry?code=688825",
    ],
  },
];

export function getVibeAssetConfig(assetId: string): VibeEvidenceAssetConfig | null {
  return VIBE_EVIDENCE_ASSETS.find((item) => item.assetId === assetId) ?? null;
}
