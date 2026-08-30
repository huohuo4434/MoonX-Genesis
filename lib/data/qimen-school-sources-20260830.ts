export type QimenMethodLearningStatus =
  | "ADOPT_METHOD_GUARD"
  | "FORWARD_RESEARCH_ONLY"
  | "CASE_NOTE_ONLY";

export const GOLDEN_RABBIT_20260830_SOURCE = Object.freeze({
  sourceId: "GOLDEN_RABBIT_LIVE_20260830",
  receivedAt: "2026-08-30T18:26:08+08:00",
  materialKind: "USER_SUPPLIED_TRANSCRIPT_AND_FRAMES",
  transcript: {
    fileName: "开挂的金兔子Luna直播.txt",
    sha256: "9391BFC257ED7D2E25FB5DF891368B46825E14CDC2489247825D7E76249ADE93",
  },
  frames: [
    ["微信图片_20260830182231_2095_2.png", "7D6B722245808FFDF544270D68C0D1A7ACBEC8B25D4405FF33A69720FF1164EF"],
    ["微信图片_20260830182231_2096_2.png", "810D6857DB7BF129056F9A537FC426B57C7CD5D911B1570937EDDDF43C689A55"],
    ["微信图片_20260830182231_2097_2.png", "23D5810D85FD19789A24E34EDF1A841EA406378A2C4BD422A564C417385A4E2E"],
    ["微信图片_20260830182232_2098_2.png", "21EB0ABEEA343F8ACD91D65AC3DDFB26951ADDE94000416E33547699154E128D"],
    ["微信图片_20260830182232_2099_2.png", "9EC32D8A9BA85D3FF58F376B71C68AA92FB549BFA5D65E65B1CB2F46D7099CED"],
    ["微信图片_20260830182232_2100_2.png", "4B1CA9DCD5067C54A0653967F8E56A70380EC363EF779F2DD9191029E324E8B0"],
  ].map(([fileName, sha256]) => ({ fileName, sha256 })),
  learnings: [
    {
      id: "NO_FORCED_COMPLETION",
      status: "ADOPT_METHOD_GUARD" as QimenMethodLearningStatus,
      locator: "transcript:61-62",
      rule: "盘面未显示的关系不得为了配合结果强行补写。",
    },
    {
      id: "PALACE_OPPOSITION_CHECK",
      status: "ADOPT_METHOD_GUARD" as QimenMethodLearningStatus,
      locator: "transcript:68-84",
      rule: "本宫必须联查对宫、孤虚、空亡和消息用神，单个凶象不能替代完整判断。",
    },
    {
      id: "OPERATOR_STEM_NOT_MARKET_OUTCOME",
      status: "ADOPT_METHOD_GUARD" as QimenMethodLearningStatus,
      locator: "transcript:102-140",
      rule: "金融问题已有明确结果宫时，日干时干优先解释求测人与操作状态，不直接等同标的盈亏。",
    },
    {
      id: "DIRECTIONAL_PALACE_COMPARISON",
      status: "FORWARD_RESEARCH_ONLY" as QimenMethodLearningStatus,
      locator: "transcript:361-457",
      rule: "上涨、下跌、震荡三宫必须在结果前分别记录并独立比较，缺任一宫不得自动推断。",
    },
    {
      id: "ASSET_CLASS_ELEMENT_SEMANTICS",
      status: "FORWARD_RESEARCH_ONLY" as QimenMethodLearningStatus,
      locator: "transcript:478-554",
      rule: "指数木火与黄金金性属于待验证的资产类别语义，禁止固化为通用涨跌词典。",
    },
    {
      id: "GOLD_WEEKLY_CASE_20260830",
      status: "CASE_NOTE_ONLY" as QimenMethodLearningStatus,
      locator: "transcript:539-596",
      rule: "黄金上涨与震荡占优、下跌幅度有限是该期案例结论；讲者对空亡处理仍存疑，不提高正式权重。",
    },
  ],
});
