export type MemberVideoRecord = {
  slug: string;
  title: string;
  durationLabel: string;
  publishedAt: string;
  subtitleLanguages: readonly ("zh-CN" | "en")[];
  narrationLanguage?: "zh-CN" | "en";
  alternateSlug?: string;
  alternateOf?: string;
};

export const MEMBER_VIDEO_CATALOG: readonly MemberVideoRecord[] = [
  {
    slug: "nasdaq-100-historic-drop-window-2026",
    title: "纳指100 · 十年周期风险窗口",
    durationLabel: "4分51秒",
    publishedAt: "2026-08-26",
    subtitleLanguages: ["zh-CN"],
  },
  {
    slug: "soxl-two-month-cycle-2026",
    title: "半导体专题 · SOXL强势窗口与闪迪分化",
    durationLabel: "5分24秒",
    publishedAt: "2026-08-31",
    subtitleLanguages: ["zh-CN"],
  },
  {
    slug: "crude-oil-long-cycle-geopolitics-2026",
    title: "原油专题 · 九至十一月趋势与地缘风险",
    durationLabel: "4分02秒",
    publishedAt: "2026-09-02",
    subtitleLanguages: ["zh-CN", "en"],
  },
  {
    slug: "musk-ecosystem-september-2026",
    title: "马斯克生态专题 · SPCX、特斯拉与ASTEROID",
    durationLabel: "10分22秒 · 国语配音",
    publishedAt: "2026-09-05",
    subtitleLanguages: ["zh-CN", "en"],
    narrationLanguage: "zh-CN",
    alternateSlug: "musk-ecosystem-september-2026-en",
  },
  {
    slug: "musk-ecosystem-september-2026-en",
    title: "Musk Ecosystem · SPCX, Tesla & ASTEROID",
    durationLabel: "10m49s · English narration",
    publishedAt: "2026-09-05",
    subtitleLanguages: ["zh-CN", "en"],
    narrationLanguage: "en",
    alternateSlug: "musk-ecosystem-september-2026",
    alternateOf: "musk-ecosystem-september-2026",
  },
];

export const MEMBER_VIDEO_EPISODE_COUNT = MEMBER_VIDEO_CATALOG.filter((video) => !video.alternateOf).length;

export function getMemberVideoRecord(slug: string): MemberVideoRecord | null {
  return MEMBER_VIDEO_CATALOG.find((video) => video.slug === slug) ?? null;
}
