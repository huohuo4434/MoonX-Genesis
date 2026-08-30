import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";

const PUBLISHED_AT = "2026-08-23T18:55:00+08:00";

function ethSeptemberWeek(input: {
  id: string;
  forecastType: ConvictionPeriodForecast["forecastType"];
  periodStart: string;
  periodEnd: string;
  direction: ConvictionPeriodForecast["direction"];
  primaryHexagram: string;
  changingHexagram: string;
  summary: string;
  expectedPath: string;
  risks: string[];
}): ConvictionPeriodForecast {
  const probabilities = input.direction === "先跌后涨" || input.direction === "震荡上涨"
    ? { up: 42, flat: 33, down: 25 }
    : input.direction === "先涨后跌"
      ? { up: 34, flat: 33, down: 33 }
      : input.direction === "震荡下跌"
        ? { up: 27, flat: 28, down: 45 }
        : { up: 27, flat: 46, down: 27 };
  return {
    id: input.id, assetId: "eth", forecastType: input.forecastType,
    periodStart: input.periodStart, periodEnd: input.periodEnd, direction: input.direction,
    upProbability: probabilities.up, sidewaysProbability: probabilities.flat, downProbability: probabilities.down,
    summary: input.summary, expectedPath: input.expectedPath,
    supportLevels: [], resistanceLevels: [], riskLevel: "极高",
    catalysts: ["独立周卦与酉月月卦合读"],
    risks: [...input.risks, "没有同周期奇门盘，不能标记双方法共振"],
    consensusStars: 2,
    consensusLabel: "独立六爻周卦负责本周方向；同周期奇门证据缺失，维持较低信心",
    methodViews: [{ id: `${input.id}-liuyao`, label: "六爻·独立周卦", direction: input.direction, weight: 100, summary: input.summary }],
    ichingEvidence: {
      primaryHexagram: input.primaryHexagram, changingHexagram: input.changingHexagram,
      notes: "2026-08-23收到的ETH五张独立周卦之一；按老师方法解读，周卦拥有本周正式方向，日度只能由周路径与目标日历拆分。",
    },
    version: 2, status: "published", sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT, lockedAt: PUBLISHED_AT, validationStatus: "UNVERIFIED",
  };
}

export const ETH_SEPTEMBER_WEEKLY_REVISIONS_20260823: ConvictionPeriodForecast[] = [
  ethSeptemberWeek({ id: "ETH-W5-20260831-V2", forecastType: "WEEK_5", periodStart: "2026-08-31", periodEnd: "2026-09-06", direction: "先跌后涨", primaryHexagram: "水山蹇", changingHexagram: "风山渐", summary: "周初阻滞与压力仍在，后段逐步修复；不把第一根反弹直接定义为主升。", expectedPath: "周初先弱或下探 → 中段止跌换手 → 周后段渐进修复。", risks: ["蹇卦前段阻力", "修复斜率有限"] }),
  ethSeptemberWeek({ id: "ETH-W6-20260907-V2", forecastType: "WEEK_6", periodStart: "2026-09-07", periodEnd: "2026-09-13", direction: "先涨后跌", primaryHexagram: "天地否", changingHexagram: "天山遁", summary: "先稳或冲高后退守，9月9日至11日是冲高受阻与方向切换候选窗。", expectedPath: "前段延续修复或冲高 → 9月9日至11日高位换手 → 后段退守。", risks: ["否化遁的退守结构", "高位承接衰减"] }),
  ethSeptemberWeek({ id: "ETH-W7-20260914-V2", forecastType: "WEEK_7", periodStart: "2026-09-14", periodEnd: "2026-09-20", direction: "震荡", primaryHexagram: "风地观", changingHexagram: "水风井", summary: "多爻同动放大双向波动，先观察再重建承接，不把盘中急拉或急跌外推成单边。", expectedPath: "高波动拉锯 → 方向反复 → 周后段等待结构稳定。", risks: ["多爻同动", "高波动整理"] }),
  ethSeptemberWeek({ id: "ETH-W8-20260921-V2", forecastType: "WEEK_8", periodStart: "2026-09-21", periodEnd: "2026-09-27", direction: "震荡下跌", primaryHexagram: "雷山小过", changingHexagram: "泽山咸", summary: "重心偏弱并寻找低位承接，反弹只作风险释放后的局部修复。", expectedPath: "反抽受限 → 重心下移 → 低位换手并观察止跌。", risks: ["妻财化兄弟", "酉月金旺克木"] }),
  ethSeptemberWeek({ id: "ETH-W9-20260928-V2", forecastType: "WEEK_9", periodStart: "2026-09-28", periodEnd: "2026-10-04", direction: "震荡上涨", primaryHexagram: "地火明夷", changingHexagram: "雷山小过", summary: "低位存在有限修复条件，但幅度受限，不能据此提前宣布趋势反转。", expectedPath: "低位整理 → 条件式修复 → 反弹受限并等待10月新证据。", risks: ["修复幅度有限", "跨月结构尚未确认"] }),
];

