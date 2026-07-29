/**
 * Asia/Shanghai day stem/branch (干支) — deterministic, no network.
 * Based on Julian day offset from known anchor 1984-02-02 = 甲子日.
 */

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
const STEM_ELEMENT: Record<(typeof STEMS)[number], string> = {
  甲: "木",
  乙: "木",
  丙: "火",
  丁: "火",
  戊: "土",
  己: "土",
  庚: "金",
  辛: "金",
  壬: "水",
  癸: "水",
};

/** Civil date → UTC noon ms (calendar arithmetic only). */
function utcNoonMs(y: number, m: number, d: number): number {
  return Date.UTC(y, m - 1, d, 12, 0, 0);
}

/** Days since Unix epoch for a YYYY-MM-DD calendar date. */
function dayIndex(iso: string): number {
  const [ys, ms, ds] = iso.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  return Math.floor(utcNoonMs(y, m, d) / 86_400_000);
}

/** 1984-02-02 = 甲子 (index 0). */
const ANCHOR_ISO = "1984-02-02";
const ANCHOR_INDEX = dayIndex(ANCHOR_ISO);

export type DayGanzhi = {
  calendarDateChina: string;
  dayStem: string;
  dayBranch: string;
  dayElement: string;
  ganzhiLabel: string;
  stemIndex: number;
  branchIndex: number;
};

export function getDayGanzhi(isoDate: string): DayGanzhi {
  const offset = ((dayIndex(isoDate) - ANCHOR_INDEX) % 60 + 60) % 60;
  const stemIndex = offset % 10;
  const branchIndex = offset % 12;
  const dayStem = STEMS[stemIndex]!;
  const dayBranch = BRANCHES[branchIndex]!;
  return {
    calendarDateChina: isoDate,
    dayStem,
    dayBranch,
    dayElement: STEM_ELEMENT[dayStem],
    ganzhiLabel: `${dayStem}${dayBranch}`,
    stemIndex,
    branchIndex,
  };
}

/** Soft relation helper — never sole direction driver. */
export function relateGanzhiToWeeklyDirection(
  day: DayGanzhi,
  weeklyDirection: string
): "增强" | "减弱" | "不变" {
  const fireBoost = day.dayElement === "火" || day.dayElement === "木";
  const metalWater = day.dayElement === "金" || day.dayElement === "水";
  if (/上涨|先涨/.test(weeklyDirection) && fireBoost) return "增强";
  if (/上涨|先涨/.test(weeklyDirection) && metalWater) return "减弱";
  if (/下跌|先跌|回落/.test(weeklyDirection) && metalWater) return "增强";
  if (/下跌|先跌|回落/.test(weeklyDirection) && fireBoost) return "减弱";
  return "不变";
}
