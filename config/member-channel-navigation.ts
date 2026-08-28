/**
 * V7.20.7 app-shell navigation on top of the V7.20.4.2 isolated member-channel catalogue.
 *
 * This module deliberately does NOT replace config/navigation.ts. The current
 * project may contain newer routes or hand-edited work there. Header, footer,
 * member-channel dropdown and mobile shortcuts use this isolated catalogue,
 * while the existing navigation source remains byte-for-byte unchanged.
 */

export type NavGroupKey = "overview" | "forecast" | "recommendation" | "tools" | "experiment";

export interface NavItem {
  key: string;
  href: string;
  labelZh: string;
  labelEn?: string;
  groupKey?: NavGroupKey;
  groupZh?: string;
  groupEn?: string;
  experimental?: boolean;
}

export const NAV_ROUTES = {
  home: "/",
  guide: "/guide",
  memberChannel: "/member",
  memberVideos: "/member/videos",
  memberAnnualOutlook: "/member/annual-outlook",
  memberDaily: "/member/daily",
  memberDailyReview: "/member/daily-review",
  memberWeeklyReview: "/member/weekly-review",
  memberWeeklyReport: "/member/weekly-report",
  memberSectorResonance: "/member/sector-resonance",
  memberStockPicks: "/member/stock-picks",
  memberCryptoPicks: "/member/crypto-picks",
  tomorrowForecast: "/member/tomorrow",
  weeklyAnalysis: "/member/weekly",
  monthlyAnalysis: "/member/monthly",
  earlyAltcoinRadar: "/member/early-altcoin-radar",
  aiTradingDesk: "/member/ai-trading",
  strategyCenter: "/member/strategy",
  technicalMethods: "/member/technical-methods",
  marketStructure: "/member/market-structure",
  multiView: "/member/alpha-feed",
  consultations: "/member/consultations",
  verification: "/verification",
  methodology: "/methodology",
  pricing: "/pricing",
  support: "/support",
  account: "/account",
  privacy: "/privacy",
  terms: "/terms",
} as const;

export const PUBLIC_PRIMARY_NAV: NavItem[] = [
  { key: "nav.home", href: NAV_ROUTES.home, labelZh: "首页", labelEn: "Home" },
  { key: "nav.guide", href: NAV_ROUTES.guide, labelZh: "新手指南", labelEn: "Guide" },
  { key: "nav.verification", href: NAV_ROUTES.verification, labelZh: "历史验证", labelEn: "Verification" },
  { key: "nav.pricing", href: NAV_ROUTES.pricing, labelZh: "会员价格", labelEn: "Pricing" },
];

export const PUBLIC_MORE_NAV: NavItem[] = [];

