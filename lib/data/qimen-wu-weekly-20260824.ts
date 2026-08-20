/**
 * Structured, source-bounded Wu Changye Qimen weekly calibration for
 * 2026-08-24 → 2026-08-29.  Generated from the user's supplied VTT/screenshots.
 * No price target or asset call is invented when the teacher did not state one.
 */
export const WU_QIMEN_WEEKLY_20260824_VERSION = "WU_QIMEN_WEEKLY_20260824_V1" as const;

export type WuWeeklyDirectionCode = "UP" | "DOWN" | "SIDEWAYS" | "UNSPECIFIED";
export type WuWeeklyVolatility = "MEDIUM" | "HIGH" | "EXTREME";
export type WuWeeklyTailRisk = "NORMAL" | "ELEVATED" | "HIGH" | "EXTREME";

export type WuWeeklyCalibration = {
  asset: string;
  directionCode: WuWeeklyDirectionCode;
  directionZh: string;
  volatility: WuWeeklyVolatility;
  downsideTail: WuWeeklyTailRisk;
  pathOrder: "KNOWN" | "UNKNOWN";
  summaryZh: string;
  sourceWindow: string;
};

const CALIBRATIONS: Readonly<Record<string, WuWeeklyCalibration>> = Object.freeze({
  BTC: {
    asset: "BTC", directionCode: "SIDEWAYS", directionZh: "高波动震荡/分化", volatility: "EXTREME", downsideTail: "EXTREME", pathOrder: "UNKNOWN",
    summaryZh: "戊壬并看；壬加辛、九地、天柱对应窄幅盘整后多空分化，并保留某日暴跌尾险；老师明确不知道先上冲再跌还是直接跌。",
    sourceWindow: "00:15:22-00:16:35",
  },
  SPX: {
    asset: "SPX", directionCode: "SIDEWAYS", directionZh: "高波动分化", volatility: "EXTREME", downsideTail: "ELEVATED", pathOrder: "KNOWN",
    summaryZh: "丁火居中；乙加丁有修复分支，转坎受水克又有下压分支，老师定义为超级大分化而非单边。",
    sourceWindow: "00:12:17-00:12:59",
  },
  SOX: {
    asset: "SOX", directionCode: "SIDEWAYS", directionZh: "高风险震荡", volatility: "HIGH", downsideTail: "ELEVATED", pathOrder: "KNOWN",
    summaryZh: "癸水配乙、天心有保护意图但能量弱，老师形容为火中取栗。",
    sourceWindow: "00:12:59-00:13:32",
  },
  SHCOMP: {
    asset: "SHCOMP", directionCode: "SIDEWAYS", directionZh: "宽幅震荡", volatility: "HIGH", downsideTail: "ELEVATED", pathOrder: "KNOWN",
    summaryZh: "A股明确看己土；白虎天蓬上压、下方有托底，4000附近压力明显，主状态为宽幅震荡。",
    sourceWindow: "00:13:32-00:14:27",
  },
  A500: {
    asset: "A500", directionCode: "DOWN", directionZh: "短线偏弱/可卖", volatility: "HIGH", downsideTail: "HIGH", pathOrder: "KNOWN",
    summaryZh: "甲申庚结构，老师明确短线已经可以卖；长期看好与短线退出分开。",
    sourceWindow: "00:14:27-00:14:47",
  },
  STAR50: {
    asset: "STAR50", directionCode: "SIDEWAYS", directionZh: "震荡/下方承接", volatility: "HIGH", downsideTail: "ELEVATED", pathOrder: "KNOWN",
    summaryZh: "科创50按己土；约1500为本期资料的条件性买入机会，未到价时不固化方向。",
    sourceWindow: "00:14:47-00:15:01",
  },
  HSTECH: {
    asset: "HSTECH", directionCode: "DOWN", directionZh: "短线轻微向下", volatility: "HIGH", downsideTail: "ELEVATED", pathOrder: "KNOWN",
    summaryZh: "庚下临癸泄气，近期可能轻微向下调整；老师明确长期大方向仍看多。",
    sourceWindow: "00:15:01-00:15:22",
  },
  GOLD: {
    asset: "GOLD", directionCode: "DOWN", directionZh: "小幅回调", volatility: "HIGH", downsideTail: "ELEVATED", pathOrder: "KNOWN",
    summaryZh: "辛金能量不足且落离宫受克，老师判断近期小回调；回调不等同长期转空。",
    sourceWindow: "00:16:35-00:17:08",
  },
});

function canonicalAsset(input: string): string | null {
  const code = input.toUpperCase();
  if (/^BTC|BITCOIN|比特币/.test(code)) return "BTC";
  if (/^SPX|S&P|标普/.test(code)) return "SPX";
  if (/SOX|SOXX|费城半导体|PHLX/.test(code)) return "SOX";
  if (/SHCOMP|SSEC|000001|上证|A股/.test(code)) return "SHCOMP";
  if (/CSI.?A?500|A500|中证A500/.test(code)) return "A500";
  if (/STAR.?50|科创50|000688/.test(code)) return "STAR50";
  if (/HSTECH|恒生科技/.test(code)) return "HSTECH";
  if (/^GOLD|XAU|GC=F|GLD|黄金/.test(code)) return "GOLD";
  return null;
}

export function getWuWeeklyCalibration(asset: string, targetDate: string): WuWeeklyCalibration | null {
  if (targetDate < "2026-08-24" || targetDate > "2026-08-29") return null;
  const key = canonicalAsset(asset);
  return key ? CALIBRATIONS[key] ?? null : null;
}

export type WuWeeklyEventWindow = {
  date: string;
  ganzhi: string;
  branch: string;
  kind: "RESCUE_SUPPORT" | "DOWNSIDE_BLACK_SWAN_RISK";
  noteZh: string;
};

export const WU_QIMEN_WEEKLY_EVENT_WINDOWS_20260824: readonly WuWeeklyEventWindow[] = [
  {
    date: "2026-08-26", ganzhi: "庚午", branch: "午", kind: "RESCUE_SUPPORT",
    noteZh: "寅午戌为老师提示的救市/托底可能窗口；只提高修复概率，不等于确定上涨。",
  },
  {
    date: "2026-08-27", ganzhi: "辛未", branch: "未", kind: "DOWNSIDE_BLACK_SWAN_RISK",
    noteZh: "亥卯未为老师提示的下跌/小黑天鹅风险窗口；只提高风险等级，不等于确定收跌。",
  },
] as const;

export function getWuWeeklyEventWindow(targetDate: string): WuWeeklyEventWindow | null {
  return WU_QIMEN_WEEKLY_EVENT_WINDOWS_20260824.find((item) => item.date === targetDate) ?? null;
}

export const WU_QIMEN_WEEKLY_NOT_EXPLICITLY_COVERED = ["ETH", "NDX", "SILVER", "WTI"] as const;
