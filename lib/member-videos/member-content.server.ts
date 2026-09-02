import "server-only";

const MEMBER_VIDEO_SUMMARIES = {
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
