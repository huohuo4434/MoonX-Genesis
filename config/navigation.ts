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

export const PUBLIC_PRIMARY_NAV: NavItem[] = [
  { key: "nav.dailyForecasts", href: NAV_ROUTES.dailyForecasts, labelZh: "每日预测" },
  { key: "nav.focusedAssets", href: NAV_ROUTES.watchlist, labelZh: "重点资产" },
  { key: "nav.research", href: NAV_ROUTES.research, labelZh: "研究" },
  { key: "nav.timeline", href: NAV_ROUTES.timeline, labelZh: "时间线" },
  { key: "nav.pricing", href: NAV_ROUTES.pricing, labelZh: "会员" },
  { key: "nav.account", href: NAV_ROUTES.account, labelZh: "我的账户" },
];

export const MOBILE_BOTTOM_NAV: NavItem[] = [
  { key: "nav.dailyForecasts", href: NAV_ROUTES.dailyForecasts, labelZh: "每日" },
  { key: "nav.focusedAssets", href: NAV_ROUTES.watchlist, labelZh: "重点" },
  { key: "nav.verification", href: NAV_ROUTES.verification, labelZh: "验证" },
  { key: "nav.pricing", href: NAV_ROUTES.pricing, labelZh: "会员" },
  { key: "nav.account", href: NAV_ROUTES.account, labelZh: "账户" },
];

export function buildPublicPrimaryNav(_options?: { includeMemberStocks?: boolean }): NavItem[] {
  return PUBLIC_PRIMARY_NAV;
}

export function buildPublicFooterColumns(options?: {
  includeMemberStocks?: boolean;
  signedIn?: boolean;
}): Array<{ titleKey: string; titleZh: string; links: NavItem[] }> {
  const product = [
    { key: "footer.dailyForecasts", href: NAV_ROUTES.dailyForecasts, labelZh: "每日预测" },
    { key: "footer.focusedAssets", href: NAV_ROUTES.watchlist, labelZh: "重点资产" },
    { key: "footer.research", href: NAV_ROUTES.research, labelZh: "研究" },
    { key: "footer.timeline", href: NAV_ROUTES.timeline, labelZh: "时间线" },
    { key: "footer.verification", href: NAV_ROUTES.verification, labelZh: "历史准确率" },
    { key: "footer.methodology", href: NAV_ROUTES.methodology, labelZh: "预测方法" },
    { key: "footer.pricing", href: NAV_ROUTES.pricing, labelZh: "会员" },
  ];

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
