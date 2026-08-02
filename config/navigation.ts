/**
 * Single source of truth for MOOX public + account navigation.
 * Header, footer, mobile menus, sitemap and audits should derive from this file.
 */

export interface NavItem {
  key: string;
  href: string;
  labelZh: string;
}

export const NAV_ROUTES = {
  home: "/",
  dailyForecasts: "/forecasts/daily",
  todayView: "/#moonx-view",
  tomorrowForecast: "/member/tomorrow",
  tradingSignals: "/member/signals",
  aiTradingDesk: "/member/ai-trading",
  weeklyAnalysis: "/member/weekly",
  monthlyAnalysis: "/member/monthly",
  featuredStocks: "/featured-stocks",
  watchlist: "/markets/watchlist",
  research: "/research",
  researchTechnical: "/research/technical",
  researchLongTerm: "/research/long-term",
  timeline: "/timeline",
  memberStocks: "/member/stocks",
  verification: "/verification",
  methodology: "/methodology",
  pricing: "/pricing",
  support: "/support",
  login: "/login",
  account: "/account",
  accountOrders: "/account/orders",
  admin: "/admin",
  privacy: "/privacy",
  terms: "/terms",
} as const;

/** Old long-horizon/internal routes. Public/member users receive a standard 404. */
export const INTERNAL_LEGACY_ROUTES = [
  "/research",
  "/research/library",
  "/research/pipeline",
  "/research/intelligence-snapshot",
  "/research/verification",
  "/research/technical",
  "/research/long-term",
  "/timeline",
  "/markets/watchlist",
  "/forecasts",
  "/forecasts/daily",
  "/verification/long-term",
] as const;

/** Compact desktop primary nav: the product story, not every route. */
export const PUBLIC_PRIMARY_NAV: NavItem[] = [
  { key: "nav.todayView", href: NAV_ROUTES.todayView, labelZh: "今日" },
  { key: "nav.weeklyAnalysis", href: NAV_ROUTES.weeklyAnalysis, labelZh: "周度" },
  { key: "nav.monthlyAnalysis", href: NAV_ROUTES.monthlyAnalysis, labelZh: "月度" },
  { key: "nav.aiTradingDesk", href: NAV_ROUTES.aiTradingDesk, labelZh: "AI交易公开台" },
  { key: "nav.featuredStocks", href: NAV_ROUTES.featuredStocks, labelZh: "重点关注" },
  { key: "nav.verification", href: NAV_ROUTES.verification, labelZh: "历史验证" },
  { key: "nav.methodology", href: NAV_ROUTES.methodology, labelZh: "方法论" },
];

/** Secondary destinations live under “更多”, preventing header crowding. */
export const PUBLIC_MORE_NAV: NavItem[] = [
  { key: "nav.tradingSignals", href: NAV_ROUTES.tradingSignals, labelZh: "AI交易信号" },
  { key: "nav.pricing", href: NAV_ROUTES.pricing, labelZh: "会员价格" },
  { key: "nav.support", href: NAV_ROUTES.support, labelZh: "客服与帮助" },
];

export const MOBILE_BOTTOM_NAV: NavItem[] = [
  { key: "nav.todayView", href: NAV_ROUTES.todayView, labelZh: "今日" },
  { key: "nav.weeklyAnalysis", href: NAV_ROUTES.weeklyAnalysis, labelZh: "周度" },
  { key: "nav.featuredStocks", href: NAV_ROUTES.featuredStocks, labelZh: "重点" },
  { key: "nav.verification", href: NAV_ROUTES.verification, labelZh: "验证" },
  { key: "nav.login", href: NAV_ROUTES.login, labelZh: "账户" },
];

export function buildPublicPrimaryNav(_options?: { includeMemberStocks?: boolean }): NavItem[] {
  return PUBLIC_PRIMARY_NAV;
}

export function buildPublicFooterColumns(_options?: {
  includeMemberStocks?: boolean;
  signedIn?: boolean;
}): Array<{ titleKey: string; titleZh: string; links: NavItem[] }> {
  const product: NavItem[] = [
    { key: "footer.today", href: NAV_ROUTES.todayView, labelZh: "今日观点" },
    { key: "footer.weekly", href: NAV_ROUTES.weeklyAnalysis, labelZh: "周度行情" },
    { key: "footer.monthly", href: NAV_ROUTES.monthlyAnalysis, labelZh: "月度走势" },
    { key: "footer.aiTrading", href: NAV_ROUTES.aiTradingDesk, labelZh: "AI交易公开台" },
    { key: "footer.featuredStocks", href: NAV_ROUTES.featuredStocks, labelZh: "重点关注" },
    { key: "footer.verification", href: NAV_ROUTES.verification, labelZh: "历史验证" },
    { key: "footer.methodology", href: NAV_ROUTES.methodology, labelZh: "预测方法" },
  ];
  const accountLegal: NavItem[] = [
    { key: "footer.pricing", href: NAV_ROUTES.pricing, labelZh: "会员价格" },
    { key: "footer.contact", href: NAV_ROUTES.support, labelZh: "客服与帮助" },
    { key: "footer.myAccount", href: NAV_ROUTES.account, labelZh: "我的账户" },
    { key: "footer.privacyPolicy", href: NAV_ROUTES.privacy, labelZh: "隐私政策" },
    { key: "footer.termsOfService", href: NAV_ROUTES.terms, labelZh: "服务条款" },
  ];
  return [
    { titleKey: "footer.product", titleZh: "产品", links: product },
    { titleKey: "footer.accountLegal", titleZh: "账户与法律", links: accountLegal },
  ];
}

export const AUDIT_ROUTES = [
  "/", "/login", "/account", "/account/orders", "/pricing", "/support",
  "/methodology", "/member/tomorrow", "/member/weekly", "/member/monthly",
  "/member/ai-trading", "/member/signals", "/featured-stocks", "/verification",
  "/privacy", "/terms", "/admin", "/admin/payments", "/admin/settings",
  "/admin/site-health", "/admin/iching/library", "/admin/iching/rules",
  "/admin/iching/cases", "/admin/iching/validation", ...INTERNAL_LEGACY_ROUTES,
] as const;
