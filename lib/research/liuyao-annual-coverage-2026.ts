export const LIUYAO_ANNUAL_COVERAGE_VERSION = "2026-08-25.v1" as const;

export type AnnualCoverageRecord = {
  assetId: string;
  assetName: string;
  roleZh: string;
  sourceFile?: string;
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

export const LIUYAO_2026_CORE_ANNUAL_GAPS: readonly AnnualCoverageRecord[] = [
  { assetId: "eth", assetName: "以太坊 ETH", roleZh: "老师直播只提到以后可能测，尚未发现完成的2026独立年卦。" },
  { assetId: "ndx", assetName: "纳指100", roleZh: "已有美股整体卦和历史性大跌专题，但没有2026独立年卦。" },
  { assetId: "spx", assetName: "标普500", roleZh: "已有美股整体背景，但没有2026独立年卦。" },
  { assetId: "silver", assetName: "白银", roleZh: "已有三个月材料，但没有2026完整年卦。" },
  { assetId: "wti", assetName: "WTI原油", roleZh: "已有三个月和月度材料，但没有2026完整年卦。" },
  { assetId: "hstech", assetName: "恒生科技", roleZh: "恒生指数年卦只能做背景，不能替代恒生科技。" },
  { assetId: "sol", assetName: "Solana SOL", roleZh: "未发现老师2026独立年卦。" },
  { assetId: "hype", assetName: "HYPE", roleZh: "未发现老师2026独立年卦。" },
] as const;

export const LIUYAO_2026_LATER_ANNUAL_GAPS: readonly AnnualCoverageRecord[] = [
  { assetId: "intc", assetName: "Intel / INTC", roleZh: "重点半导体个股，后续补。" },
  { assetId: "mu", assetName: "美光 / MU", roleZh: "重点存储个股，后续补。" },
  { assetId: "sndk", assetName: "闪迪 / SNDK", roleZh: "已有周月材料，没有独立年卦。" },
  { assetId: "lite", assetName: "LITE", roleZh: "重点光通信个股，后续补。" },
  { assetId: "nbis", assetName: "NBIS", roleZh: "重点AI基础设施个股，后续补。" },
  { assetId: "cxmt", assetName: "长鑫科技 / CXMT", roleZh: "A股年卦只能做背景，不能替代公司年卦。" },
  { assetId: "googl", assetName: "谷歌 / GOOGL", roleZh: "已有半年卦，没有独立年卦。" },
  { assetId: "msft", assetName: "微软 / MSFT", roleZh: "未发现老师2026独立年卦。" },
  { assetId: "tsla", assetName: "特斯拉 / TSLA", roleZh: "未发现老师2026独立年卦。" },
  { assetId: "tencent", assetName: "腾讯", roleZh: "恒生指数年卦只能做背景，不能替代公司年卦。" },
  { assetId: "spcx", assetName: "SPCX", roleZh: "已有半年卦，没有独立年卦。" },
  { assetId: "asteroid", assetName: "太空狗", roleZh: "高波动观察标的，后续补。" },
] as const;

export const LIUYAO_2026_TONIGHT_PRIORITY = LIUYAO_2026_CORE_ANNUAL_GAPS.slice(0, 5);

export const LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY = Object.freeze({
  confirmedTeacherAnnuals: BINGWU_2026_CONFIRMED_ANNUAL_READINGS.length,
  supplementalTopics: BINGWU_2026_SUPPLEMENTAL_READINGS.length,
  coreGaps: LIUYAO_2026_CORE_ANNUAL_GAPS.length,
  laterGaps: LIUYAO_2026_LATER_ANNUAL_GAPS.length,
});
