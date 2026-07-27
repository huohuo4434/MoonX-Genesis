/**
 * Single source of truth for site navigation hrefs.
 * Header, footer, and mobile menus must import from here.
 */

export interface NavItem {
  key: string;
  href: string;
}

export const routes = {
  home: "/",
  todayView: "/#moonx-view",
  tomorrowForecast: "/member/tomorrow",
  forecasts: "/forecasts",
  forecastsDaily: "/forecasts/daily",
  research: "/research",
  researchLibrary: "/research/library",
  researchPipeline: "/research/pipeline",
  researchVerification: "/research#verification",
  intelligenceSnapshot: "/research/intelligence-snapshot",
  watchlist: "/markets/watchlist",
  timeline: "/timeline",
  pricing: "/pricing",
  technical: "/research/technical",
  memberPreview: "/member-preview",
} as const;

export const primaryNav: NavItem[] = [
  { key: "nav.home", href: routes.home },
  { key: "nav.todayView", href: routes.todayView },
  { key: "nav.tomorrowForecast", href: routes.tomorrowForecast },
  { key: "nav.forecasts", href: routes.forecasts },
  { key: "nav.researchLibrary", href: routes.researchLibrary },
  { key: "nav.watchlist", href: routes.watchlist },
  { key: "nav.verification", href: routes.researchVerification },
];

export const moreNav: NavItem[] = [
  { key: "nav.research", href: routes.research },
  { key: "nav.timeline", href: routes.timeline },
  { key: "nav.pricing", href: routes.pricing },
  { key: "nav.technical", href: routes.technical },
];

export const footerColumns: Array<{ titleKey: string; links: NavItem[] }> = [
  {
    titleKey: "footer.product",
    links: [
      { key: "footer.todaysIntelligence", href: routes.todayView },
      { key: "footer.forecasts", href: routes.forecastsDaily },
      { key: "footer.researchIntelligence", href: routes.research },
      { key: "footer.intelligenceSnapshot", href: routes.intelligenceSnapshot },
      { key: "footer.researchLibrary", href: routes.researchLibrary },
      { key: "footer.watchlist", href: routes.watchlist },
      { key: "footer.pricing", href: routes.pricing },
    ],
  },
  {
    titleKey: "footer.company",
    links: [{ key: "footer.latestResearch", href: "/#latest-research" }],
  },
  {
    titleKey: "footer.resources",
    links: [
      { key: "footer.methodology", href: routes.researchPipeline },
      { key: "footer.researchPipeline", href: routes.researchPipeline },
      { key: "footer.timeline", href: routes.timeline },
      { key: "footer.verification", href: routes.researchVerification },
    ],
  },
  {
    titleKey: "footer.legal",
    links: [
      { key: "footer.privacyPolicy", href: "#" },
      { key: "footer.termsOfService", href: "#" },
    ],
  },
];