export const MEMBER_RESEARCH_NAV: NavItem[] = [
  {
    key: "memberNav.channel",
    href: NAV_ROUTES.memberChannel,
    labelZh: "会员频道首页",
    labelEn: "Member Channel",
    groupKey: "overview",
    groupZh: "会员总览",
    groupEn: "Overview",
  },
  {
    key: "memberNav.videos",
    href: NAV_ROUTES.memberVideos,
    labelZh: "会员视频",
    labelEn: "Member Videos",
    groupKey: "overview",
    groupZh: "会员总览",
    groupEn: "Overview",
  },
  {
    key: "memberNav.annualOutlook",
    href: NAV_ROUTES.memberAnnualOutlook,
    labelZh: "2026年度路线",
    labelEn: "2026 Annual Outlook",
    groupKey: "forecast",
    groupZh: "市场预测",
    groupEn: "Forecasts",
  },
  {
    key: "memberNav.daily",
    href: NAV_ROUTES.memberDaily,
    labelZh: "会员日报",
    labelEn: "Daily Report",
    groupKey: "forecast",
    groupZh: "市场预测",
    groupEn: "Forecasts",
  },
  {
    key: "memberNav.weeklyReview",
    href: NAV_ROUTES.memberWeeklyReview,
    labelZh: "周预测复盘",
    labelEn: "Weekly Forecast Review",
    groupKey: "forecast",
    groupZh: "市场预测",
    groupEn: "Forecasts",
  },
  {
    key: "memberNav.weeklyForecast",
    href: NAV_ROUTES.weeklyAnalysis,
    labelZh: "会员周走势预测",
    labelEn: "Weekly Outlook",
    groupKey: "forecast",
    groupZh: "市场预测",
    groupEn: "Forecasts",
  },
  {
    key: "memberNav.monthlyForecast",
    href: NAV_ROUTES.monthlyAnalysis,
    labelZh: "会员月走势预测",
    labelEn: "Monthly Outlook",
    groupKey: "forecast",
    groupZh: "市场预测",
    groupEn: "Forecasts",
  },
  {
    key: "memberNav.sectorResonance",
    href: NAV_ROUTES.memberSectorResonance,
    labelZh: "板块共振分析",
    labelEn: "Sector Resonance",
    groupKey: "forecast",
    groupZh: "市场预测",
    groupEn: "Forecasts",
  },
  {
    key: "memberNav.weeklyReport",
    href: NAV_ROUTES.memberWeeklyReport,
    labelZh: "会员周报",
    labelEn: "Weekly Report",
    groupKey: "forecast",
    groupZh: "市场预测",
    groupEn: "Forecasts",
  },
  {
    key: "memberNav.stockPicks",
    href: NAV_ROUTES.memberStockPicks,
    labelZh: "会员股票研究",
    labelEn: "Member Stock Research",
    groupKey: "recommendation",
    groupZh: "专享推荐",
    groupEn: "Recommendations",
  },
  {
    key: "memberNav.cryptoPicks",
    href: NAV_ROUTES.memberCryptoPicks,
    labelZh: "会员专享加密货币推荐",
    labelEn: "Member Crypto Picks",
    groupKey: "recommendation",
    groupZh: "专享推荐",
    groupEn: "Recommendations",
  },
  {
    key: "memberNav.technicalMethods",
    href: NAV_ROUTES.technicalMethods,
    labelZh: "会员缠论数据",
    labelEn: "Chan Structure Data",
    groupKey: "tools",
    groupZh: "交易与服务",
    groupEn: "Tools & Services",
  },
  {
    key: "memberNav.quantTrading",
    href: NAV_ROUTES.aiTradingDesk,
    labelZh: "会员量化交易系统",
    labelEn: "Quant Trading System",
    groupKey: "tools",
    groupZh: "交易与服务",
    groupEn: "Tools & Services",
  },
  {
    key: "memberNav.strategyCenter",
    href: NAV_ROUTES.strategyCenter,
    labelZh: "策略中心",
    labelEn: "Strategy Center",
    groupKey: "tools",
    groupZh: "交易与服务",
    groupEn: "Tools & Services",
  },
  {
    key: "memberNav.consultations",
    href: NAV_ROUTES.consultations,
    labelZh: "会员卜卦系统",
    labelEn: "Member Divination",
    groupKey: "tools",
    groupZh: "交易与服务",
    groupEn: "Tools & Services",
  },
  {
    key: "memberNav.earlyAltcoinRadar",
    href: NAV_ROUTES.earlyAltcoinRadar,
    labelZh: "山寨币雷达",
    labelEn: "Altcoin Radar",
    groupKey: "experiment",
    groupZh: "实验功能",
    groupEn: "Experimental",
    experimental: true,
  },
  {
    key: "memberNav.marketStructure",
    href: NAV_ROUTES.marketStructure,
    labelZh: "多源K线",
    labelEn: "Multi-source Candles",
    groupKey: "experiment",
    groupZh: "实验功能",
    groupEn: "Experimental",
    experimental: true,
  },
  {
    key: "memberNav.multiView",
    href: NAV_ROUTES.multiView,
    labelZh: "多方观点",
    labelEn: "Multi-View",
    groupKey: "experiment",
    groupZh: "实验功能",
    groupEn: "Experimental",
    experimental: true,
  },
];

export const MEMBER_CHANNEL_NAV = MEMBER_RESEARCH_NAV;

