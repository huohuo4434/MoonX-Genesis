export type QimenCyclePatternMaterial = {
  fileName: string;
  sha256: string;
  kind: "TRANSCRIPT" | "FRAME";
  period: "YEAR_2026" | "JUNE_2026" | "H2_2026" | "SEPTEMBER_2026";
};

const materials: QimenCyclePatternMaterial[] = [
  { fileName: "2026年/2026年大預測，赤馬紅羊，巨變已至，你準備好了麼？  奇門運勢.txt", sha256: "66DFA03BFC526BE0E870D7F46E7CB331614B99AB6DA5C708060A744E5F4AA04A", kind: "TRANSCRIPT", period: "YEAR_2026" },
  { fileName: "2026年/05880a43-efa2-446e-9764-fedb5a9a5eb1.png", sha256: "8EC1FABE36AD0CF8105D6C581DA17165806A3780ED38CE55AA70B3B2274500BE", kind: "FRAME", period: "YEAR_2026" },
  { fileName: "2026年/1231f2bb-9a76-47fb-a3f5-8674ee4208c5.png", sha256: "AA32A504C4B5FBF88550E2C66EB26FA78A370460C241023DD6AA85550A43EF58", kind: "FRAME", period: "YEAR_2026" },
  { fileName: "2026年/41fab76b-f075-4533-9d40-9c60f57b6c54.png", sha256: "68352BCA7590254D8CA50DBBD48B96D4038A2335ECCAA73F6AAD8B2E7FA73261", kind: "FRAME", period: "YEAR_2026" },
  { fileName: "2026年/4faf86d2-8c42-4aa9-80e5-1bf3b790d992.png", sha256: "74C52915C5FE460B5F688891D7B98C65752263B3762468E1088E7F119CA84A1F", kind: "FRAME", period: "YEAR_2026" },
  { fileName: "2026年/9039d145-f09b-45d9-9999-3267bc7eed83.png", sha256: "3894B1DD3093B463753CA6709C3BBCCB4DF7679FA9A5AB7BD4A7DABD9F4ED6E5", kind: "FRAME", period: "YEAR_2026" },
  { fileName: "2026年/9fe36aef-4314-4a87-bdf6-9a8cb6803f80.png", sha256: "413682ABA020CD796D613B12BFCF0A88CB92C4FDBD4A6AC8F2E2B84E42A31833", kind: "FRAME", period: "YEAR_2026" },
  { fileName: "2026年/a6895dba-0380-49ea-b253-74a7352d52d2.png", sha256: "61DEB68F3C4EE36ABE4CD6DFB9427FAD6EE5EC28D3A694DC3AAC2D553AFFC64F", kind: "FRAME", period: "YEAR_2026" },
  { fileName: "2026年/b1539a4c-8141-4c76-8b0c-03bbec60bda0.png", sha256: "86B173BCE1867CDE073E3C81EBBE2369F6AC967CCCC00BC81768900C42E360B3", kind: "FRAME", period: "YEAR_2026" },
  { fileName: "2026年/c13f7b7c-8832-4c15-95b9-3284743fc4ef.png", sha256: "3928EA502D54967860EEE15D4FCC69307CBD91E2C4594A7BD3DBBE1EB615DF83", kind: "FRAME", period: "YEAR_2026" },
  { fileName: "2026年/c5a75654-946e-49a3-950a-bba3963c3e7d.png", sha256: "0D6F83EB420268C17A608F5503EF692918FAF842C152F133FE3E3693913B7CCB", kind: "FRAME", period: "YEAR_2026" },
  { fileName: "2026年/d343df76-de2c-48bf-a4d8-09f1f2dd6768.png", sha256: "262952FA3F6D89E2C604CC60EFC91DC2754BF0E12C4CFEF85D317A838B840C06", kind: "FRAME", period: "YEAR_2026" },
  { fileName: "6月份/2026年6月奇门局：出师未捷深陷泥潭？教你找对当下的“避风港” ｜ 奇门运势 [PN47WPGrCJU].zh-CN.vtt", sha256: "08F3C77DD8D6E3F70495A22DD4393F7350055FFAEA79173FBD8942DE3BA42F54", kind: "TRANSCRIPT", period: "JUNE_2026" },
  { fileName: "6月份/7a5a80ac5c2cde407f92ce0c84f8ece1.png", sha256: "E306AB1AD0774B0E950D853ACB65677A2A6F36C65916A388409FF5B1F6D7DC80", kind: "FRAME", period: "JUNE_2026" },
  { fileName: "6月份/ac9304933e9534e7fc2d48ff7fa92811.png", sha256: "FB6AB8830D94C27E9A97E8214DC8C7B1451BA21785A6B9B04502864E778E39FA", kind: "FRAME", period: "JUNE_2026" },
  { fileName: "下半年/2026下半年奇门预警：“黑天鹅”尚未降临！戌亥月三凶聚齐，大变局你准备好了吗？ [yY3mU5V4U4A].zh-CN.vtt", sha256: "B0B215963C2470EAD1C8E250DB97CCA17655D642BC4A9F0EB884352D031ECAB1", kind: "TRANSCRIPT", period: "H2_2026" },
  { fileName: "下半年/225e9ad401158a7c0d4ea6418f6634a5.png", sha256: "7FB07B384ABF5F26F29E0860578E9653264915C4C9EC642A037227DE76C0FAC5", kind: "FRAME", period: "H2_2026" },
  { fileName: "0901/2026年9月，黑天鵝夾縫中的“極致溫柔”，是救贖還是陷阱？ ｜ 奇門運勢 [0FE0jrjHCWc].zh-CN.vtt", sha256: "F9CB3967C4D6B092B0037F6EE3222BF9EAE7953AD336E845463E509A48E3C399", kind: "TRANSCRIPT", period: "SEPTEMBER_2026" },
  { fileName: "0901/b62e02d9fb567a1e3d4c3291e99bb339.png", sha256: "E8AA206945449FFE5F5AD80B8F87F9368A3C12CD174CD50D6AE4596B4DE1DBC2", kind: "FRAME", period: "SEPTEMBER_2026" },
  { fileName: "0901/c585c7beee5cd9e539a447020710fa0c.png", sha256: "C6C65AB8C497EC610D19B4FB44A1AD57379254DE4B05A4CFAC999C57D741A2F3", kind: "FRAME", period: "SEPTEMBER_2026" },
  { fileName: "0901/cd4fe3d5165123a53781455e79bfd3b7.png", sha256: "F446520721A436DEC8FD6D620978D1BB9748736E269DFCC53DC471E8BA8B09B8", kind: "FRAME", period: "SEPTEMBER_2026" },
  { fileName: "0901/cfe8cbfcd5021d535c17ef376ec818f1.png", sha256: "8B2A28EC78BC8D8649CD5977D6FAA1D17E612E6626A7DFDCE1C159DF32E7ADE7", kind: "FRAME", period: "SEPTEMBER_2026" },
  { fileName: "0901/fcae675a165e5e46936b954894291727.png", sha256: "5883B3F5E9D54587AD98239388FB83D695898A4B559E5541E234F8D20FEDA509", kind: "FRAME", period: "SEPTEMBER_2026" },
];

