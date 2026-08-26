export type MemberVideoRecord = {
  slug: string;
  title: string;
  durationLabel: string;
  publishedAt: string;
};

export const MEMBER_VIDEO_CATALOG: readonly MemberVideoRecord[] = [
  {
    slug: "nasdaq-100-historic-drop-window-2026",
    title: "纳指100 · 十年周期风险窗口",
    durationLabel: "4分51秒",
    publishedAt: "2026-08-26",
  },
];

export function getMemberVideoRecord(slug: string): MemberVideoRecord | null {
  return MEMBER_VIDEO_CATALOG.find((video) => video.slug === slug) ?? null;
}
