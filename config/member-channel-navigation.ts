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
  memberNotes: "/member/notes",
  memberUpdates: "/member/updates",
  memberAnnualOutlook: "/member/annual-outlook",
  memberDaily: "/member/daily",
  memberKeyDates: "/member/key-dates",
  memberGann: "/member/gann",
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
  { key: "memberNav.operationDesk", href: NAV_ROUTES.memberChannel, labelZh: "操作台", labelEn: "Trade Plan", groupKey: "overview", groupZh: "交易", groupEn: "Trading" },
  { key: "memberNav.notes", href: NAV_ROUTES.memberNotes, labelZh: "随笔", labelEn: "Notes", groupKey: "tools", groupZh: "内容与服务", groupEn: "Content & Services" },
  { key: "memberNav.videos", href: NAV_ROUTES.memberVideos, labelZh: "会员视频", labelEn: "Videos", groupKey: "tools", groupZh: "内容与服务", groupEn: "Content & Services" },
  { key: "memberNav.review", href: NAV_ROUTES.memberWeeklyReview, labelZh: "复盘", labelEn: "Review", groupKey: "forecast", groupZh: "交易", groupEn: "Trading" },
  { key: "memberNav.services", href: NAV_ROUTES.consultations, labelZh: "会员服务", labelEn: "Services", groupKey: "tools", groupZh: "内容与服务", groupEn: "Content & Services" },
];

export const MEMBER_CHANNEL_NAV = MEMBER_RESEARCH_NAV;

export const MOBILE_BOTTOM_NAV: NavItem[] = [
  { key: "nav.home", href: NAV_ROUTES.home, labelZh: "首页", labelEn: "Home" },
  { key: "memberNav.operationDesk", href: NAV_ROUTES.memberChannel, labelZh: "操作台", labelEn: "Plan" },
  { key: "memberNav.notes", href: NAV_ROUTES.memberNotes, labelZh: "随笔", labelEn: "Notes" },
  { key: "memberNav.review", href: NAV_ROUTES.memberWeeklyReview, labelZh: "复盘", labelEn: "Review" },
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
  const member: NavItem[] = [...MEMBER_RESEARCH_NAV,
    { key: "footer.memberUpdates", href: NAV_ROUTES.memberUpdates, labelZh: "版本公告", labelEn: "Updates" },
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