export const QIMEN_CYCLE_PATTERN_SOURCE_20260901 = Object.freeze({
  sourceId: "WANG_QIMEN_CYCLE_PATTERN_20260901",
  internalSourceFamily: "WANG_TEACHER",
  publicLabelZh: "周期格局流派",
  publicLabelEn: "Cycle-pattern school",
  receivedAt: "2026-09-01T19:09:39+08:00",
  forwardScoreFrom: "2026-09-02T00:00:00+08:00",
  materialKind: "USER_SUPPLIED_TRANSCRIPTS_AND_FRAMES",
  materials: Object.freeze(materials),
  method: Object.freeze({
    primaryFrameZh: "先用年家、月家奇门锁定周期气候，再依月干与旬首、值符值使、三奇格局、宫位生克和古籍赋文解释强弱与转折窗口。",
    primaryFrameEn: "Uses annual and monthly Qimen charts to define cycle climate, then reads the cycle stem, xun leader, chief deity/gate, the three wonders, palace relations and classical text for timing.",
    differsFromObjectYongshenZh: "对象用神流派先锁定具体产品用神；本流派先看全市场周期，不提供单一资产用神。",
    differsFromDirectionalPalaceZh: "定向取宫流派预先比较上涨、下跌、震荡三类结果宫；本流派不设置三结果宫。",
    authority: "MONTHLY_ENVIRONMENT_AND_TIMING_ONLY",
    maySetOfficialDirection: false,
    mayChangeAssetConfidence: false,
    mayTriggerTrade: false,
  }),
  learnings: Object.freeze([
    "年、半年、月必须分层阅读；月盘不能覆盖年盘，只解释当前阶段。",
    "先读周期干及旬首落宫，再读值符值使；不能只因出现吉格或凶格就直接映射成涨跌。",
    "古籍显性吉象与隐性风险要并读：表面和谐可能来自利益妥协，不等同长期趋势反转。",
    "节气用于宽时间窗：立秋、寒露、小雪是阶段节点，不冒充精确交易日。",
    "具体资产仍须回到该资产正式六爻方向、对象用神或定向取宫读数及技术结构。",
  ]),
  september2026: Object.freeze({
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    chartEvidence: "ANNUAL_AND_MONTHLY_CHARTS_VISIBLE",
    sourceConclusionZh: "9月整体气场偏和谐，资本市场可能回暖、利好增多；但这种平静更像利益妥协形成的休整窗口，并非大趋势反转，过度顺利本身也有物极必反的脆弱性。",
    sourceConclusionEn: "September is broadly harmonious and may support a market recovery and favorable headlines, but it is a tactical truce rather than a lasting trend reversal, with fragility if conditions become too benign.",
    relationshipToMoox: "PARTIAL_RESONANCE",
    relationshipZh: "同周期部分共振",
    researchConfidenceBefore: "MEDIUM",
    researchConfidenceAfter: "MEDIUM_HIGH",
    confidenceScopeZh: "只上调9月修复、10月风险抬升的跨市场周期判断；各品种正式方向、概率和点位不变。",
    assetDirectionChange: "NONE",
    officialForecastChange: "NONE",
    tradingAuthority: false,
    alignedZh: Object.freeze([
      "9月具备修复与政策利好窗口，与MOOX半导体9月7日后相对转强、月初风险资产仍可修复的背景一致。",
      "表面太平不等于趋势反转，与MOOX对冲高后保护利润、阶段高位后防回落的处理一致。",
      "10月寒露后风险抬升，与MOOX 10月7日后高振幅和保护利润窗口相互印证。",
    ]),
    alignedEn: Object.freeze([
      "A September recovery and policy-support window aligns with MOOX semiconductor relative strength after Sep 7 and early-month risk-asset repair.",
      "A calm surface is not a lasting reversal, matching MOOX profit protection after rallies and pullback risk near candidate highs.",
      "Higher risk after Cold Dew aligns with the MOOX high-volatility and profit-protection window after Oct 7.",
    ]),
    boundariesZh: Object.freeze([
      "本资料没有给BTC、ETH、黄金或个股的专属用神，因此不能证明某个品种的精确涨跌路径。",
      "它没有给9月7日至13日等细分资产窗口，不能替代现有月卦、周卦和关键日。",
      "长期看好贵金属与MOOX黄金9月7日后温和回调并不矛盾，二者时间跨度不同。",
    ]),
    boundariesEn: Object.freeze([
      "The source gives no asset-specific anchors for BTC, ETH, gold or individual stocks, so it cannot prove an exact asset path.",
      "It does not define asset windows such as Sep 7-13 and cannot replace existing monthly, weekly or key-date evidence.",
      "Long-term precious-metal optimism does not conflict with a mild MOOX gold pullback after Sep 7 because the horizons differ.",
    ]),
  }),
  futureRiskWindows: Object.freeze([
    { start: "2026-10-08", labelZh: "寒露后风险抬升", usage: "MONTHLY_TIMING_ONLY" },
    { start: "2026-11-22", labelZh: "小雪前后高风险候选", usage: "MONTHLY_TIMING_ONLY" },
  ]),
  historyPolicy: Object.freeze({
    juneAndAugust: "METHOD_LEARNING_ONLY",
    reasonZh: "6月与8月资料在结果发生后才于本次录入，只用于学习方法，不补计历史命中率。",
  }),
} as const);
