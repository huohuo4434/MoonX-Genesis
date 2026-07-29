/**
 * Single source of truth for MoonX public + account navigation.
 * Header, footer, and mobile menus must all use this module.
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
  weeklyAnalysis: "/member/weekly",
  featuredStocks: "/featured-stocks",
  watchlist: "/markets/watchlist",
  research: "/research",
  researchTechnical: "/research/technical",
  researchLongTerm: "/research/long-term",
  timeline: "/timeline",
  /** @deprecated use featuredStocks — kept for redirects / audit */
  memberStocks: "/member/stocks",
  verification: "/verification",
  methodology: "/methodology",
  pricing: "/pricing",
  login: "/login",
  account: "/account",
  accountOrders: "/account/orders",
  admin: "/admin",
  privacy: "/privacy",
  terms: "/terms",
} as const;

/** Old long-horizon routes — public/member must 404; admin may redirect to intelligence. */
export const INTERNAL_LEGACY_ROUTES = [
  "/research/library",
  "/research/pipeline",
  "/research/intelligence-snapshot",
  "/research/verification",
  "/verification/long-term",
] as const;

/** Desktop primary nav — no duplicate meaning columns. */
export const PUBLIC_PRIMARY_NAV: NavItem[] = [
  { key: "nav.todayView", href: NAV_ROUTES.todayView, labelZh: "今日观点" },
  { key: "nav.tomorrowForecast", href: NAV_ROUTES.tomorrowForecast, labelZh: "明日观点" },
  { key: "nav.weeklyAnalysis", href: NAV_ROUTES.weeklyAnalysis, labelZh: "本周行情" },
  { key: "nav.featuredStocks", href: NAV_ROUTES.featuredStocks, labelZh: "重点关注" },
  { key: "nav.verification", href: NAV_ROUTES.verification, labelZh: "历史验证" },
  { key: "nav.pricing", href: NAV_ROUTES.pricing, labelZh: "会员价格" },
];

export const MOBILE_BOTTOM_NAV: NavItem[] = [
  { key: "nav.todayView", href: NAV_ROUTES.todayView, labelZh: "今日" },
  { key: "nav.tomorrowForecast", href: NAV_ROUTES.tomorrowForecast, labelZh: "明日" },
  { key: "nav.featuredStocks", href: NAV_ROUTES.featuredStocks, labelZh: "重点" },
  { key: "nav.verification", href: NAV_ROUTES.verification, labelZh: "验证" },
  { key: "nav.pricing", href: NAV_ROUTES.pricing, labelZh: "会员" },
];

export function buildPublicPrimaryNav(_options?: { includeMemberStocks?: boolean }): NavItem[] {
  return PUBLIC_PRIMARY_NAV;
}

export function buildPublicFooterColumns(options?: {
  includeMemberStocks?: boolean;
  signedIn?: boolean;
}): Array<{ titleKey: string; titleZh: string; links: NavItem[] }> {
  const product: NavItem[] = [
    { key: "footer.todayView", href: NAV_ROUTES.todayView, labelZh: "今日观点" },
    { key: "footer.tomorrowForecast", href: NAV_ROUTES.tomorrowForecast, labelZh: "明日观点" },
    { key: "footer.weeklyAnalysis", href: NAV_ROUTES.weeklyAnalysis, labelZh: "本周行情" },
    { key: "footer.featuredStocks", href: NAV_ROUTES.featuredStocks, labelZh: "重点关注" },
  ];

  const verification: NavItem[] = [
    { key: "footer.verification", href: NAV_ROUTES.verification, labelZh: "历史准确率" },
    { key: "footer.methodology", href: NAV_ROUTES.methodology, labelZh: "方法说明" },
  ];

  const accountLegal: NavItem[] = [
    { key: "footer.myAccount", href: NAV_ROUTES.account, labelZh: "我的账户" },
    { key: "footer.pricing", href: NAV_ROUTES.pricing, labelZh: "会员价格" },
    { key: "footer.privacyPolicy", href: NAV_ROUTES.privacy, labelZh: "隐私政策" },
    { key: "footer.termsOfService", href: NAV_ROUTES.terms, labelZh: "服务条款" },
  ];

  void options;

  return [
    { titleKey: "footer.product", titleZh: "产品", links: product },
    { titleKey: "footer.verificationCol", titleZh: "验证", links: verification },
    { titleKey: "footer.accountLegal", titleZh: "账户与法律", links: accountLegal },
  ];
}

/** Audit + crawl route list (primary surfaces). */
export const AUDIT_ROUTES = [
  "/",
  "/login",
  "/login?next=/pricing",
  "/login?next=/admin",
  "/account",
  "/account/orders",
  "/pricing",
  "/checkout",
  "/forecasts/daily",
  "/member/tomorrow",
  "/member/weekly",
  "/featured-stocks",
  "/markets/watchlist",
  "/research",
  "/research/technical",
  "/research/long-term",
  "/timeline",
  "/featured-stocks/cxmt",
  "/featured-stocks/asteroid",
  "/member/stocks",
  "/member/stocks/688825",
  "/member/stocks/688825/history",
  "/verification",
  "/methodology",
  "/privacy",
  "/terms",
  "/admin",
  "/admin/payments",
  "/admin/settings",
  "/admin/methodology",
  "/admin/social",
  "/admin/forecasts",
  "/admin/weekly",
  "/admin/stocks",
  "/admin/stocks/688825",
  "/admin/conviction",
  "/admin/intelligence",
  "/admin/learning",
  ...INTERNAL_LEGACY_ROUTES,
  "/stocks",
] as const;
