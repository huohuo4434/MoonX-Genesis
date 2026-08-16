import { getSexagenaryDay } from "@/lib/calendar/sexagenary-calendar";

export type WeeklyAlphaCalendarDay = {
  date: string;
  yearGanzhi: "丙午";
  monthGanzhi: "丙申";
  dayGanzhi: string;
  branch: string;
  xunKong: string;
  lunarLabel: string;
  solarTerm: "立秋";
};

/**
 * Publication-locked calendar table for the first Weekly edition.
 * Verified against external almanac pages and the deterministic MOOX 60-day
 * engine. Never replace this with LLM-generated stem/branch labels.
 */
export const WEEKLY_ALPHA_CALENDAR_20260810: readonly WeeklyAlphaCalendarDay[] = Object.freeze([
  { date: "2026-08-09", yearGanzhi: "丙午", monthGanzhi: "丙申", dayGanzhi: "乙卯", branch: "卯", xunKong: "子丑", lunarLabel: "六月廿七", solarTerm: "立秋" },
  { date: "2026-08-10", yearGanzhi: "丙午", monthGanzhi: "丙申", dayGanzhi: "丙辰", branch: "辰", xunKong: "子丑", lunarLabel: "六月廿八", solarTerm: "立秋" },
  { date: "2026-08-11", yearGanzhi: "丙午", monthGanzhi: "丙申", dayGanzhi: "丁巳", branch: "巳", xunKong: "子丑", lunarLabel: "六月廿九", solarTerm: "立秋" },
  { date: "2026-08-12", yearGanzhi: "丙午", monthGanzhi: "丙申", dayGanzhi: "戊午", branch: "午", xunKong: "子丑", lunarLabel: "六月三十", solarTerm: "立秋" },
  { date: "2026-08-13", yearGanzhi: "丙午", monthGanzhi: "丙申", dayGanzhi: "己未", branch: "未", xunKong: "子丑", lunarLabel: "七月初一", solarTerm: "立秋" },
  { date: "2026-08-14", yearGanzhi: "丙午", monthGanzhi: "丙申", dayGanzhi: "庚申", branch: "申", xunKong: "子丑", lunarLabel: "七月初二", solarTerm: "立秋" },
  { date: "2026-08-15", yearGanzhi: "丙午", monthGanzhi: "丙申", dayGanzhi: "辛酉", branch: "酉", xunKong: "子丑", lunarLabel: "七月初三", solarTerm: "立秋" },
  { date: "2026-08-16", yearGanzhi: "丙午", monthGanzhi: "丙申", dayGanzhi: "壬戌", branch: "戌", xunKong: "子丑", lunarLabel: "七月初四", solarTerm: "立秋" },
]);

function xunKongForIndex(index: number): string {
  return ["戌亥", "申酉", "午未", "辰巳", "寅卯", "子丑"][Math.floor(index / 10)]!;
}

export function assertWeeklyAlphaCalendar20260810(): true {
  for (const row of WEEKLY_ALPHA_CALENDAR_20260810) {
    const computed = getSexagenaryDay(row.date);
    if (`${computed.stem}${computed.branch}` !== row.dayGanzhi) {
      throw new Error(`WEEKLY_ALPHA_CALENDAR_MISMATCH:${row.date}:${computed.label}:${row.dayGanzhi}日`);
    }
    const xunKong = xunKongForIndex(computed.index);
    if (xunKong !== row.xunKong) {
      throw new Error(`WEEKLY_ALPHA_XUNKONG_MISMATCH:${row.date}:${xunKong}:${row.xunKong}`);
    }
  }
  return true;
}

export function weeklyAlphaCalendarDay(date: string): WeeklyAlphaCalendarDay | null {
  return WEEKLY_ALPHA_CALENDAR_20260810.find((row) => row.date === date) ?? null;
}