/**
 * Future-only revisions from the 2026-08-23 source review.
 *
 * Governance:
 * - Prior locked records remain in their original modules.
 * - Liuyao and Qimen are displayed as independent forecasts.
 * - Agreement raises method-consensus confidence; disagreement is retained and
 *   lowers confidence. Missing same-period evidence is never fabricated.
 * - The 2026-09-10 marker is a window anchor, not an exact-day promise.
 */
export const CRYPTO_SEPTEMBER_REVISIONS_20260823: ConvictionPeriodForecast[] = [
  {
    id: "BTC-SEP-20260823-V3",
    assetId: "bitcoin",
    forecastType: "MONTH_1",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    direction: "先涨后跌",
    upProbability: 34,
    sidewaysProbability: 31,
    downProbability: 35,
    summary:
      "9月高位判断得到六爻年度层与奇门酉月层同向支持。六爻年度层把9月列为2026年高点候选；奇门酉月层在前置结构未被破坏时继续看一轮拉升；新六爻泰六合化升支持先通后抬升，而既有9月遁卦提示见高后退守。综合不是整月单边上涨，而是先冲高、后震荡回落。",
    expectedPath:
      "9月上旬延续修复并试探高位 → 9月9日至11日进入第一重点高点/变盘窗口 → 中旬确认是否完成最终高点 → 若高位承接不足，9月中下旬转入退守、震荡或回落。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "9月上旬拉升后仍能保持高位承接，且9月9日至11日窗口后未快速跌回启动区",
    invalidationLevel: "进入酉月前关键结构已经被有效跌破，或窗口内没有形成任何上冲与高位换手",
    riskLevel: "极高",
    catalysts: ["六爻年度层将9月列为高点候选", "奇门酉月层给出条件性再拉升", "泰六合化升支持前段抬升"],
    risks: ["9月遁卦提示见高退守", "妻财发动后化兄弟，防利润兑现与资金分流", "阶段高点不等于全月最终高点", "精确日仍缺奇门日窗共振"],
    consensusStars: 4,
    consensusLabel: "六爻与奇门对9月高位同向；精确到9月10日仍未形成双方法确认",
    methodViews: [
      {
        id: "btc-sep-liuyao-annual-v3",
        label: "六爻·年度层",
        direction: "9月高点候选",
        weight: 35,
        summary: "老师原始流年资料把2026年9月列为全年重要高点候选，属于高周期背景。",
      },
      {
        id: "btc-sep-qimen-you-month-v3",
        label: "奇门·酉月独立预测",
        direction: "条件性上涨",
        weight: 35,
        summary: "若酉月前的回调没有破坏关键结构，酉月仍有一轮拉升；这是独立方向观点，不是六爻附属择时。",
      },
      {
        id: "btc-sep-liuyao-user-review-v3",
        label: "六爻·月内路径复核",
        direction: "先涨后跌",
        weight: 30,
        summary: "泰六合化升支持前段抬升，既有天山遁静卦补充高位后退守路径。",
      },
    ],
    keyDates: [
      {
        date: "2026-09-10",
        type: "阶段高点",
        label: "9月9日至11日第一重点高点/变盘窗口",
        source: "LIUYAO",
        confidence: 58,
        note: "9月10日只是窗口中心，不代表已锁定为三种资产共同的最终最高点；应保留前后至少1天容差。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "地天泰（六合）",
      changingHexagram: "地风升",
      notes:
        "2026-08-23精确问题卦：初爻妻财子水发动化兄弟丑土；与既有9月天山遁静卦合读为先抬升、后资金分流与退守。内部来源链：BTC-ANNUAL-2026、QIMEN-BTC-20260820、USER-BTC-20260823。",
    },
    rollingUpdate: {
      asOf: PUBLISHED_AT,
      label: "9月前瞻修订 · V3",
      summary:
        "新增老师六爻年度高点结论、奇门酉月独立方向和2026-08-23精确问题卦。原先的“8月底至9月上旬高点窗口”扩展为“9月上旬冲高、9月9日至11日重点观察、中下旬退守”。",
      originalLockedView: "BTC-M3-20260801-V2：8月底至9月上旬形成阶段高点或转折，9月中下旬转弱。",
      timingTolerance: "高点窗口按9月9日至11日观察；9月10日不是保证兑现的精确日。",
    },
    version: 3,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ETH-YOU-20260823-V2",
    assetId: "eth",
    forecastType: "MONTH_1",
    periodStart: "2026-09-07",
    periodEnd: "2026-10-07",
    direction: "先涨后跌",
    upProbability: 27,
    sidewaysProbability: 32,
    downProbability: 41,
    summary:
      "酉月恒化小过显示前期延续、随后过度与修正。五张新周卦把内部节奏进一步拆开：8月底至9月初先难后修复；9月7日至13日否化遁，冲高后退守风险最强；中下旬以高波动偏弱和有限修复为主。",
    expectedPath:
      "8月31日至9月6日先弱后修复 → 9月7日至13日先稳或冲高后退守，9月9日至11日为重点窗口 → 9月14日至20日高波动整理 → 9月21日至27日震荡偏弱 → 9月28日至10月4日低位有限修复。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "9月上旬修复后出现冲高受阻或高位换手，并在9月9日至11日后转弱",
    invalidationLevel: "9月7日至13日持续放量上行且回踩不破，否化遁的退守结构没有兑现",
    riskLevel: "极高",
    catalysts: ["8月31日至9月6日蹇化渐的后段修复", "酉月前段延续力量", "月底官鬼化财形成有限修复条件"],
    risks: ["9月7日至13日否化遁", "妻财化兄弟与酉月金旺克木", "中旬多爻同动放大波动", "没有同周期奇门盘，不能标记双方法共振"],
    consensusStars: 2,
    consensusLabel: "六爻月卦与周卦内部同向；同周期奇门证据缺失，暂不提高双方法信心",
    methodViews: [
      {
        id: "eth-you-month-liuyao-v2",
        label: "六爻·酉月",
        direction: "先涨后跌",
        weight: 50,
        summary: "恒化小过：前期状态延续，随后出现过度、修正和幅度受限。",
      },
      {
        id: "eth-september-weekly-liuyao-v2",
        label: "六爻·五周分段",
        direction: "上旬见高后转弱",
        weight: 50,
        summary: "蹇化渐、否化遁、观化井、小过化咸、明夷化小过共同给出先修复、后退守、月底弱修复。",
      },
    ],
    keyDates: [
      {
        date: "2026-09-10",
        type: "阶段高点",
        label: "9月9日至11日冲高受阻/退守候选窗口",
        source: "LIUYAO",
        confidence: 55,
        note: "按7×24自然日3/4/3切分，9月9日至11日属于9月7日至13日周卦中段；没有对应奇门日窗，因此不是双方法确认。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "雷风恒",
      changingHexagram: "雷山小过（游魂）",
      notes:
        "酉月主卦与五张周卦合读；不以卦名直接定涨跌，使用目标月令、动爻和3/4/3自然日分段。内部来源链：USER-ETH-YOU-20260823、USER-ETH-WEEKS-20260823。",
    },
    rollingUpdate: {
      asOf: PUBLISHED_AT,
      label: "酉月前瞻修订 · V2",
      summary:
        "原三个月版本只写“8月至9月偏强、9月易见阶段高点”。新增酉月卦和五张周卦后，细化为上旬修复并见高、中旬以后震荡偏弱、月底有限修复。",
      originalLockedView: "ETH-M3-20260801-V1：8月至9月偏强，9月更容易出现阶段高点。",
      timingTolerance: "9月9日至11日只作六爻窗口；取得同周期奇门盘后再判断共振或分歧。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "HYPE-AUTUMN-20260823-V7",
    assetId: "hype",
    forecastType: "MONTH_3",
    periodStart: "2026-09-01",
    periodEnd: "2026-12-31",
    direction: "震荡",
    upProbability: 31,
    sidewaysProbability: 38,
    downProbability: 31,
    summary:
      "秋季大方向仍保留旧版的多阶段切换，不改写既有记录。9月独立月卦晋提供推进背景，但五张新周卦显示推进不是直线：上旬由阻滞转为反弹，9月7日至13日复化明夷形成冲高转弱，中旬困局加深，下旬寻底修复，月底大过九五存在虚拉后回落风险。",
    expectedPath:
      "9月上旬先受阻后推进 → 9月7日至13日反弹后转弱，9月9日至11日重点观察 → 9月14日至20日承压 → 9月21日至27日下跌寻底并酝酿修复 → 9月28日至10月4日可能虚拉后再回落；10月至12月沿用既有独立月卦路线并继续等待新证据。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "9月上旬推进后在9月9日至11日出现高位受阻，中旬弱势结构继续兑现",
    invalidationLevel: "9月7日至20日持续强势突破且回踩不破，复化明夷与困化归妹的转弱路径没有兑现",
    riskLevel: "极高",
    catalysts: ["9月月卦晋的推进背景", "8月31日至9月6日否化晋", "9月21日至27日坤化复的后续修复种子"],
    risks: ["9月7日至13日复化明夷", "9月14日至20日困化归妹且财化官鬼", "单坤七日内先按寻底处理", "月底大过九五虚拉后回落", "没有同周期奇门盘"],
    consensusStars: 2,
    consensusLabel: "月卦与周卦共同支持先推进后转弱；缺少HYPE同周期奇门盘，不标记双方法共振",
    methodViews: [
      {
        id: "hype-sep-month-liuyao-v7",
        label: "六爻·9月背景",
        direction: "推进但不单边",
        weight: 40,
        summary: "火地晋提供月度推进背景，但不能只凭卦名判为整月上涨。",
      },
      {
        id: "hype-sep-weekly-liuyao-v7",
        label: "六爻·五周分段",
        direction: "上旬冲高后转弱",
        weight: 60,
        summary: "否化晋、复化明夷、困化归妹、坤化复、大过化小过给出上旬推进、中旬转弱、下旬寻底与月底虚拉风险。",
      },
    ],
    keyDates: [
      {
        date: "2026-09-10",
        type: "阶段高点",
        label: "9月9日至11日反弹转弱候选窗口",
        source: "LIUYAO",
        confidence: 54,
        note: "这是7×24自然日3/4/3中段窗口；不能写成HYPE与BTC、ETH必然在同一天形成最终最高点。",
      },
    ],
    calendarMonthPath: [
      {
        period: "2026-09",
        labelZh: "2026年9月",
        direction: "先涨后跌",
        primaryHexagram: "火地晋（游魂）",
        changingHexagram: null,
        summary: "月度有推进背景，但五张周卦细化为上旬推进、9月7日至13日转弱、中旬承压、下旬寻底修复、月底虚拉风险。",
        sourceNote: "2026-08-09月卦 + 2026-08-23五张周卦前瞻修订",
        riskNote: "9月9日至11日只是重点窗口；缺同周期奇门盘，不构成双方法共振。",
      },
      {
        period: "2026-10",
        labelZh: "2026年10月",
        direction: "上涨",
        primaryHexagram: "乾为天（六冲）",
        changingHexagram: "火雷噬嗑",
        summary: "保留旧版：力量释放并尝试突破阻力，但六冲意味着急涨急洗。",
        sourceNote: "HYPE独立10月卦，沿用V6",
        riskNote: "新材料只修订9月，不提前改写10月。",
      },
      {
        period: "2026-11",
        labelZh: "2026年11月",
        direction: "下跌",
        primaryHexagram: "水火既济",
        changingHexagram: "泽山咸",
        summary: "保留旧版：阶段完成后转弱，兄弟得令且财伏，月度风险较高。",
        sourceNote: "HYPE独立11月卦，沿用V6",
        riskNote: "等待11月前新增老师资料复核。",
      },
      {
        period: "2026-12",
        labelZh: "2026年12月",
        direction: "震荡下跌",
        primaryHexagram: "火雷噬嗑",
        changingHexagram: "雷天大壮（六冲）",
        summary: "保留旧版：争夺与快速反抽并存，但主方向仍偏弱。",
        sourceNote: "HYPE独立12月卦，沿用V6",
        riskNote: "不是温和阴跌，注意杀跌后暴力反抽。",
      },
      {
        period: "2026-08-31/2026-09-06",
        labelZh: "8/31–9/6",
        direction: "先跌后涨",
        primaryHexagram: "天地否",
        changingHexagram: "火地晋（游魂）",
        summary: "前段先受阻并释放压力，随后转入推进和修复；月度晋卦只提供背景，不把后段修复外推成整月直线上涨。",
        sourceNote: "2026-08-23独立周卦",
        riskNote: "周初阻滞可能放大高波动，后段修复仍需价格结构确认。",
      },
      {
        period: "2026-09-07/2026-09-13",
        labelZh: "9/7–9/13",
        direction: "先涨后跌",
        primaryHexagram: "地雷复",
        changingHexagram: "地火明夷（游魂）",
        summary: "前段延续复卦修复，9月9日至11日进入高位分歧窗口，后段按明夷转弱处理。",
        sourceNote: "2026-08-23独立周卦",
        riskNote: "高点窗口有日期容差，不等于9月10日必为最终最高点。",
      },
      {
        period: "2026-09-14/2026-09-20",
        labelZh: "9/14–9/20",
        direction: "下跌",
        primaryHexagram: "泽水困",
        changingHexagram: "雷泽归妹（归魂）",
        summary: "困局延续且财爻转官鬼，承接转为风险；归妹与归魂增加错配和反复，但不改变周度偏弱。",
        sourceNote: "2026-08-23独立周卦",
        riskNote: "弱势中仍可能急反，不把单日反弹解释为周方向反转。",
      },
      {
        period: "2026-09-21/2026-09-27",
        labelZh: "9/21–9/27",
        direction: "先跌后涨",
        primaryHexagram: "坤为地（六冲）",
        changingHexagram: "地雷复（六合）",
        summary: "六冲先放大下探和分歧，随后复卦与六合提供寻底后的修复条件。",
        sourceNote: "2026-08-23独立周卦",
        riskNote: "先按寻底处理，修复需要真实止跌结构确认。",
      },
      {
        period: "2026-09-28/2026-10-04",
        labelZh: "9/28–10/4",
        direction: "先涨后跌",
        primaryHexagram: "泽风大过",
        changingHexagram: "雷山小过",
        summary: "大过九五支持前段虚拉或冲高，但承载过重；转小过后回到谨慎收缩，后段防回落。",
        sourceNote: "2026-08-23独立周卦",
        riskNote: "跨月周不提前改写10月独立月卦，只记录本周先扬后抑路径。",
      },
    ],
    archiveSummary: "9–12月V7：9月上旬推进后转弱，10月等待原主升窗口验证，11月偏弱，12月高波动偏空。",
    ichingEvidence: {
      primaryHexagram: "火地晋（游魂）",
      changingHexagram: null,
      notes:
        "9月月卦与五张周卦合读；单坤和大过九五按老师专属规则处理。内部来源链：USER-HYPE-MONTH-20260809、USER-HYPE-WEEKS-20260823。",
    },
    rollingUpdate: {
      asOf: PUBLISHED_AT,
      label: "9月分段修订 · V7",
      summary:
        "不改变旧版9月高位消化偏弱的方向，只补齐上旬推进、9月7日至13日转弱、中旬承压、下旬寻底修复和月底虚拉风险。",
      originalLockedView: "HYPE-AUTUMN-20260901-V6：9月高位消化、震荡偏空。",
      timingTolerance: "9月9日至11日只作六爻候选窗口；同周期奇门证据缺失。",
    },
    version: 7,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
];

export function listCryptoSeptemberForecastRevisions20260823(assetId: "btc" | "eth" | "hype") {
  const storedAssetId = assetId === "btc" ? "bitcoin" : assetId;
  return [...CRYPTO_SEPTEMBER_REVISIONS_20260823, ...ETH_SEPTEMBER_WEEKLY_REVISIONS_20260823].filter(
    (forecast) => forecast.assetId === storedAssetId && forecast.status === "published",
  );
}
