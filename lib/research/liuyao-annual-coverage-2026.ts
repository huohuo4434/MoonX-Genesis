import { listAnnualForecastRoadmaps2026 } from "@/lib/research/annual-forecast-roadmap-2026";

export const LIUYAO_ANNUAL_COVERAGE_VERSION = "2026-08-25.v3" as const;

export type AnnualCoverageRecord = {
  assetId: string;
  assetName: string;
  roleZh: string;
  sourceFile?: string;
  sourceDigest?: string;
  doesNotReplace?: readonly string[];
};

export const BINGWU_2026_CONFIRMED_ANNUAL_READINGS: readonly AnnualCoverageRecord[] = [
  {
    assetId: "btc",
    assetName: "比特币 BTC",
    roleZh: "独立2026流年卦，可作为BTC年度基准。根目录与新课目录为同一份原盘，不重复计数。",
    sourceFile: "比特幣2026年走勢預測，流年卦解析.png",
  },
  {
    assetId: "gold",
    assetName: "黄金",
    roleZh: "独立2026年度卦；语音转写中的年份口误必须以原盘和原视频为准。",
    sourceFile: "2026年黄金大预测.png",
  },
  {
    assetId: "hsi",
    assetName: "恒生指数",
    roleZh: "独立2026年度卦，只负责恒生指数及港股大环境。",
    sourceFile: "2026年恒生指数走势分析 #易经.png",
    doesNotReplace: ["恒生科技", "腾讯"],
  },
  {
    assetId: "a-share-market",
    assetName: "A股大盘",
    roleZh: "独立2026年度卦，只负责A股市场背景。",
    sourceFile: "2026年A股走势分析.png",
    doesNotReplace: ["长鑫科技", "其他A股个股"],
  },
  {
    assetId: "us-market",
    assetName: "美股整体",
    roleZh: "独立2026年度卦，只负责美股大环境和跨资产背景。",
    sourceFile: "美股2026年走势分析，猫腻跟多.png",
    doesNotReplace: ["纳指100", "标普500", "任何单只美股"],
  },
] as const;

export const BINGWU_2026_SUPPLEMENTAL_READINGS: readonly AnnualCoverageRecord[] = [
  {
    assetId: "crypto-black-swan",
    assetName: "币圈黑天鹅风险",
    roleZh: "年度风险专题，只回答重大系统性事件，不构成任何币种的全年价格路径。",
    sourceFile: "26年会出现币圈黑天鹅吗.png",
    doesNotReplace: ["BTC", "ETH", "SOL", "HYPE"],
  },
  {
    assetId: "btc-below-70k",
    assetName: "BTC跌破7万美元",
    roleZh: "截至2026年4月5日的事件卦，用于应期复盘，不是第二张BTC年卦。",
    sourceFile: "比特币26年会跌破7万美元吗.png",
    doesNotReplace: ["BTC年度路径"],
  },
] as const;

const USER_ANNUAL_SOURCE_FILES: Readonly<Record<string, string>> = {
  eth: "eth/2026.jpg", hype: "HYPE/2026.jpg", sol: "SOL/2026.jpg", sp500: "标普500/2026.jpg",
  "nasdaq-100": "纳斯达克100/2026.jpg", silver: "白银/2026.jpg", "wti-crude": "WTI原油/2026.jpg",
  hstech: "恒生科技/2026.jpg", intel: "intel/重新起卦2026年走势.jpg", mu: "MU/2026.jpg", sandisk: "sandisk闪迪/2026.jpg",
  lite: "LITE/2026.jpg", nbis: "NBIS/2026.jpg", googl: "谷歌/2026.jpg", spcx: "SPCX/2026.jpg",
  asteroid: "太空狗/2026.jpg", tencent: "腾讯/2026.jpg", tsla: "特斯拉/2026.jpg", msft: "微软/2026.jpg",
  cxmt: "长鑫/2026年.jpg",
};

export const USER_2026_CONFIRMED_ANNUAL_READINGS: readonly AnnualCoverageRecord[] = listAnnualForecastRoadmaps2026()
  .filter((item) => item.sourceAuthority === "USER_ANNUAL")
  .map((item) => ({
    assetId: item.assetId,
    assetName: `${item.name} ${item.symbol}`,
    roleZh: `${item.sourceHexagram}；已进入2026年度正式上层背景，${item.remainingYearPath}`,
    sourceFile: USER_ANNUAL_SOURCE_FILES[item.assetId],
    sourceDigest: item.sourceDigest,
  }));

export const LIUYAO_2026_CORE_ANNUAL_GAPS: readonly AnnualCoverageRecord[] = [] as const;

export const LIUYAO_2026_LATER_ANNUAL_GAPS: readonly AnnualCoverageRecord[] = [] as const;

export const LIUYAO_2026_TONIGHT_PRIORITY = LIUYAO_2026_LATER_ANNUAL_GAPS;

export const LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY = Object.freeze({
  confirmedTeacherAnnuals: BINGWU_2026_CONFIRMED_ANNUAL_READINGS.length,
  confirmedUserAnnuals: USER_2026_CONFIRMED_ANNUAL_READINGS.length,
  supplementalTopics: BINGWU_2026_SUPPLEMENTAL_READINGS.length,
  coreGaps: LIUYAO_2026_CORE_ANNUAL_GAPS.length,
  laterGaps: LIUYAO_2026_LATER_ANNUAL_GAPS.length,
});
