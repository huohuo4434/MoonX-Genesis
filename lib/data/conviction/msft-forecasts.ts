import {
  ASTEROID_PERIOD_LABELS,
  type ConvictionForecastType,
  type ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";

const PUBLISHED_AT = "2026-08-09T06:47:00+08:00";

export const MSFT_VISIBLE_PERIOD_ORDER: ConvictionForecastType[] = ["WEEK", "WEEK_2", "WEEK_3", "MONTH_1"];
export const MSFT_PERIOD_ORDER: ConvictionForecastType[] = ["WEEK", "WEEK_2", "WEEK_3", "MONTH_1", "MONTH_3"];

/**
 * MSFT V2 preserves the previous one-month V1 in vibe-focus-forecasts.ts.
 * This file is the expanded multi-horizon dossier produced after the Aug 8 re-analysis.
 * The 8/8 external-video price boxes are a technical reference only; they do not overwrite Liu Yao.
 */
export const MSFT_PERIOD_FORECASTS: ConvictionPeriodForecast[] = [
  {
    id: "MSFT-W1-20260810-V2",
    assetId: "msft",
    forecastType: "WEEK",
    periodStart: "2026-08-10",
    periodEnd: "2026-08-16",
    direction: "震荡上涨",
    upProbability: 57,
    sidewaysProbability: 28,
    downProbability: 15,
    summary:
      "地风升→地天泰（六合），初爻发动。主卦、动爻与变卦都支持前段继续抬升，是当前微软多周期组里最明确的偏强周；但财报重估后已处高位，不能把好卦机械解释成连续暴涨。",
    expectedPath:
      "周初优先看强势确认 → 中段延续但逐渐进入高位换手 → 周后段若无法有效消化压力，转为震荡或获利回吐。",
    supportLevels: [
      "367–373（8/8外部技术视频：此前重压力突破区，属于远端中期结构锚，不作为短线止损）",
    ],
    resistanceLevels: [
      "500–510（8/8外部技术视频：当前压力箱体；只作为技术方法票，需用实时价格确认）",
    ],
    confirmationLevel: "高位压力区被有效消化，回踩后仍能收回并维持高低点抬升。",
    invalidationLevel: "高位放量长阴跌回突破结构，并出现连续低点下移。",
    riskLevel: "中高",
    catalysts: ["Azure与企业软件增长", "AI商业化", "财报后资金重估", "软件板块相对强度"],
    risks: ["高位估值", "财报后获利盘", "500–510技术压力", "资本开支与宏观风险"],
    consensusStars: 5,
    consensusLabel: "升→泰与初爻发动共同支持前段偏强；技术压力只用于确认强度",
    methodViews: [
      {
        id: "msft-liuyiao-w1-v2",
        label: "六爻·周度结构",
        direction: "震荡上涨",
        weight: 80,
        summary: "升卦初爻‘允升’且变泰六合，方向与时序都更偏向周前段发力。",
      },
      {
        id: "msft-external-tech-20260808",
        label: "外部技术视频·8/8",
        direction: "压力确认",
        weight: 20,
        summary: "视频把500–510标为下一压力箱体；仅作独立技术参考，不替代实时K线与六爻。",
      },
    ],
    rollingUpdate: {
      asOf: PUBLISHED_AT,
      label: "V2多周期扩展",
      summary: "旧版只覆盖一个月。V2新增连续三周、月度与3个月结构；周内逐日为周卦时序拆分，不是独立日卦。",
      originalLockedView: "MSFT-M1-20260803-V1 保留在旧数据文件，不覆盖。",
      timingTolerance: "逐日拆分仅用于周内节奏观察，最终以真实量价确认。",
    },
    dailyPath: [
      { date: "2026-08-10", status: "预测", direction: "上涨", consensusStars: 4, summary: "初爻发动更偏周初先表态，重点看高位压力能否被消化。", confirmation: "放量突破后不快速跌回", riskNote: "周卦拆分，不是独立日卦" },
      { date: "2026-08-11", status: "预测", direction: "震荡上涨", consensusStars: 4, summary: "若周一确认有效，延续概率仍高，但高位换手开始增加。", confirmation: "低点抬高且回踩有承接", riskNote: "高位急拉不追" },
      { date: "2026-08-12", status: "预测", direction: "震荡上涨", consensusStars: 4, summary: "趋势延续与换手并存，更适合观察承接质量而非只看涨幅。", riskNote: "若量价背离则降低强度判断" },
      { date: "2026-08-13", status: "预测", direction: "震荡", consensusStars: 3, summary: "进入周后段后，强势卦仍在，但更容易出现高位分歧与整理。", riskNote: "冲高滞涨时防获利回吐" },
      { date: "2026-08-14", status: "预测", direction: "冲高回落", consensusStars: 3, summary: "若前四天已经充分上行，周五更偏向冲高后的再平衡；若前段未涨则此判断需下调。", riskNote: "条件式周卦拆分，不作独立日卦使用" },
    ],
    ichingEvidence: {
      primaryHexagram: "地风升",
      changingHexagram: "地天泰（六合）",
      notes: "初爻发动，卦意与动爻先定方向；目标申月只修正力度，不把‘升→泰’硬翻成下跌。高位环境要求技术确认。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "MSFT-W2-20260817-V1",
    assetId: "msft",
    forecastType: "WEEK_2",
    periodStart: "2026-08-17",
    periodEnd: "2026-08-23",
    direction: "震荡上涨",
    upProbability: 43,
    sidewaysProbability: 38,
    downProbability: 19,
    summary:
      "兑为泽（六冲）→泽雷随（归魂），二爻发动且爻辞偏吉。这里不能见六冲就直接判空，更像高位快速洗盘、急涨急跌和分歧扩大；洗完以后仍有随主趋势运行的倾向。",
    expectedPath: "高位剧烈震荡或明显回踩 → 承接确认 → 若结构未坏则重新跟随主趋势。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "快速回踩后重新收回关键平台，并出现缩量止跌或低点抬高。",
    invalidationLevel: "六冲演变为持续放量破位，反弹无法收回前一平台。",
    riskLevel: "高",
    catalysts: ["强势趋势惯性", "软件龙头资金承接"],
    risks: ["六冲高波动", "高位获利盘", "急涨急跌"],
    consensusStars: 4,
    consensusLabel: "二爻吉与随卦支持洗盘后仍有承接，但波动明显高于前一周",
    methodViews: [
      { id: "msft-liuyiao-w2", label: "六爻·周度结构", direction: "剧震偏强", weight: 100, summary: "兑六冲强调波动，二爻与变随保留洗后继续的可能。" },
    ],
    ichingEvidence: {
      primaryHexagram: "兑为泽（六冲）",
      changingHexagram: "泽雷随（归魂）",
      notes: "九二‘孚兑，吉，悔亡’。低位动爻的六冲需分辨是破坏还是洗盘，不能只凭六冲二字判跌。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "MSFT-W3-20260824-V1",
    assetId: "msft",
    forecastType: "WEEK_3",
    periodStart: "2026-08-24",
    periodEnd: "2026-08-30",
    direction: "探底回升",
    upProbability: 35,
    sidewaysProbability: 38,
    downProbability: 27,
    summary:
      "风水涣→风火家人，下三爻连续发动。涣先表现为资金、筹码和方向的分散，但三个动爻并非一路凶，变家人又回到秩序，因此更像月末先释放、再稳定，而不是直接崩坏。",
    expectedPath: "前半周分歧放大、回撤或快速释放 → 后半周重新收拢 → 月底观察是否建立新平衡。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "回撤后波动收敛并重新形成横向平台。",
    invalidationLevel: "分散结构持续恶化，后半周仍无法停止低点下移。",
    riskLevel: "高",
    catalysts: ["回撤后的筹码再平衡"],
    risks: ["资金分散", "月底获利兑现", "高位结构破坏"],
    consensusStars: 4,
    consensusLabel: "涣先散、家人后收，路径更偏先释放再稳定",
    methodViews: [
      { id: "msft-liuyiao-w3", label: "六爻·周度结构", direction: "先弱后稳", weight: 100, summary: "涣对应先散，家人对应重新收拢秩序。" },
    ],
    ichingEvidence: {
      primaryHexagram: "风水涣",
      changingHexagram: "风火家人",
      notes: "初、二、三爻同动；初爻偏救援、九二悔亡、六三无悔，因此先释放但并非一路恶化。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "MSFT-M1-20260808-V2",
    assetId: "msft",
    forecastType: "MONTH_1",
    periodStart: "2026-08-08",
    periodEnd: "2026-09-03",
    direction: "先涨后跌",
    upProbability: 45,
    sidewaysProbability: 35,
    downProbability: 20,
    summary:
      "水地比→风雷益，初爻与上爻同时发动：前段认同与资金聚集增强，末端财转压力。结合三段周卦，8月更像前半段上行、随后剧震、月底回撤整理，而不是整月单边上涨。",
    expectedPath: "前半月延续重估 → 中旬高位剧烈换手 → 月末分散与回撤 → 进入9月前重新寻找平衡。",
    supportLevels: ["367–373（外部技术视频远端结构锚）"],
    resistanceLevels: ["500–510（8/8外部技术视频压力箱体，需实时确认）"],
    confirmationLevel: "前半月趋势延续时，高位压力被消化且回踩有承接。",
    invalidationLevel: "周初即持续放量破位，导致升→泰的第一周结构无法兑现。",
    riskLevel: "高",
    catalysts: ["财报重估", "Azure与AI商业化", "软件资金轮动"],
    risks: ["月末财转压力", "高估值", "获利盘", "宏观波动"],
    consensusStars: 5,
    consensusLabel: "月卦首尾动爻与三段周卦拼成一致的前强后震路径",
    methodViews: [
      { id: "msft-liuyiao-month-v2", label: "六爻·月度结构", direction: "先涨后跌", weight: 80, summary: "比→益总体不空，但初、上爻同时发动把前段增益与末端压力清晰分开。" },
      { id: "msft-external-tech-month-20260808", label: "外部技术视频·8/8", direction: "高位压力确认", weight: 20, summary: "500–510为视频标注压力箱体，仅作为技术确认来源。" },
    ],
    ichingEvidence: {
      primaryHexagram: "水地比",
      changingHexagram: "风雷益",
      notes: "初爻从分歧/竞争转资金承接，上爻财转官鬼压力。月卦不否定总体增益，但明确提示后段风险。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "MSFT-M3-20260808-V1",
    assetId: "msft",
    forecastType: "MONTH_3",
    periodStart: "2026-08-08",
    periodEnd: "2026-10-31",
    direction: "先涨后跌",
    upProbability: 34,
    sidewaysProbability: 33,
    downProbability: 33,
    summary:
      "三个月不是单边方向：8月偏强但后程降温；9月雷山小过→地山谦更像高位收敛和偏弱消化；10月泽水困→泽风大过是当前最值得防范的压力窗口。",
    expectedPath: "8月先强后震 → 9月高位降温与回撤 → 10月若仍处高位，结构压力可能进一步释放。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "9月回撤保持可控，10月前形成新的低波动平台。",
    invalidationLevel: "若9月即出现趋势性破位，则10月风险可能提前；若10月强势突破，则压力月判断失效。",
    riskLevel: "高",
    catalysts: ["企业软件与云业务兑现", "AI收入持续改善"],
    risks: ["9月降温", "10月困→大过", "高估值承载压力"],
    archiveSummary: "8月盛、9月收、10月压力释放；现有年内总卦同时提示更后段仍有重新转强可能，需等后续月卦确认。",
    consensusStars: 4,
    consensusLabel: "9月与10月两张月卦连续降级，风险窗口具有较高一致性",
    methodViews: [
      { id: "msft-sep", label: "9月六爻", direction: "震荡下跌", weight: 45, summary: "小过→谦：过热后收敛，官鬼持世，财爻伏藏。" },
      { id: "msft-oct", label: "10月六爻", direction: "下跌", weight: 55, summary: "困→大过且三爻凶，高位环境下更偏承载压力释放。" },
    ],
    ichingEvidence: {
      primaryHexagram: "雷山小过→地山谦；泽水困→泽风大过",
      changingHexagram: "9月收敛；10月承载压力",
      notes: "9月四爻提示往厉必戒；10月困六三‘困于石…凶’，并变大过。特殊卦需结合高位环境处理。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
];

export function listMsftPeriodForecasts() {
  return MSFT_PERIOD_FORECASTS.filter((item) => item.status === "published");
}

export function msftPeriodMeta() {
  const periods = listMsftPeriodForecasts();
  return MSFT_VISIBLE_PERIOD_ORDER.map((type) => ({
    type,
    labelZh: ASTEROID_PERIOD_LABELS[type].zh,
    emptyZh: ASTEROID_PERIOD_LABELS[type].emptyZh,
    hasResearch: periods.some((item) => item.forecastType === type),
  }));
}
