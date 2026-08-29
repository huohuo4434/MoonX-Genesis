import "server-only";

const MEMBER_VIDEO_SUMMARIES = {
  "nasdaq-100-historic-drop-window-2026":
    "从卦象结构、时间传导与市场确认条件，梳理纳指100未来十年的主要风险窗口与失效条件。",
  "soxl-two-month-cycle-2026":
    "从风天小畜变风水涣、两重财爻与申酉戌三段月令，拆解8月25日至10月25日的震荡、强势与高波动窗口。",
} as const;

export function getMemberVideoMemberSummary(slug: string): string | null {
  return MEMBER_VIDEO_SUMMARIES[slug as keyof typeof MEMBER_VIDEO_SUMMARIES] ?? null;
}
