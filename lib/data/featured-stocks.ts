/**
 * Curated Featured Stocks — hard cap 5.
 * Adjust only when long-term thesis changes.
 */
import type { FeaturedMemberForecastLock, FeaturedStock } from "@/types/featured-stock";

export const FEATURED_STOCKS_MAX = 5;

export const FEATURED_STOCKS: FeaturedStock[] = [
  {
    id: "changxin-688825",
    name: "长鑫科技",
    nameEn: "Changxin Memory",
    symbol: "688825",
    marketLabel: "SSE STAR",
    convictionStars: 5,
    tags: ["AI Memory", "HBM", "DDR5", "China", "国产替代"],
    whyWatch: [
      "中国存储产业的重要企业",
      "AI时代HBM需求持续增长",
      "国产替代长期受益",
      "存储产业景气周期受益者",
      "MOOX长期重点跟踪",
    ],
    thesisScores: [
      { label: "长期逻辑", stars: 5 },
      { label: "成长空间", stars: 5 },
      { label: "行业景气", stars: 5 },
      { label: "政策支持", stars: 4 },
      { label: "风险", stars: 3 },
    ],
    catalysts: ["AI服务器需求", "HBM产业链", "DDR5需求", "国产存储替代", "新产品及扩产"],
    longTermRating: "A+",
    ratingNote: "长期重点观察",
    memberDetailHref: "/member/stocks/688825",
    research: {
      lastUpdated: "2026-07-28",
      researchCount: 14,
      historicalAccuracyLabel: "样本积累中",
    },
  },
  {
    id: "asteroid",
    name: "Asteroid",
    symbol: "ASTEROID",
    marketLabel: "Crypto · Micro Cap",
    convictionStars: 4,
    tags: ["Micro Cap", "Community", "High Risk"],
    whyWatch: [
      "当前市值约2600万美元左右",
      "小市值，高弹性",
      "社区驱动项目",
      "若生态持续发展，仍具备较大弹性空间",
      "MOOX列入长期观察名单",
    ],
    thesisScores: [
      { label: "成长空间", stars: 5 },
      { label: "风险", stars: 5 },
      { label: "社区活跃", stars: 4 },
      { label: "长期潜力", stars: 4 },
    ],
    catalysts: ["社区增长", "新生态上线", "新合作", "CEX上线", "市场情绪"],
    longTermRating: "A-",
    ratingNote: "长期观察",
    research: {
      lastUpdated: "2026-08-06",
      researchCount: 8,
      historicalAccuracyLabel: "样本积累中",
    },
  },
];

if (FEATURED_STOCKS.length > FEATURED_STOCKS_MAX) {
  throw new Error(`Featured Stocks hard cap is ${FEATURED_STOCKS_MAX}`);
}

export const FEATURED_MEMBER_LOCKS: FeaturedMemberForecastLock[] = [
  { key: "today", labelZh: "今日预测", labelEn: "Today Forecast" },
  { key: "tomorrow", labelZh: "明日预测", labelEn: "Tomorrow Forecast" },
  { key: "weekly", labelZh: "本周走势", labelEn: "Weekly Path" },
  { key: "1m", labelZh: "一个月走势", labelEn: "1-Month Outlook" },
  { key: "3m", labelZh: "三个月走势", labelEn: "3-Month Outlook" },
  { key: "1y", labelZh: "一年走势", labelEn: "1-Year Outlook" },
  { key: "5y", labelZh: "五年走势", labelEn: "5-Year Outlook" },
  { key: "ai", labelZh: "AI分析", labelEn: "AI Analysis" },
  { key: "liuyao", labelZh: "六爻分析", labelEn: "Liu Yao Analysis" },
  { key: "wave", labelZh: "波浪分析", labelEn: "Wave Analysis" },
  { key: "score", labelZh: "综合评分", labelEn: "Composite Score" },
  { key: "window", labelZh: "时间窗口", labelEn: "Time Window" },
  { key: "support", labelZh: "关键支撑位", labelEn: "Key Support" },
  { key: "resistance", labelZh: "关键压力位", labelEn: "Key Resistance" },
  { key: "invalidation", labelZh: "失效位", labelEn: "Invalidation" },
  { key: "path", labelZh: "路径预测", labelEn: "Path Forecast" },
];

export function listFeaturedStocks(): FeaturedStock[] {
  return FEATURED_STOCKS.slice(0, FEATURED_STOCKS_MAX);
}

export function starsDisplay(n: FeaturedStock["convictionStars"] | number): string {
  const filled = Math.max(1, Math.min(5, Math.round(n)));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}
