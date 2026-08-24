import type { ConvictionForecastType, ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import type { OfficialDirection } from "@/lib/forecasts/formal-direction";

const PUBLISHED_AT = "2026-08-24T20:35:00+08:00";
const QIMEN_GAP = "同周期奇门盘尚未提供；本条只记录六爻，不标记双方法共振。";

type WeeklySeed = {
  id: string;
  assetId: "cxmt" | "googl" | "asteroid" | "sol" | "intel";
  forecastType: Extract<ConvictionForecastType, `WEEK${string}`>;
  periodStart: string;
  periodEnd: string;
  direction: OfficialDirection;
  primaryHexagram: string;
  changingHexagram?: string | null;
  summary: string;
  expectedPath: string;
  evidence: string;
  longCycle: string;
  longRelation: "一致" | "部分一致" | "阶段分歧";
  risk?: string;
};

function probabilities(direction: WeeklySeed["direction"]): Pick<
  ConvictionPeriodForecast,
  "upProbability" | "sidewaysProbability" | "downProbability"
> {
  switch (direction) {
    case "上涨": return { upProbability: 52, sidewaysProbability: 30, downProbability: 18 };
    case "震荡上涨": return { upProbability: 43, sidewaysProbability: 39, downProbability: 18 };
    case "先跌后涨": return { upProbability: 40, sidewaysProbability: 35, downProbability: 25 };
    case "震荡": return { upProbability: 29, sidewaysProbability: 47, downProbability: 24 };
    case "先涨后跌": return { upProbability: 32, sidewaysProbability: 32, downProbability: 36 };
    case "震荡下跌": return { upProbability: 21, sidewaysProbability: 40, downProbability: 39 };
    case "下跌": return { upProbability: 17, sidewaysProbability: 30, downProbability: 53 };
  }
}

function weekly(seed: WeeklySeed): ConvictionPeriodForecast {
  const probs = probabilities(seed.direction);
  return {
    id: seed.id,
    assetId: seed.assetId,
    forecastType: seed.forecastType,
    periodStart: seed.periodStart,
    periodEnd: seed.periodEnd,
    direction: seed.direction,
    ...probs,
    summary: seed.summary,
    expectedPath: seed.expectedPath,
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: seed.assetId === "sol" || seed.assetId === "asteroid" ? "极高" : "高",
    catalysts: ["本次独立周卦", `与既有长周期${seed.longRelation}`],
    risks: [seed.risk ?? "周卦只负责本周期方向，不外推为长期反转。", QIMEN_GAP],
    consensusStars: 2,
    consensusLabel: `单一六爻来源；与既有长周期${seed.longRelation}，缺少同周期奇门独立盘`,
    methodViews: [
      {
        id: `${seed.id}-liuyiao`,
        label: "六爻·本次独立周卦",
        direction: seed.direction,
        weight: 100,
        summary: seed.summary,
      },
      {
        id: `${seed.id}-long-cycle`,
        label: "既有长周期·只作背景对照",
        direction: seed.longCycle,
        weight: 0,
        summary: `本周与长周期关系：${seed.longRelation}。背景不重复投票，也不覆盖本周正式方向。`,
      },
      {
        id: `${seed.id}-qimen-gap`,
        label: "奇门·同周期证据待补",
        direction: "资料不足",
        weight: 0,
        summary: QIMEN_GAP,
      },
    ],
    ichingEvidence: {
      primaryHexagram: seed.primaryHexagram,
      changingHexagram: seed.changingHexagram ?? null,
      notes: `${seed.evidence} 来源为用户2026-08-24本人排盘截图，按老师金融六爻法复核；不是老师原卦。`,
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  };
}

export const SEPTEMBER_WEEKLY_REVISIONS_20260824: ConvictionPeriodForecast[] = [
  weekly({
    id: "CXMT-W4-20260831-V1", assetId: "cxmt", forecastType: "WEEK_4", periodStart: "2026-08-31", periodEnd: "2026-09-06", direction: "震荡上涨",
    primaryHexagram: "水天需（游魂）", summary: "静卦需以等待和蓄势为主；世爻子孙申金当令并能生妻财子水，应爻又临妻财，承接条件偏正，但不支持追涨。",
    expectedPath: "前段反复确认承接 → 中后段缓慢修复；若直接急拉，仍按高波动换手处理。", evidence: "原题：长鑫科技8月31日至9月6日走势；静卦，世子孙申金、应妻财子水。",
    longCycle: "三个月先跌后涨", longRelation: "一致",
  }),
  weekly({
    id: "CXMT-W5-20260907-V1", assetId: "cxmt", forecastType: "WEEK_5", periodStart: "2026-09-07", periodEnd: "2026-09-13", direction: "震荡上涨",
    primaryHexagram: "火山旅（六合）", summary: "妻财酉金临应并得酉月，世爻子孙辰土保留生财条件；六合有承接，但旅卦提示强势不宜久留。",
    expectedPath: "低位承接后震荡抬高 → 周后段防获利回吐；更像修复周，不定义为单边主升。", evidence: "原题：长鑫科技9月7日至9月13日走势；静卦，妻财酉金临应、子孙辰土持世。",
    longCycle: "三个月先跌后涨", longRelation: "一致",
  }),
  weekly({
    id: "CXMT-W6-20260914-V1", assetId: "cxmt", forecastType: "WEEK_6", periodStart: "2026-09-14", periodEnd: "2026-09-20", direction: "先跌后涨",
    primaryHexagram: "火泽睽", changingHexagram: "天雷无妄（六冲）", summary: "官鬼卯木在酉月受冲且发动后仍为弱木，风险端难持续；上段兄弟未土化子孙申金，为后段补入生财力量。六冲只放大波动，不机械判空。",
    expectedPath: "前段分歧和回踩 → 中后段子孙力量接掌并修复；全周波动明显放大。", evidence: "原题：长鑫科技9月14日至9月20日走势；官鬼卯木与兄弟未土发动。",
    longCycle: "三个月先跌后涨", longRelation: "一致", risk: "无妄六冲提高急跌急拉概率。",
  }),
  weekly({
    id: "CXMT-W7-20260921-V1", assetId: "cxmt", forecastType: "WEEK_7", periodStart: "2026-09-21", periodEnd: "2026-09-27", direction: "先跌后涨",
    primaryHexagram: "山天大畜", changingHexagram: "地风升", summary: "初爻妻财子水先化兄弟丑土，前段资金分流；上爻官鬼寅木后化子孙酉金，后段风险转为修复动力。",
    expectedPath: "周初先压和换手 → 中段稳住 → 后段修复抬高；不把卦名中的“升”直接当作全周上涨。", evidence: "原题：长鑫科技9月21日至9月27日走势；初爻妻财与上爻官鬼发动。",
    longCycle: "三个月先跌后涨", longRelation: "一致",
  }),
  weekly({
    id: "CXMT-W8-20260928-V1", assetId: "cxmt", forecastType: "WEEK_8", periodStart: "2026-09-28", periodEnd: "2026-10-04", direction: "震荡下跌",
    primaryHexagram: "兑为泽（六冲）", changingHexagram: "雷泽归妹（归魂）", summary: "兄弟酉金在酉月旺而发动后仍化兄弟申金，妻财卯木受月冲；竞争和资金分流压过财爻，六冲与归魂加大反复。",
    expectedPath: "高波动震荡 → 反抽受阻 → 周后段偏弱；若前几周已经明显修复，本周更像阶段兑现。", evidence: "原题：长鑫科技9月28日至10月4日走势；五爻兄弟酉金发动。",
    longCycle: "三个月先跌后涨", longRelation: "阶段分歧", risk: "月底周卦偏弱，不等于三个月修复方向已经反转。",
  }),

  weekly({
    id: "GOOGL-W5-20260907-V1", assetId: "googl", forecastType: "WEEK_5", periodStart: "2026-09-07", periodEnd: "2026-09-13", direction: "震荡下跌",
    primaryHexagram: "水山蹇", summary: "静卦没有动爻推动，妻财卯木伏于官鬼午火之下并受酉月冲克；世爻兄弟申金得令，资金分流强于价格推动。",
    expectedPath: "弱势震荡与受阻为主 → 反抽持续性有限；等待下一周风险爻转弱后再看修复。", evidence: "原题：Google 9月7日至13日走势；静卦，兄弟申金持世、妻财卯木伏藏。",
    longCycle: "9至11月震荡", longRelation: "一致",
  }),
  weekly({
    id: "GOOGL-W6-20260914-V1", assetId: "googl", forecastType: "WEEK_6", periodStart: "2026-09-14", periodEnd: "2026-09-20", direction: "震荡上涨",
    primaryHexagram: "天泽履", changingHexagram: "天雷无妄（六冲）", summary: "官鬼卯木发动后化寅木，在酉月均弱；子孙申金持世当令并能生伏财子水。风险端受制，承接端偏强，但六冲要求保留急洗。",
    expectedPath: "前段谨慎试探 → 承接改善后震荡抬高 → 周后段防六冲式快速回吐。", evidence: "原题：Google 9月14日至20日走势；二爻官鬼卯木发动。",
    longCycle: "9至11月震荡", longRelation: "部分一致", risk: "上涨属于震荡区间内的修复段。",
  }),
  weekly({
    id: "GOOGL-W7-20260921-V1", assetId: "googl", forecastType: "WEEK_7", periodStart: "2026-09-21", periodEnd: "2026-09-27", direction: "先涨后跌",
    primaryHexagram: "天火同人（归魂）", changingHexagram: "水火既济", summary: "四爻兄弟午火先化妻财申金，支持中前段抬升；上爻子孙戌土后化官鬼子水，提示后段风险接掌。",
    expectedPath: "前中段修复上行 → 高位换手 → 后段转弱或回吐；既济只表示阶段完成，不保证继续上涨。", evidence: "原题：Google 9月21日至27日走势；四爻兄弟与上爻子孙发动。",
    longCycle: "9至11月震荡", longRelation: "一致",
  }),
  weekly({
    id: "GOOGL-W8-20260928-V1", assetId: "googl", forecastType: "WEEK_8", periodStart: "2026-09-28", periodEnd: "2026-10-04", direction: "震荡",
    primaryHexagram: "雷风恒", summary: "静卦恒表示既有状态延续而非自动上涨；两处妻财土提供承接，但官鬼酉金持世并得月令，价格与风险力量并存。",
    expectedPath: "区间反复、等待方向选择；若上一周已明显回落，本周偏稳定，若仍在高位则更容易横盘消化。", evidence: "原题：Google 9月28日至10月4日走势；静卦，官鬼酉金持世。",
    longCycle: "9至11月震荡", longRelation: "一致",
  }),

  weekly({
    id: "ASTEROID-W5-20260831-V1", assetId: "asteroid", forecastType: "WEEK_5", periodStart: "2026-08-31", periodEnd: "2026-09-06", direction: "先跌后涨",
    primaryHexagram: "风山渐（归魂）", changingHexagram: "风火家人", summary: "初爻兄弟辰土发动化官鬼卯木，前段仍有压力；世爻子孙申金得令并在变卦转出妻财亥水，后段承接条件优于前段。",
    expectedPath: "先释放压力和换手 → 中后段逐步修复；高波动标的不把单日急拉当作趋势确认。", evidence: "原题：太空狗8月31日至9月6日走势；初爻兄弟辰土发动。",
    longCycle: "三个月先跌后涨", longRelation: "一致",
  }),
  weekly({
    id: "ASTEROID-W6-20260907-V1", assetId: "asteroid", forecastType: "WEEK_6", periodStart: "2026-09-07", periodEnd: "2026-09-13", direction: "震荡上涨",
    primaryHexagram: "雷地豫（六合）", changingHexagram: "雷水解", summary: "二爻子孙巳火发动化妻财辰土并转为持世，属于生财动力落到价格端；六合与解卦支持压力释放后的修复。",
    expectedPath: "前段仍有摇摆 → 中段转强 → 后段震荡抬高；酉月下不把反弹幅度无限外推。", evidence: "原题：太空狗9月7日至9月13日走势；二爻子孙巳火发动化妻财辰土。",
    longCycle: "三个月先跌后涨", longRelation: "一致",
  }),
  weekly({
    id: "ASTEROID-W7-20260914-V1", assetId: "asteroid", forecastType: "WEEK_7", periodStart: "2026-09-14", periodEnd: "2026-09-20", direction: "震荡上涨",
    primaryHexagram: "风山渐（归魂）", summary: "静卦没有突发动爻，世爻子孙申金得酉月同类助力并能生伏财子水；应爻官鬼卯木受冲，风险端偏弱。",
    expectedPath: "缓慢抬高、回踩有承接 → 周后段高位反复；属于渐进修复而非直线拉升。", evidence: "原题：太空狗9月14日至9月20日走势；静卦，子孙申金持世、妻财子水伏藏。",
    longCycle: "三个月先跌后涨", longRelation: "一致",
  }),
  weekly({
    id: "ASTEROID-W8-20260921-V1", assetId: "asteroid", forecastType: "WEEK_8", periodStart: "2026-09-21", periodEnd: "2026-09-27", direction: "上涨",
    primaryHexagram: "雷火丰", changingHexagram: "火天大有（归魂）", summary: "二爻官鬼丑土化子孙寅木、上爻官鬼戌土化妻财巳火，两处风险爻转为生财与财，方向信号明显偏多。",
    expectedPath: "前段确认突破 → 中段加速 → 后段高位震荡；归魂提示冲高后仍会有大幅回吐。", evidence: "原题：太空狗9月21日至9月27日走势；二爻和上爻官鬼同时发动。",
    longCycle: "三个月先跌后涨", longRelation: "一致", risk: "高波动上涨周，归魂结构下不宜无条件追涨。",
  }),
  weekly({
    id: "ASTEROID-W9-20260928-V1", assetId: "asteroid", forecastType: "WEEK_9", periodStart: "2026-09-28", periodEnd: "2026-10-04", direction: "震荡上涨",
    primaryHexagram: "火风鼎", changingHexagram: "地风升", summary: "上爻兄弟巳火化妻财酉金并得酉月，四爻妻财酉金又化子孙丑土，资金端仍有支撑；但多爻转换使上涨伴随明显换手。",
    expectedPath: "震荡蓄势 → 资金回流后再抬高 → 周末前防高位分歧；不以“升”字单独定多。", evidence: "原题：太空狗9月28日至10月4日走势；四爻妻财与上爻兄弟发动。",
    longCycle: "三个月先跌后涨", longRelation: "一致",
  }),

  weekly({
    id: "SOL-W4-20260831-V1", assetId: "sol", forecastType: "WEEK_4", periodStart: "2026-08-31", periodEnd: "2026-09-06", direction: "先跌后涨",
    primaryHexagram: "火水未济", changingHexagram: "火风鼎", summary: "三爻兄弟午火持世发动化妻财酉金，前段先有竞争和分流，随后转出当令财金；未济到鼎更适合解释先乱后修复。",
    expectedPath: "前段回踩和反复 → 中后段修复上行；这是9月偏弱背景中的过渡反弹。", evidence: "原题：SOL 8月31日至9月6日走势；三爻兄弟午火发动化妻财酉金。",
    longCycle: "9月及秋冬震荡下跌", longRelation: "部分一致", risk: "短线修复不等于秋冬主方向转多。",
  }),
  weekly({
    id: "SOL-W5-20260907-V1", assetId: "sol", forecastType: "WEEK_5", periodStart: "2026-09-07", periodEnd: "2026-09-13", direction: "震荡下跌",
    primaryHexagram: "地山谦", changingHexagram: "山火贲（六合）", summary: "上爻兄弟酉金得月令并发动，虽化妻财寅木，但财木在酉月受冲克；初爻父母辰土化财卯木同样受冲，化财不等于有效资金。",
    expectedPath: "反抽尝试 → 财爻承接不足 → 震荡转弱；六合只降低失序程度，不改变偏弱主线。", evidence: "原题：SOL 9月7日至9月13日走势；上爻兄弟酉金与初爻父母辰土发动。",
    longCycle: "9月及秋冬震荡下跌", longRelation: "一致",
  }),
  weekly({
    id: "SOL-W6-20260914-V1", assetId: "sol", forecastType: "WEEK_6", periodStart: "2026-09-14", periodEnd: "2026-09-20", direction: "下跌",
    primaryHexagram: "水火既济", changingHexagram: "水雷屯", summary: "妻财午火伏藏且在酉月失势，三爻兄弟亥水持世发动化官鬼辰土，竞争力量转为风险；子孙卯木也受酉月冲。",
    expectedPath: "弱势开局 → 风险在中段放大 → 后段低位整理；没有足够财爻条件支持反转。", evidence: "原题：SOL 9月14日至9月20日走势；三爻兄弟亥水持世发动化官鬼辰土。",
    longCycle: "9月及秋冬震荡下跌", longRelation: "一致",
  }),
  weekly({
    id: "SOL-W7-20260921-V1", assetId: "sol", forecastType: "WEEK_7", periodStart: "2026-09-21", periodEnd: "2026-09-27", direction: "震荡下跌",
    primaryHexagram: "地水师（归魂）", summary: "静卦缺少反转动爻，妻财午火持世但在酉月不旺，官鬼土爻多而子孙寅木弱；承接存在但推动不足。",
    expectedPath: "低位反复、偶有反抽 → 仍以偏弱整理为主；周内不排除短线修复，但不升级为上涨。", evidence: "原题：SOL 9月21日至9月27日走势；静卦，妻财午火持世。",
    longCycle: "9月及秋冬震荡下跌", longRelation: "一致",
  }),
  weekly({
    id: "SOL-W8-20260928-V1", assetId: "sol", forecastType: "WEEK_8", periodStart: "2026-09-28", periodEnd: "2026-10-04", direction: "下跌",
    primaryHexagram: "乾为天（六冲）", summary: "静卦六冲放大波动，妻财寅木在酉月受冲，兄弟申金与官鬼午火均明现；财弱而竞争、风险不弱，方向继续偏空。",
    expectedPath: "高波动下探 → 急拉急跌并存 → 周度重心继续下移；进入戌月前等待新卦确认是否止跌。", evidence: "原题：SOL 9月28日至10月4日走势；乾为天六冲静卦，妻财寅木失令。",
    longCycle: "9月及秋冬震荡下跌", longRelation: "一致", risk: "六冲意味着偏空中仍可能出现快速反抽。",
  }),

  weekly({
    id: "INTC-W1-20260831-V1", assetId: "intel", forecastType: "WEEK", periodStart: "2026-08-31", periodEnd: "2026-09-06", direction: "先跌后涨",
    primaryHexagram: "火泽睽", changingHexagram: "火地晋（游魂）", summary: "下段官鬼卯木与父母巳火发动，前段先有分歧和消息扰动；子孙酉金持世得令，伏财子水获金生，后段仍有修复条件。",
    expectedPath: "周初波动和回踩 → 中后段逐步修复；晋只表示推进，不当作直线上涨。", evidence: "原题：Intel 8月31日至9月6日走势；初、二爻发动，子孙酉金持世。",
    longCycle: "8月22日至9月底先涨后跌", longRelation: "部分一致",
  }),
  weekly({
    id: "INTC-W2-20260907-V1", assetId: "intel", forecastType: "WEEK_2", periodStart: "2026-09-07", periodEnd: "2026-09-13", direction: "震荡上涨",
    primaryHexagram: "山泽损", changingHexagram: "地泽临", summary: "上爻官鬼寅木发动化子孙酉金，风险端转为当令生财力量；两处妻财水又得酉金相生，本周偏向修复抬高。",
    expectedPath: "前段仍有减压 → 中段承接增强 → 后段震荡走高；不把“临”字单独当作突破保证。", evidence: "原题：Intel 9月7日至9月13日走势；上爻官鬼寅木发动化子孙酉金。",
    longCycle: "8月22日至9月底先涨后跌", longRelation: "一致",
  }),
  weekly({
    id: "INTC-W3-20260914-V1", assetId: "intel", forecastType: "WEEK_3", periodStart: "2026-09-14", periodEnd: "2026-09-20", direction: "震荡上涨",
    primaryHexagram: "地水师（归魂）", changingHexagram: "地泽临", summary: "初爻子孙寅木发动化妻财巳火，为前段补入生财路径；但财火在酉月偏弱、世爻妻财午火也失令，因此只看受限修复。",
    expectedPath: "低位承接 → 震荡修复 → 上方压力限制高度；临近周末转入高位分歧。", evidence: "原题：Intel 9月14日至9月20日走势；初爻子孙寅木发动化妻财巳火。",
    longCycle: "8月22日至9月底先涨后跌", longRelation: "一致", risk: "财火失令，修复强度不可高估。",
  }),
  weekly({
    id: "INTC-W4-20260921-V1", assetId: "intel", forecastType: "WEEK_4", periodStart: "2026-09-21", periodEnd: "2026-09-27", direction: "震荡下跌",
    primaryHexagram: "地山谦", changingHexagram: "水地比（归魂）", summary: "四爻兄弟申金发动化妻财卯木，但财卯受酉月冲克；五爻子孙亥水又化父母戌土，生财力量退出，偏向高位转弱。",
    expectedPath: "反抽受阻 → 中段转弱 → 后段低位震荡；归魂结构下允许反复，但主方向偏下。", evidence: "原题：Intel 9月21日至9月27日走势；四爻兄弟申金与五爻子孙亥水发动。",
    longCycle: "8月22日至9月底先涨后跌", longRelation: "一致",
  }),
  weekly({
    id: "INTC-W5-20260928-V1", assetId: "intel", forecastType: "WEEK_5", periodStart: "2026-09-28", periodEnd: "2026-10-04", direction: "下跌",
    primaryHexagram: "坎为水（六冲）", changingHexagram: "地水师（归魂）", summary: "妻财午火持应但在酉月失势，五爻官鬼戌土发动化兄弟亥水，风险转为资金竞争；六冲与归魂放大弱势反复。",
    expectedPath: "高波动下探 → 反抽后再承压 → 周度重心偏低；进入新月令后再等待独立卦确认。", evidence: "原题：Intel 9月28日至10月4日走势；五爻官鬼戌土发动化兄弟亥水。",
    longCycle: "8月22日至9月底先涨后跌", longRelation: "一致", risk: "月底偏弱是既有先涨后跌路线的后段兑现。",
  }),
];

const intelSeptemberMonth: ConvictionPeriodForecast = {
  id: "INTC-SEP-20260824-V2",
  assetId: "intel",
  forecastType: "MONTH_1",
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  direction: "先涨后跌",
  upProbability: 32,
  sidewaysProbability: 34,
  downProbability: 34,
  summary: "9月独立月卦风地观化天地否（六合），财卯木在酉月受冲、兄弟申金得势，月度不支持单边上涨。五张独立周卦进一步细化为上旬修复、中旬受限偏强、下旬转弱，与既有8月22日至9月底先涨后跌路线一致。",
  expectedPath: "9月初先回踩后修复 → 9月7日至20日震荡抬高但力度受限 → 9月21日起转弱 → 9月底下跌风险放大。",
  supportLevels: [],
  resistanceLevels: [],
  riskLevel: "高",
  catalysts: ["上旬官鬼转子孙", "酉金生财水", "中旬子孙化财"],
  risks: ["财卯木受酉月冲", "兄弟申金得势", "月底坎六冲转师归魂", QIMEN_GAP],
  consensusStars: 3,
  consensusLabel: "月卦与五张周卦内部同向为先强后弱；缺少Intel同周期奇门盘",
  methodViews: [
    { id: "intel-sep-month-liuyiao-v2", label: "六爻·9月独立月卦", direction: "先涨后跌", weight: 55, summary: "观化否，财木受冲、兄弟金旺，先观察修复，后防闭塞转弱。" },
    { id: "intel-sep-weeks-v2", label: "六爻·五张独立周卦", direction: "先涨后跌", weight: 45, summary: "上旬与中旬修复，下旬两周连续偏弱。" },
    { id: "intel-sep-qimen-gap-v2", label: "奇门·同周期证据待补", direction: "资料不足", weight: 0, summary: QIMEN_GAP },
  ],
  calendarMonthPath: [
    { period: "2026-08-31/2026-09-06", labelZh: "8/31–9/6", direction: "先跌后涨", primaryHexagram: "火泽睽", changingHexagram: "火地晋（游魂）", summary: "前段消息与分歧扰动，后段由子孙酉金与伏财子水形成修复。", sourceNote: "本次独立周卦", riskNote: "修复不是直线主升。" },
    { period: "2026-09-07/2026-09-13", labelZh: "9/7–9/13", direction: "震荡上涨", primaryHexagram: "山泽损", changingHexagram: "地泽临", summary: "官鬼化子孙酉金，两处财水获生，属于月内较强修复周。", sourceNote: "本次独立周卦", riskNote: "上方仍有月卦否象约束。" },
    { period: "2026-09-14/2026-09-20", labelZh: "9/14–9/20", direction: "震荡上涨", primaryHexagram: "地水师（归魂）", changingHexagram: "地泽临", summary: "子孙化财提供修复，但财火失令，强度有限。", sourceNote: "本次独立周卦", riskNote: "不宜把受限反弹外推为新主升。" },
    { period: "2026-09-21/2026-09-27", labelZh: "9/21–9/27", direction: "震荡下跌", primaryHexagram: "地山谦", changingHexagram: "水地比（归魂）", summary: "强兄弟化出受冲财木，子孙又转父母，后段转弱。", sourceNote: "本次独立周卦", riskNote: "与长周期后段同向。" },
    { period: "2026-09-28/2026-10-04", labelZh: "9/28–10/4", direction: "下跌", primaryHexagram: "坎为水（六冲）", changingHexagram: "地水师（归魂）", summary: "财火失令、官鬼化兄弟，月底风险集中释放。", sourceNote: "本次独立周卦", riskNote: "六冲中仍可能急拉，但不改周度偏空。" },
  ],
  rollingUpdate: {
    asOf: PUBLISHED_AT,
    label: "9月独立月卦与五周拆解 · V2",
    summary: "新增9月整月卦与五张独立周卦；旧版8月22日至9月底先涨后跌记录继续保留，本版只把9月内部节奏细化。",
    originalLockedView: "INTC-0822-0930-20260822-V1：8月底转强，9月前中段偏强，9月中后段整理。",
    timingTolerance: "没有日卦；逐日只能从对应周卦和市场日历派生。",
  },
  ichingEvidence: {
    primaryHexagram: "风地观",
    changingHexagram: "天地否（六合）",
    notes: "原题：Intel整个9月走势情况；起卦时间2026-08-24 20:16。财卯木在酉月受冲，兄弟申金得势；来源为用户本人排盘，不是老师原卦。",
  },
  version: 2,
  status: "published",
  sourceType: "ICHING_RESEARCH",
  publishedAt: PUBLISHED_AT,
  lockedAt: PUBLISHED_AT,
  validationStatus: "UNVERIFIED",
};

SEPTEMBER_WEEKLY_REVISIONS_20260824.push(intelSeptemberMonth);

export type SeptemberSectorComparisonRow = {
  group: "半导体/存储" | "加密货币" | "大型科技/高波动成长";
  asset: string;
  basis: "独立周卦" | "月度路线拆分" | "老师阶段卦";
  longCycle: string;
  relation: "大致一致" | "部分一致" | "分化";
  periods: [string, string, string, string, string];
};

export const SEPTEMBER_SECTOR_COMPARISON_20260824: SeptemberSectorComparisonRow[] = [
  { group: "半导体/存储", asset: "长鑫", basis: "独立周卦", longCycle: "三个月先跌后涨", relation: "大致一致", periods: ["震荡上涨", "震荡上涨", "先跌后涨", "先跌后涨", "震荡下跌"] },
  { group: "半导体/存储", asset: "Intel", basis: "独立周卦", longCycle: "先涨后跌", relation: "大致一致", periods: ["先跌后涨", "震荡上涨", "震荡上涨", "震荡下跌", "下跌"] },
  { group: "半导体/存储", asset: "闪迪", basis: "老师阶段卦", longCycle: "双峰上涨后转弱", relation: "部分一致", periods: ["先涨后跌", "待补", "待补", "待补", "待补"] },
  { group: "半导体/存储", asset: "LITE", basis: "独立周卦", longCycle: "到年底震荡上涨", relation: "部分一致", periods: ["待补", "先跌后涨", "震荡下跌", "震荡上涨", "先涨后跌"] },
  { group: "加密货币", asset: "BTC", basis: "月度路线拆分", longCycle: "9月高点候选", relation: "大致一致", periods: ["震荡上涨", "先涨后跌", "震荡下跌", "震荡下跌", "震荡下跌"] },
  { group: "加密货币", asset: "ETH", basis: "月度路线拆分", longCycle: "上旬见高后转弱", relation: "大致一致", periods: ["先跌后涨", "先涨后跌", "震荡", "震荡下跌", "震荡上涨"] },
  { group: "加密货币", asset: "HYPE", basis: "月度路线拆分", longCycle: "上旬推进后转弱", relation: "大致一致", periods: ["先跌后涨", "先涨后跌", "下跌", "先跌后涨", "先涨后跌"] },
  { group: "加密货币", asset: "SOL", basis: "独立周卦", longCycle: "9月及秋冬震荡下跌", relation: "大致一致", periods: ["先跌后涨", "震荡下跌", "下跌", "震荡下跌", "下跌"] },
  { group: "大型科技/高波动成长", asset: "Google", basis: "独立周卦", longCycle: "9至11月震荡", relation: "大致一致", periods: ["既有震荡", "震荡下跌", "震荡上涨", "先涨后跌", "震荡"] },
  { group: "大型科技/高波动成长", asset: "太空狗", basis: "独立周卦", longCycle: "三个月先跌后涨", relation: "大致一致", periods: ["先跌后涨", "震荡上涨", "震荡上涨", "上涨", "震荡上涨"] },
  { group: "大型科技/高波动成长", asset: "SPCX", basis: "老师阶段卦", longCycle: "酉月高点窗口", relation: "大致一致", periods: ["先涨后跌", "震荡上涨", "震荡上涨", "先涨后跌", "先涨后跌"] },
];

export function listSeptemberWeeklyRevisions20260824(assetId: WeeklySeed["assetId"]): ConvictionPeriodForecast[] {
  return SEPTEMBER_WEEKLY_REVISIONS_20260824.filter((row) => row.assetId === assetId && row.status === "published");
}
