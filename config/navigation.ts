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
  todayView: "/#moonx-view",
  tomorrowForecast: "/member/tomorrow",
  weeklyAnalysis: "/member/weekly",
  featuredStocks: "/featured-stocks",
  memberStocks: "/member/stocks",
  verification: "/verification",
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
  "/research",
  "/research/library",
  "/research/pipeline",
  "/research/intelligence-snapshot",
  "/research/technical",
  "/research/verification",
  "/timeline",
  "/markets/watchlist",
  "/verification/long-term",
  "/forecasts/daily",
] as const;

export const PUBLIC_PRIMARY_NAV: NavItem[] = [
  { key: "nav.todayView", href: NAV_ROUTES.todayView, labelZh: "今日观点" },
  { key: "nav.tomorrowForecast", href: NAV_ROUTES.tomorrowForecast, labelZh: "明日观点" },
  { key: "nav.weeklyAnalysis", href: NAV_ROUTES.weeklyAnalysis, labelZh: "本周行情" },
  { key: "nav.featuredStocks", href: NAV_ROUTES.featuredStocks, labelZh: "Featured Stocks" },
  { key: "nav.memberStocks", href: NAV_ROUTES.memberStocks, labelZh: "会员个股" },
  { key: "nav.verification", href: NAV_ROUTES.verification, labelZh: "历史准确率" },
  { key: "nav.pricing", href: NAV_ROUTES.pricing, labelZh: "会员价格" },
  { key: "nav.account", href: NAV_ROUTES.account, labelZh: "我的账户" },
];

export const MOBILE_BOTTOM_NAV: NavItem[] = [
  { key: "nav.todayView", href: NAV_ROUTES.todayView, labelZh: "今日" },
  { key: "nav.tomorrowForecast", href: NAV_ROUTES.tomorrowForecast, labelZh: "明日" },
  { key: "nav.weeklyAnalysis", href: NAV_ROUTES.weeklyAnalysis, labelZh: "本周" },
  { key: "nav.verification", href: NAV_ROUTES.verification, labelZh: "验证" },
  { key: "nav.account", href: NAV_ROUTES.account, labelZh: "账户" },
];

export function buildPublicPrimaryNav(options?: { includeMemberStocks?: boolean }): NavItem[] {
  const includeStocks = options?.includeMemberStocks !== false;
  return PUBLIC_PRIMARY_NAV.filter((item) => includeStocks || item.href !== NAV_ROUTES.memberStocks);
}

export function buildPublicFooterColumns(options?: {
  includeMemberStocks?: boolean;
  signedIn?: boolean;
}): Array<{ titleKey: string; titleZh: string; links: NavItem[] }> {
  const includeStocks = options?.includeMemberStocks !== false;
  const product = [
    { key: "footer.todaysIntelligence", href: NAV_ROUTES.todayView, labelZh: "今日观点" },
    { key: "footer.tomorrow", href: NAV_ROUTES.tomorrowForecast, labelZh: "明日观点" },
    { key: "footer.weeklyAnalysis", href: NAV_ROUTES.weeklyAnalysis, labelZh: "本周行情" },
    { key: "footer.featuredStocks", href: NAV_ROUTES.featuredStocks, labelZh: "Featured Stocks" },
    { key: "footer.memberStocks", href: NAV_ROUTES.memberStocks, labelZh: "会员个股" },
    { key: "footer.verification", href: NAV_ROUTES.verification, labelZh: "历史准确率" },
    { key: "footer.pricing", href: NAV_ROUTES.pricing, labelZh: "会员价格" },
  ].filter((item) => includeStocks || item.href !== NAV_ROUTES.memberStocks);

  const account: NavItem[] = [
    { key: "footer.myAccount", href: NAV_ROUTES.account, labelZh: "我的账户" },
    { key: "footer.myOrders", href: NAV_ROUTES.accountOrders, labelZh: "我的订单" },
    options?.signedIn
      ? { key: "footer.signOut", href: NAV_ROUTES.account, labelZh: "退出" }
      : { key: "footer.signIn", href: NAV_ROUTES.login, labelZh: "登录／退出" },
  ];

  return [
    { titleKey: "footer.product", titleZh: "产品", links: product },
    { titleKey: "footer.account", titleZh: "账户", links: account },
    {
      titleKey: "footer.legal",
      titleZh: "法律",
      links: [
        { key: "footer.privacyPolicy", href: NAV_ROUTES.privacy, labelZh: "隐私政策" },
        { key: "footer.termsOfService", href: NAV_ROUTES.terms, labelZh: "服务条款" },
      ],
    },
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
  "/member/tomorrow",
  "/member/weekly",
  "/featured-stocks",
  "/member/stocks",
  "/member/stocks/688825",
  "/member/stocks/688825/history",
  "/verification",
  "/privacy",
  "/terms",
  "/admin",
  "/admin/payments",
  "/admin/settings",
  "/admin/forecasts",
  "/admin/weekly",
  "/admin/stocks",
  "/admin/stocks/688825",
  "/admin/intelligence",
  "/admin/learning",
  ...INTERNAL_LEGACY_ROUTES,
  "/stocks",
] as const;
