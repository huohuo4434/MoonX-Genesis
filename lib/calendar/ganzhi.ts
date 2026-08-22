/**
 * Asia/Shanghai day stem/branch (干支) — deterministic, no network.
 * Uses the same source-locked calendar as sexagenary-calendar.ts.
 */
import { getSexagenaryDay } from "@/lib/calendar/sexagenary-calendar";

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
const BRANCH_ELEMENT: Record<(typeof BRANCHES)[number], string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
  午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};

export type DayGanzhi = {
  calendarDateChina: string;
  dayStem: string;
  dayBranch: string;
  dayElement: string;
  branchElement: string;
  ganzhiLabel: string;
  stemIndex: number;
  branchIndex: number;
};

export function getDayGanzhi(isoDate: string): DayGanzhi {
  const offset = getSexagenaryDay(isoDate).index;
  const stemIndex = offset % 10;
  const branchIndex = offset % 12;
  const dayStem = STEMS[stemIndex]!;
  const dayBranch = BRANCHES[branchIndex]!;
  return {
    calendarDateChina: isoDate,
    dayStem,
    dayBranch,
    dayElement: STEM_ELEMENT[dayStem],
    branchElement: BRANCH_ELEMENT[dayBranch],
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
  const scoreElement = (element: string) => element === "木" || element === "火" ? 1 : element === "金" || element === "水" ? -1 : 0;
  const stemScore = scoreElement(day.dayElement);
  const branchScore = scoreElement(day.branchElement);
  const timingScore = stemScore + branchScore;
  const bullish = /上涨|回升|反弹|修复|偏强|先跌后涨|探底回升/.test(weeklyDirection);
  const bearish = /下跌|回落|回撤|偏弱|先涨后跌|冲高回落/.test(weeklyDirection);
  if (bullish && timingScore > 0) return "增强";
  if (bullish && timingScore < 0) return "减弱";
  if (bearish && timingScore < 0) return "增强";
  if (bearish && timingScore > 0) return "减弱";
  return "不变";
}