export const MOBILE_BOTTOM_NAV: NavItem[] = [
  { key: "nav.home", href: NAV_ROUTES.home, labelZh: "首页", labelEn: "Home" },
  { key: "memberNav.channel", href: NAV_ROUTES.memberChannel, labelZh: "研究", labelEn: "Research" },
  { key: "memberNav.quantTrading", href: NAV_ROUTES.aiTradingDesk, labelZh: "交易", labelEn: "Trade" },
  { key: "memberNav.strategyCenter", href: NAV_ROUTES.strategyCenter, labelZh: "策略", labelEn: "Strategy" },
  { key: "nav.account", href: NAV_ROUTES.account, labelZh: "我的", labelEn: "Account" },
];

export function buildPublicPrimaryNav(_options?: { includeMemberStocks?: boolean }): NavItem[] {
  return PUBLIC_PRIMARY_NAV;
}

export function buildPublicFooterColumns(_options?: {
  includeMemberStocks?: boolean;
  signedIn?: boolean;
}): Array<{ titleKey: string; titleZh: string; links: NavItem[] }> {
  const product: NavItem[] = [
    { key: "footer.home", href: NAV_ROUTES.home, labelZh: "首页", labelEn: "Home" },
    { key: "footer.guide", href: NAV_ROUTES.guide, labelZh: "新手指南", labelEn: "Guide" },
    { key: "footer.verification", href: NAV_ROUTES.verification, labelZh: "历史验证", labelEn: "Verification" },
    { key: "footer.pricing", href: NAV_ROUTES.pricing, labelZh: "会员价格", labelEn: "Pricing" },
    { key: "footer.memberChannel", href: NAV_ROUTES.memberChannel, labelZh: "会员频道", labelEn: "Member Channel" },
  ];
  const member: NavItem[] = [
    { key: "footer.memberAnnual", href: NAV_ROUTES.memberAnnualOutlook, labelZh: "年度路线", labelEn: "Annual Outlook" },
    { key: "footer.memberDaily", href: NAV_ROUTES.memberDaily, labelZh: "会员日报", labelEn: "Daily Report" },
    { key: "footer.memberWeeklyReview", href: NAV_ROUTES.memberWeeklyReview, labelZh: "周预测复盘", labelEn: "Weekly Forecast Review" },
    { key: "footer.memberWeekly", href: NAV_ROUTES.weeklyAnalysis, labelZh: "周走势预测", labelEn: "Weekly Outlook" },
    { key: "footer.memberStrategy", href: NAV_ROUTES.strategyCenter, labelZh: "策略中心", labelEn: "Strategy Center" },
    { key: "footer.memberMonthly", href: NAV_ROUTES.monthlyAnalysis, labelZh: "月走势预测", labelEn: "Monthly Outlook" },
    { key: "footer.memberSectorResonance", href: NAV_ROUTES.memberSectorResonance, labelZh: "板块共振", labelEn: "Sector Resonance" },
    { key: "footer.memberPicks", href: NAV_ROUTES.memberStockPicks, labelZh: "股票研究", labelEn: "Stock Research" },
    { key: "footer.memberConsult", href: NAV_ROUTES.consultations, labelZh: "会员卜卦", labelEn: "Divination" },
  ];
  const accountLegal: NavItem[] = [
    { key: "footer.contact", href: NAV_ROUTES.support, labelZh: "客服与帮助", labelEn: "Support" },
    { key: "footer.myAccount", href: NAV_ROUTES.account, labelZh: "我的账户", labelEn: "My Account" },
    { key: "footer.privacyPolicy", href: NAV_ROUTES.privacy, labelZh: "隐私政策", labelEn: "Privacy" },
    { key: "footer.termsOfService", href: NAV_ROUTES.terms, labelZh: "服务条款", labelEn: "Terms" },
  ];
  return [
    { titleKey: "footer.product", titleZh: "导航", links: product },
    { titleKey: "footer.member", titleZh: "会员频道", links: member },
    { titleKey: "footer.accountLegal", titleZh: "账户与法律", links: accountLegal },
  ];
}
