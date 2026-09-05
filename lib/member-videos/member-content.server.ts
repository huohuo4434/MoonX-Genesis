import "server-only";

const MEMBER_VIDEO_SUMMARIES = {
  "musk-ecosystem-september-2026":
    "SPCX的周期机会、特斯拉的修复条件，以及ASTEROID的情绪联动风险。逐一解读火泽睽、革之小过两张事件卦，结合公开公告与9月4日收盘结构，给出后续确认和失效条件。合并传闻未获正式确认；ASTEROID并非公司权益。资料截点：2026年9月5日。",
  "musk-ecosystem-september-2026-en":
    "A conditional outlook for SPCX, Tesla and ASTEROID: two event charts, public disclosures, completed September 4 price data and forward review checkpoints. Merger speculation is not a signed deal. ASTEROID provides no company equity rights. Research cutoff: September 5, 2026. English narration with independently timed English and Chinese subtitle tracks.",
  "nasdaq-100-historic-drop-window-2026":
    "从卦象结构、时间传导与市场确认条件，梳理纳指100未来十年的主要风险窗口与失效条件。",
  "soxl-two-month-cycle-2026":
    "从风天小畜变风水涣、两重财爻与申酉戌三段月令，拆解8月25日至10月25日的震荡、强势与高波动窗口；闪迪补录7月7日专项原课后，9月7日至10月7日改按偏强阶段跟踪，后补偏弱卦保留为分歧风险。",
  "crude-oil-long-cycle-geopolitics-2026":
    "汇总核心六爻三个月主线与丁酉月奇门时机复核：九月偏修复、10月7日至11月7日关注阶段高位，11月7日后留意回落；9月21日后至月底把地缘摩擦与运输受阻作为条件性风险窗口。原油今后退出日内与周度机械预测，只保留长线趋势专题。",
} as const;

export function getMemberVideoMemberSummary(slug: string): string | null {
  return MEMBER_VIDEO_SUMMARIES[slug as keyof typeof MEMBER_VIDEO_SUMMARIES] ?? null;
}

const MUSK_PUBLIC_SOURCES = [
  { title: "SpaceX IPO pricing announcement · June 11", url: "https://content.spacex.com/cms-assets/FINAL_Documents%20and%20Updates/SpaceX_PricingAnnouncement.pdf?embed=true" },
  { title: "Tesla Q2 2026 · SEC 10-Q", url: "https://www.sec.gov/Archives/edgar/data/1318605/000162828026049270/tsla-20260630.htm" },
  { title: "SpaceX Q2 2026 · SEC 10-Q", url: "https://www.sec.gov/Archives/edgar/data/1181412/000162828026052535/spcx-20260630.htm" },
  { title: "Reuters · July 22 merger discussion", url: "https://www.investing.com/news/stock-market-news/musk-keeps-teslaspacex-merger-speculation-alive-cites-growing-overlap-4807344" },
  { title: "Reuters · July 30 China-sale report denial", url: "https://uk.marketscreener.com/news/tesla-weighs-sale-of-china-business-to-pave-way-for-potential-spacex-merger-wsj-reports-ce7f50dbdb8df522" },
  { title: "SpaceX · September 10 conference announcement", url: "https://ir.spacex.com/updates/releases-details/2026/SpaceX-to-Participate-in-the-Goldman-Sachs-Communacopia-and-Technology-Conference-2026-hMRDqGksMV/default.aspx" },
  { title: "SPCX · Historical closing prices", url: "https://stockanalysis.com/stocks/spcx/history/" },
  { title: "TSLA · Historical closing prices", url: "https://stockanalysis.com/stocks/tsla/history/" },
  { title: "ASTEROID · Community disclaimer (not a safety endorsement)", url: "https://asteroideth.com/" },
  { title: "NYSE · Market holidays", url: "https://www.nyse.com/markets/hours-calendars" },
] as const;

export function getMemberVideoSources(slug: string) {
  return slug === "musk-ecosystem-september-2026" || slug === "musk-ecosystem-september-2026-en"
    ? MUSK_PUBLIC_SOURCES : [];
}
