import { PUBLISHED_WEEKLY_ANALYSES_20260824 } from "@/lib/data/published-weekly-analysis-20260824";
import type { WeeklyAnalysisRecord } from "@/types/weekly-analysis";

const PUBLISHED_AT = "2026-08-23T16:20:00+08:00";

function previous(assetId: "bitcoin" | "sp500" | "nasdaq-100"): WeeklyAnalysisRecord {
  const record = PUBLISHED_WEEKLY_ANALYSES_20260824.find((item) => item.assetId === assetId);
  if (!record) throw new Error(`Missing locked 2026-08-24 weekly record for ${assetId}`);
  return record;
}

const previousBtc = previous("bitcoin");
const previousSpx = previous("sp500");
const previousNdx = previous("nasdaq-100");

export const WEEKLY_RESEARCH_REVISION_NOTE_20260824 = {
  zh: "8月23日事前复核后，周度/阶段六爻恢复为正式方向唯一负责人：BTC与纳指为风险释放后修复，标普为先修复后兑现。奇门只保留时间、波动和尾部风险；老师月卦与半月卦提供更高周期背景。黄金、白银继续采用贵金属专项老师周卦。所有旧稿保留供复盘，会员端只显示最新有效结论。",
  en: "After the Aug 23 forward review, weekly/stage Liu Yao is again the sole owner of formal weekly direction: BTC and NDX favor repair after risk release, while SPX favors repair followed by profit taking. Qimen only supplies timing, volatility and tail risk; teacher monthly/half-month readings provide higher-horizon context. Gold and silver keep their specialist teacher weekly charts. Prior records remain archived while members see the latest effective call.",
} as const;

/**
 * Pre-week revisions after the Aug 23 folder audit. Weekly/stage Liu Yao owns
 * direction. Qimen, macro and public analysts only refine timing and risk.
 */
export const WEEKLY_RESEARCH_REVISIONS_20260823: WeeklyAnalysisRecord[] = [
  {
    ...previousBtc,
    id: "WEEKLY-BTC-20260824-V4",
    overallDirection: "探底回升",
    weeklyPath: "周卦妻财未土动化妻财戌土，正式周方向仍是风险释放后企稳修复。奇门保留某一日急跌的尾部风险，但只负责风险窗口，不能覆盖周卦；老师半月卦又把更高周期指向9月主要高点验证，因此合并路径为：先防急跌或下探，结构止跌后修复并继续向9月高点区推进。",
    headline: "BTC下周先防急跌，风险释放后看修复；9月高点背景不等于本周无回撤。",
    probabilities: { up: 38, flat: 37, down: 25 },
    strongWindow: "急跌或回踩后，4小时环境稳定且30分钟、5分钟依次完成右侧止跌时",
    weakWindow: "周卦修复启动前的风险释放段，以及奇门提示的单日急跌窗口",
    basisWeights: {
      technical: 0,
      liuyao: 80,
      cycle: 5,
      qimen: 15,
      macro: 0,
      bazi: 0,
      note: "正式方向由BTC 8/24-30周卦负责；老师半月/年度卦提供9月高点背景。奇门只保留急跌风险窗口，技术只确认止跌和失效。",
    },
    invalidation: "若风险释放后仍持续创新低且无法收回30分钟主结构，探底回升失效；若整周直接上冲，也只记为第一段未出现，不倒推虚构急跌。",
    confirmation: "周卦给方向，奇门给风险时段，4小时→30分钟→5分钟只做结构确认；任何一层都不能凭空生成价格点位或自动触发实盘。",
    catalysts: ["财爻连续", "风险释放后的修复", "老师半月卦延续至9月高点背景"],
    risks: ["单日急跌尾险", "父母持世导致追涨不足", "九月高点预期被提前交易"],
    confidence: 72,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    sourceIds: ["BTC-W4-20260824-V2", "T01-BTC-NDX-20260819-0907", "MOOX-BTC-SEP-HIGH-20260823", "WU-QIMEN-WEEK-20260824-BTC"],
    version: 4,
    originalLocked: true,
    revisions: [
      ...(previousBtc.revisions ?? []),
      { version: previousBtc.version, previousContent: `${previousBtc.overallDirection}｜${previousBtc.weeklyPath}`, changedAt: PUBLISHED_AT, reason: "目标周开始前按治理规则纠正来源顺序：周卦拥有方向，奇门只做风险/时间辅助；并加入老师半月卦与9月专问卦的高周期同向验证。" },
    ],
  },
  {
    ...previousSpx,
    id: "WEEKLY-SPX-20260824-V3",
    overallDirection: "先涨后跌",
    weeklyPath: "8月24日至30日周卦为财化兄的冲高兑现结构，正式方向据此定为先涨后跌。奇门的乙加丁仅保留前段修复分支，坎水压丁与高分化用于提示回落风险；8月19日老师完整月卦又判未来一个月卖压偏强，因此本周若出现修复，更应防冲高后回吐。",
    headline: "标普下周先修复后防回吐：周卦财化兄，老师月卦同步提高卖压风险。",
    probabilities: { up: 28, flat: 32, down: 40 },
    strongWindow: "前段修复分支兑现、市场宽度与权重同步改善时",
    weakWindow: "修复后市场宽度转弱、财化兄兑现或关键结构失守时",
    basisWeights: {
      technical: 0,
      liuyao: 85,
      cycle: 0,
      qimen: 10,
      macro: 5,
      bazi: 0,
      note: "方向由8/24-30周卦负责，老师8/19未来一月完整月卦提高下行风险；奇门和宏观只细化修复/回落分支，不反转方向。",
    },
    invalidation: "若前段不修复而直接下跌，第一段失效但偏弱背景仍保留；若整周持续放量上行并站稳、没有财化兄回吐，则先涨后跌路径失效。",
    confirmation: "先观察真实修复，再用4小时和30分钟确认冲高是否站稳；外部季节性和事件观点不能单独触发交易。",
    catalysts: ["乙加丁修复分支", "事件缓和后的反弹"],
    risks: ["周卦财化兄", "老师月卦卖压偏强", "中期选举年九月波动风险", "机构低现金限制新增买力"],
    confidence: 76,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    sourceIds: ["ORACLE-SPX-AUG-20260801", "T-AUTUMN-SPX-20260819-0918", "ANON-US-MACRO-SEP-20260822", "ANON-US-FLOW-20260821", "WU-QIMEN-WEEK-20260824-SPX"],
    version: 3,
    originalLocked: true,
    revisions: [
      ...(previousSpx.revisions ?? []),
      { version: previousSpx.version, previousContent: `${previousSpx.overallDirection}｜${previousSpx.weeklyPath}`, changedAt: PUBLISHED_AT, reason: "目标周开始前收到老师完整月卦并完成来源治理复核；周卦财化兄继续拥有周方向，奇门降为时间/风险辅助。" },
    ],
  },
  {
    ...previousNdx,
    id: "WEEKLY-NDX-20260824-V3",
    overallDirection: "探底回升",
    weeklyPath: "纳指周卦伏财显出、兄弟化财，正式方向继续是风险释放后修复。老师半月卦允许上冲延续至9月上旬，但明确高位难以站稳；九月兑为泽六冲月卦又偏弱。因此下周可做修复周理解，但只在下探止跌后确认，不把周内反弹外推成九月主升。",
    headline: "纳指下周仍看探底回升，但高位难站稳；周修复与九月转弱并不矛盾。",
    probabilities: { up: 38, flat: 37, down: 25 },
    strongWindow: "风险释放并完成30分钟、5分钟右侧止跌后",
    weakWindow: "科技权重共振下压，或修复后高位承接快速减弱时",
    basisWeights: {
      technical: 0,
      liuyao: 90,
      cycle: 0,
      qimen: 5,
      macro: 5,
      bazi: 0,
      note: "8/24-30纳指周卦和老师半月卦共同负责方向与高位约束；美股广义奇门和外部半导体观点只提高风险。",
    },
    invalidation: "若风险释放后持续创新低且无法收回30分钟主结构，探底回升失效；若冲高后稳定站住，则‘高位难稳’留待九月月度复盘，不提前改写。",
    confirmation: "等待纳指自身4小时环境与30分钟/5分钟结构确认；不把标普或BTC的时点直接复制给纳指。",
    catalysts: ["伏财显出", "兄弟化财", "半月卦上冲分支"],
    risks: ["九月兑为泽六冲月卦偏弱", "高位难以站稳", "半导体相对弱势"],
    confidence: 72,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    sourceIds: ["ORACLE-NDX-AUG-20260801", "T01-NDX-20260819-0907", "ORACLE-NDX-SEP-20260801", "ANON-US-STRUCTURE-20260821"],
    version: 3,
    originalLocked: true,
    revisions: [
      ...(previousNdx.revisions ?? []),
      { version: previousNdx.version, previousContent: `${previousNdx.overallDirection}｜${previousNdx.weeklyPath}`, changedAt: PUBLISHED_AT, reason: "目标周开始前加入老师半月卦，明确周度修复与九月偏弱属于不同周期，不互相覆盖。" },
    ],
  },
];
