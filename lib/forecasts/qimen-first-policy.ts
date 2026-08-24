import { getDailyMarketBaziRegime } from "@/lib/trading-signals/market-bazi-regime";

// MOOX_V7206_ALTCOIN_QIMEN_EXPERIMENT
/*
 * MOOX V7.20.14 — parallel Liuyao and Qimen forecasts with visible consensus
 *
 * Source boundaries:
 * 1) Standard chart layer: time Qimen, split-supplement, rotating plate.
 * 2) Teacher-evidence layer: Wu teacher / Golden Rabbit explicit market symbols.
 * 3) MOOX digital protocol: reproducible conversion from a standard chart to
 *    UP / DOWN / SIDEWAYS.  This protocol is labelled as MOOX's rule and is
 *    not represented as the teacher's undisclosed manual palace-selection rule.
 *
 * Safety:
 * - Liuyao and Qimen produce independent, separately traceable forecasts.
 * - Agreement raises consensus confidence; disagreement is shown and lowers it.
 * - Neither method silently overwrites the other. The active weekly/stage record
 *   remains the immutable publication base so a daily recalculation cannot rewrite history.
 * - There is no fabricated daily hexagram: the Liuyao day view is derived from the
 *   active weekly/stage record, its dated path and the market calendar.
 * - Technical analysis may supply levels only and cannot reverse direction.
 * - Personal Bazi never votes on public market direction.
 * - Asset/market Bazi may act as a capped monthly regime prior: it adjusts conviction/risk but cannot flip Qimen alone.
 * - This module contains no order, leverage, payment or membership operation.
 */

import { getWuWeeklyCalibration, getWuWeeklyEventWindow } from "../data/qimen-wu-weekly-20260824";

export const MOOX_QIMEN_ENGINE_VERSION = "MOOX_QIMEN_TIME_ROTATING_V3_20260818";
export const MOOX_QIMEN_POLICY_VERSION = "LIUYAO_QIMEN_PARALLEL_FORECAST_RESONANCE_V6";
// Keep the deterministic cast seed stable across interpretation upgrades so an
// already-scheduled market date does not silently receive a different master chart.
const MOOX_QIMEN_CAST_SEED_VERSION = "QIMEN_PRIMARY_TEACHER_YONGSHEN_LIUYAO_AUX_V2";

type JsonRecord = Record<string, unknown>;
type QimenDirection = "UP" | "DOWN" | "SIDEWAYS";
type YinYang = "YANG" | "YIN";
type PalaceNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type OuterPalaceNumber = Exclude<PalaceNumber, 5>;

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

interface Pillar {
  index: number;
  stem: string;
  branch: string;
  text: string;
}

interface PalaceState {
  palace: PalaceNumber;
  trigram: string;
  element: string;
  earthStem: string;
  heavenStem: string | null;
  star: string | null;
  door: string | null;
  deity: string | null;
  void: boolean;
  horse: boolean;
  doorPressure: boolean;
  stemTomb: boolean;
  instrumentPunishment: boolean;
}

interface QimenChart {
  engineVersion: string;
  method: string;
  castAt: string;
  timezone: string;
  solarLongitude: number;
  solarTerm: string;
  yinYang: YinYang;
  yuan: "UPPER" | "MIDDLE" | "LOWER";
  ju: number;
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  xunHead: string;
  xunHeadInstrument: string;
  chiefStar: string;
  chiefDoor: string;
  chiefStarPalace: PalaceNumber;
  chiefDoorPalace: PalaceNumber;
  voidBranches: string[];
  horseBranch: string;
  palaces: PalaceState[];
  invariants: {
    uniqueEarthStems: boolean;
    uniqueOuterStars: boolean;
    uniqueOuterDoors: boolean;
    uniqueOuterDeities: boolean;
    valid: boolean;
  };
}

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
const INSTRUMENTS = ["戊", "己", "庚", "辛", "壬", "癸", "丁", "丙", "乙"] as const;
const OUTER_RING = [1, 8, 3, 4, 9, 2, 7, 6] as const satisfies readonly PalaceNumber[];
const STAR_RING = ["天蓬", "天任", "天冲", "天辅", "天英", "天芮", "天柱", "天心"] as const;
const DOOR_RING = ["休门", "生门", "伤门", "杜门", "景门", "死门", "惊门", "开门"] as const;
const DEITY_RING = ["值符", "腾蛇", "太阴", "六合", "白虎", "玄武", "九地", "九天"] as const;

const PALACE_META: Record<PalaceNumber, { trigram: string; element: string }> = {
  1: { trigram: "坎", element: "水" },
  2: { trigram: "坤", element: "土" },
  3: { trigram: "震", element: "木" },
  4: { trigram: "巽", element: "木" },
  5: { trigram: "中", element: "土" },
  6: { trigram: "乾", element: "金" },
  7: { trigram: "兑", element: "金" },
  8: { trigram: "艮", element: "土" },
  9: { trigram: "离", element: "火" },
};

const ORIGINAL_STAR_BY_PALACE: Record<PalaceNumber, string> = {
  1: "天蓬", 2: "天芮", 3: "天冲", 4: "天辅", 5: "天禽",
  6: "天心", 7: "天柱", 8: "天任", 9: "天英",
};

const ORIGINAL_DOOR_BY_PALACE: Record<PalaceNumber, string | null> = {
  1: "休门", 2: "死门", 3: "伤门", 4: "杜门", 5: null,
  6: "开门", 7: "惊门", 8: "生门", 9: "景门",
};

const STAR_ORIGIN: Record<string, PalaceNumber> = {
  天蓬: 1, 天芮: 2, 天冲: 3, 天辅: 4, 天禽: 5,
  天心: 6, 天柱: 7, 天任: 8, 天英: 9,
};

const DOOR_ELEMENT: Record<string, string> = {
  休门: "水", 生门: "土", 伤门: "木", 杜门: "木",
  景门: "火", 死门: "土", 惊门: "金", 开门: "金",
};

const STEM_ELEMENT: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

const BRANCH_ELEMENT: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
  午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};

const GENERATES: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const CONTROLS: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

const SOLAR_TERMS = [
  "立春", "雨水", "惊蛰", "春分", "清明", "谷雨",
  "立夏", "小满", "芒种", "夏至", "小暑", "大暑",
  "立秋", "处暑", "白露", "秋分", "寒露", "霜降",
  "立冬", "小雪", "大雪", "冬至", "小寒", "大寒",
] as const;

const JU_BY_TERM: Record<string, { mode: YinYang; upper: number; middle: number; lower: number }> = {
  冬至: { mode: "YANG", upper: 1, middle: 7, lower: 4 },
  小寒: { mode: "YANG", upper: 2, middle: 8, lower: 5 },
  大寒: { mode: "YANG", upper: 3, middle: 9, lower: 6 },
  立春: { mode: "YANG", upper: 8, middle: 5, lower: 2 },
  雨水: { mode: "YANG", upper: 9, middle: 6, lower: 3 },
  惊蛰: { mode: "YANG", upper: 1, middle: 7, lower: 4 },
  春分: { mode: "YANG", upper: 3, middle: 9, lower: 6 },
  清明: { mode: "YANG", upper: 4, middle: 1, lower: 7 },
  谷雨: { mode: "YANG", upper: 5, middle: 2, lower: 8 },
  立夏: { mode: "YANG", upper: 4, middle: 1, lower: 7 },
  小满: { mode: "YANG", upper: 5, middle: 2, lower: 8 },
  芒种: { mode: "YANG", upper: 6, middle: 3, lower: 9 },
  夏至: { mode: "YIN", upper: 9, middle: 3, lower: 6 },
  小暑: { mode: "YIN", upper: 8, middle: 2, lower: 5 },
  大暑: { mode: "YIN", upper: 7, middle: 1, lower: 4 },
  立秋: { mode: "YIN", upper: 2, middle: 5, lower: 8 },
  处暑: { mode: "YIN", upper: 1, middle: 4, lower: 7 },
  白露: { mode: "YIN", upper: 9, middle: 3, lower: 6 },
  秋分: { mode: "YIN", upper: 7, middle: 1, lower: 4 },
  寒露: { mode: "YIN", upper: 6, middle: 9, lower: 3 },
  霜降: { mode: "YIN", upper: 5, middle: 8, lower: 2 },
  立冬: { mode: "YIN", upper: 6, middle: 9, lower: 3 },
  小雪: { mode: "YIN", upper: 5, middle: 8, lower: 2 },
  大雪: { mode: "YIN", upper: 4, middle: 7, lower: 1 },
};

const XUN_HEADS = ["甲子", "甲戌", "甲申", "甲午", "甲辰", "甲寅"] as const;
const XUN_INSTRUMENTS = ["戊", "己", "庚", "辛", "壬", "癸"] as const;

const DOOR_SCORE: Record<string, number> = {
  生门: 2.7, 开门: 2.2, 景门: 1.0, 休门: 0.5,
  杜门: -0.4, 惊门: -1.0, 伤门: -1.5, 死门: -2.2,
};
const STAR_SCORE: Record<string, number> = {
  天冲: 1.5, 天英: 1.0, 天辅: 0.6, 天任: 0.5, 天心: 0.5,
  天禽: 0.2, 天蓬: -0.4, 天柱: -0.9, 天芮: -1.3,
};
const DEITY_SCORE: Record<string, number> = {
  九天: 1.8, 值符: 1.0, 六合: 0.6, 太阴: 0.3,
  腾蛇: -0.5, 玄武: -0.9, 九地: -1.0, 白虎: -1.8,
};
const STEM_SCORE: Record<string, number> = {
  丙: 1.8, 丁: 1.5, 戊: 0.5, 乙: 0.3, 壬: 0.1, 癸: -0.1,
  己: -0.2, 庚: -1.4, 辛: -1.7, 甲: 0.0,
};



interface TeacherAssetAnchor {
  primary: readonly string[];
  secondary?: readonly string[];
  basis: "TEACHER_EXPLICIT" | "TEACHER_CASE" | "GENERIC_FALLBACK";
  note: string;
}

/**
 * Product-specific object anchors extracted from the user's Wu-teacher materials.
 * Only explicit/case-supported mappings are encoded. Unknown products keep the
 * generic time/day-stem protocol instead of inventing a teacher rule.
 */
const TEACHER_ASSET_ANCHORS: Record<string, TeacherAssetAnchor> = {
  BTC: {
    primary: ["戊"],
    secondary: ["壬"],
    basis: "TEACHER_EXPLICIT",
    note: "吴老师BTC案例：戊土为对象，同时观察壬水对立/配合",
  },
  SPX: {
    primary: ["丁"],
    secondary: ["丙"],
    basis: "TEACHER_EXPLICIT",
    note: "吴老师2026-08-17周度资料明确：标普500取丁火；同时结合美股丙火背景",
  },
  NDX: {
    primary: ["丙"],
    basis: "TEACHER_CASE",
    note: "吴老师2026-08-24周度视频未单列纳指；仅保留美股丙火类别背景，不冒充纳指专属口诀",
  },
  SHCOMP: {
    primary: ["己"],
    secondary: ["庚"],
    basis: "TEACHER_EXPLICIT",
    note: "吴老师2026-08-24周度视频明确：A股先看己土，并以庚金观察对立情绪/变化",
  },
  HSTECH: {
    primary: ["庚"],
    secondary: ["癸"],
    basis: "TEACHER_EXPLICIT",
    note: "吴老师2026-08-24周度视频明确：恒生科技取庚金，并特别观察庚下临癸的泄气关系",
  },
  SOX: {
    primary: ["癸"],
    secondary: ["乙"],
    basis: "TEACHER_EXPLICIT",
    note: "吴老师2026-08-24周度视频明确：费城半导体看癸水，并结合下临乙木与天心保护力度",
  },
  A500: {
    primary: ["甲"],
    secondary: ["庚"],
    basis: "TEACHER_EXPLICIT",
    note: "吴老师2026-08-24周度视频明确：中证A500按甲木/甲申庚关系观察",
  },
  STAR50: {
    primary: ["己"],
    basis: "TEACHER_EXPLICIT",
    note: "吴老师2026-08-24周度视频明确：科创50按己土观察；约1500点只作为该期条件性机会，不固化成永久价位",
  },
  GLD: {
    primary: ["辛"],
    basis: "TEACHER_EXPLICIT",
    note: "吴老师2026-08-24周度视频明确：黄金取辛金，重点看辛金自身旺衰与落宫受克",
  },
  GOLD: {
    primary: ["辛"],
    basis: "TEACHER_EXPLICIT",
    note: "吴老师2026-08-24周度视频明确：黄金取辛金，重点看辛金自身旺衰与落宫受克",
  },
  SILVER: {
    primary: ["丙"],
    basis: "TEACHER_EXPLICIT",
    note: "吴老师黄金白银资料：可把丙火视为白银",
  },
  WTI: {
    primary: ["癸"],
    secondary: ["壬"],
    basis: "TEACHER_CASE",
    note: "吴老师原油月度案例：原油宫见癸加壬、腾蛇；作为案例锚点而非通用古法",
  },
};
const FINANCIAL_YONGSHEN = {
  core: {
    primary: ["时干天盘", "时干地盘"],
    secondary: ["日干天盘", "日干地盘", "值符", "值使"],
    capitalPrice: ["甲子戊", "生门"],
    bullishForce: ["丙", "丁", "九天", "天冲", "生门", "开门"],
    bearishForce: ["庚", "辛", "白虎", "九地", "死门", "惊门"],
    volatility: ["腾蛇", "天冲", "驿马"],
  },
  categories: {
    CRYPTO: ["时干", "生门", "景门", "天冲", "腾蛇"],
    EQUITY: ["时干", "开门", "生门", "值符", "景门"],
    PRECIOUS_METAL: ["时干", "生门", "庚辛对象属性（不直接等同空头）"],
    ENERGY: ["时干", "景门", "天英", "丙丁对象属性（不直接等同多头）"],
    FX: ["时干", "开门", "休门", "甲子戊", "双边货币关系"],
    RATES_POLICY: ["值符", "值使", "开门", "天心", "决策主体"],
  },
  baziBoundary: "个人八字只用于私人适配度与风险叠加，不参与公共市场方向投票",
  teacherAssetAnchors: TEACHER_ASSET_ANCHORS,
} as const;

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function asRecord(value: unknown): JsonRecord | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredAt<T>(values: readonly T[], index: number, label: string): T {
  const value = values[index];
  if (value === undefined) throw new Error(`Qimen invariant failed: ${label} index ${index}`);
  return value;
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function localParts(date: Date, timezone = "Asia/Shanghai"): LocalParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get("year"), month: get("month"), day: get("day"),
    hour: get("hour"), minute: get("minute"), second: get("second"),
  };
}

function julianDayFromUnix(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function gregorianJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y
    + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function apparentSolarLongitude(date: Date): number {
  const jd = julianDayFromUnix(date);
  const t = (jd - 2451545.0) / 36525;
  const l0 = mod(280.46646 + t * (36000.76983 + 0.0003032 * t), 360);
  const m = mod(357.52911 + t * (35999.05029 - 0.0001537 * t), 360);
  const mRad = m * Math.PI / 180;
  const c = (1.914602 - t * (0.004817 + 0.000014 * t)) * Math.sin(mRad)
    + (0.019993 - 0.000101 * t) * Math.sin(2 * mRad)
    + 0.000289 * Math.sin(3 * mRad);
  const trueLongitude = l0 + c;
  const omega = (125.04 - 1934.136 * t) * Math.PI / 180;
  return mod(trueLongitude - 0.00569 - 0.00478 * Math.sin(omega), 360);
}

function solarTermFromLongitude(longitude: number): string {
  const index = Math.floor(mod(longitude - 315, 360) / 15);
  return SOLAR_TERMS[index] ?? "立春";
}

function pillarFromIndex(index: number): Pillar {
  const normalized = mod(index, 60);
  const stem = requiredAt(STEMS, normalized % 10, "stem");
  const branch = requiredAt(BRANCHES, normalized % 12, "branch");
  return { index: normalized, stem, branch, text: `${stem}${branch}` };
}

function cycleIndexForStemBranch(stemIndex: number, branchIndex: number): number {
  for (let index = 0; index < 60; index += 1) {
    if (index % 10 === stemIndex && index % 12 === branchIndex) return index;
  }
  return 0;
}

function dayPillar(parts: LocalParts): Pillar {
  // Traditional Zi-hour boundary: 23:00 starts the next divination day.
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + (parts.hour >= 23 ? 1 : 0)));
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth() + 1;
  const d = shifted.getUTCDate();
  const index = mod(gregorianJdn(y, m, d) + 49, 60);
  return pillarFromIndex(index);
}

function yearPillar(parts: LocalParts, longitude: number): Pillar {
  let solarYear = parts.year;
  if (parts.month <= 2 && longitude >= 270 && longitude < 315) solarYear -= 1;
  return pillarFromIndex(mod(solarYear - 1984, 60));
}

function monthPillar(year: Pillar, longitude: number): Pillar {
  const monthOffset = Math.floor(mod(longitude - 315, 360) / 30);
  const branchIndex = mod(2 + monthOffset, 12); // 寅 starts at 立春.
  const firstStem = mod((year.index % 10 % 5) * 2 + 2, 10); // 甲己年丙作首.
  const stemIndex = mod(firstStem + monthOffset, 10);
  return pillarFromIndex(cycleIndexForStemBranch(stemIndex, branchIndex));
}

function hourPillar(day: Pillar, parts: LocalParts): Pillar {
  const branchIndex = mod(Math.floor((parts.hour + 1) / 2), 12);
  const firstStem = mod((day.index % 10 % 5) * 2, 10);
  const stemIndex = mod(firstStem + branchIndex, 10);
  return pillarFromIndex(cycleIndexForStemBranch(stemIndex, branchIndex));
}

function classifyYuan(parts: LocalParts): "UPPER" | "MIDDLE" | "LOWER" {
  const current = dayPillar(parts);
  let head = current;
  for (let offset = 0; offset < 10; offset += 1) {
    const candidate = pillarFromIndex(current.index - offset);
    const stemIndex = candidate.index % 10;
    if (stemIndex === 0 || stemIndex === 5) {
      head = candidate;
      break;
    }
  }
  const branch = head.branch;
  if (["子", "午", "卯", "酉"].includes(branch)) return "UPPER";
  if (["寅", "申", "巳", "亥"].includes(branch)) return "MIDDLE";
  return "LOWER";
}

function palaceShift(start: PalaceNumber, steps: number, direction: 1 | -1): PalaceNumber {
  return (mod(start - 1 + steps * direction, 9) + 1) as PalaceNumber;
}

function outerPalace(palace: PalaceNumber): OuterPalaceNumber {
  return palace === 5 ? 2 : palace;
}

function rotateRing<T extends string>(
  values: readonly T[],
  selected: T,
  destination: PalaceNumber,
  direction: 1 | -1,
): Map<PalaceNumber, T> {
  const map = new Map<PalaceNumber, T>();
  const selectedIndex = values.indexOf(selected);
  const destinationIndex = OUTER_RING.indexOf(outerPalace(destination));
  for (let offset = 0; offset < values.length; offset += 1) {
    const valueIndex = mod(selectedIndex + offset, values.length);
    const palaceIndex = mod(destinationIndex + offset * direction, OUTER_RING.length);
    const palace = requiredAt(OUTER_RING, palaceIndex, "outer palace");
    const value = requiredAt(values, valueIndex, "rotating-ring value");
    map.set(palace, value);
  }
  return map;
}

function branchPalace(branch: string): PalaceNumber {
  const map: Record<string, PalaceNumber> = {
    子: 1, 丑: 8, 寅: 8, 卯: 3, 辰: 4, 巳: 4,
    午: 9, 未: 2, 申: 2, 酉: 7, 戌: 6, 亥: 6,
  };
  return map[branch] ?? 5;
}

function xunVoidBranches(hourIndex: number): string[] {
  const xunStart = Math.floor(mod(hourIndex, 60) / 10) * 10;
  const present = new Set<string>();
  for (let offset = 0; offset < 10; offset += 1) {
    present.add(requiredAt(BRANCHES, (xunStart + offset) % 12, "xun branch"));
  }
  return BRANCHES.filter((branch) => !present.has(branch));
}

function horseBranch(hourBranch: string): string {
  if (["申", "子", "辰"].includes(hourBranch)) return "寅";
  if (["寅", "午", "戌"].includes(hourBranch)) return "申";
  if (["巳", "酉", "丑"].includes(hourBranch)) return "亥";
  return "巳";
}

function isDoorPressure(door: string | null, palaceElement: string): boolean {
  if (!door) return false;
  const doorElement = DOOR_ELEMENT[door];
  if (!doorElement) return false;
  return CONTROLS[doorElement] === palaceElement;
}

function isStemTomb(stem: string | null, palace: PalaceNumber): boolean {
  if (!stem) return false;
  const element = STEM_ELEMENT[stem];
  if (!element) return false;
  const tombPalace: Record<string, PalaceNumber> = { 木: 2, 火: 6, 金: 8, 水: 4, 土: 4 };
  return tombPalace[element] === palace;
}

function isInstrumentPunishment(stem: string | null, palace: PalaceNumber): boolean {
  if (!stem) return false;
  const map: Record<string, PalaceNumber[]> = {
    戊: [3], 己: [2], 庚: [8], 辛: [9], 壬: [4], 癸: [4],
  };
  return Boolean(map[stem]?.includes(palace));
}

function buildQimenChart(castAt: Date): QimenChart {
  const timezone = "Asia/Shanghai";
  const parts = localParts(castAt, timezone);
  const longitude = apparentSolarLongitude(castAt);
  const solarTerm = solarTermFromLongitude(longitude);
  const year = yearPillar(parts, longitude);
  const day = dayPillar(parts);
  const month = monthPillar(year, longitude);
  const hour = hourPillar(day, parts);
  const yuan = classifyYuan(parts);
  const config = JU_BY_TERM[solarTerm] ?? { mode: "YANG" as const, upper: 8, middle: 5, lower: 2 };
  const ju = yuan === "UPPER" ? config.upper : yuan === "MIDDLE" ? config.middle : config.lower;
  const direction: 1 | -1 = config.mode === "YANG" ? 1 : -1;

  const earth = new Map<PalaceNumber, string>();
  INSTRUMENTS.forEach((stem, offset) => {
    earth.set(palaceShift(ju as PalaceNumber, offset, direction), stem);
  });

  const xunNumber = Math.floor(hour.index / 10);
  const xunHead = XUN_HEADS[xunNumber] ?? XUN_HEADS[0];
  const xunHeadInstrument = XUN_INSTRUMENTS[xunNumber] ?? XUN_INSTRUMENTS[0];
  const xunPalace = ([...earth.entries()].find((entry) => entry[1] === xunHeadInstrument)?.[0] ?? 5) as PalaceNumber;
  const attachedXunPalace = outerPalace(xunPalace);
  const chiefStar = xunPalace === 5 ? "天芮" : ORIGINAL_STAR_BY_PALACE[xunPalace];
  const chiefDoor = ORIGINAL_DOOR_BY_PALACE[attachedXunPalace] ?? "死门";

  const effectiveHourStem = hour.stem === "甲" ? xunHeadInstrument : hour.stem;
  const hourEarthPalace = ([...earth.entries()].find((entry) => entry[1] === effectiveHourStem)?.[0] ?? attachedXunPalace) as PalaceNumber;
  const chiefStarPalace = outerPalace(hourEarthPalace);

  const starMap = rotateRing(STAR_RING, chiefStar as typeof STAR_RING[number], chiefStarPalace, 1);
  const starHeavenStem = new Map<PalaceNumber, string>();
  for (const [palace, star] of starMap.entries()) {
    const origin = STAR_ORIGIN[star] ?? 2;
    starHeavenStem.set(palace, earth.get(origin) ?? earth.get(2) ?? "己");
  }

  const hourWithinXun = mod(hour.index, 10);
  const countedDoorPalace = outerPalace(palaceShift(attachedXunPalace, hourWithinXun, direction));
  const doorMap = rotateRing(DOOR_RING, chiefDoor as typeof DOOR_RING[number], countedDoorPalace, 1);
  const deityMap = rotateRing(DEITY_RING, "值符", chiefStarPalace, direction);

  const voidBranches = xunVoidBranches(hour.index);
  const voidPalaces = new Set(voidBranches.map(branchPalace));
  const horse = horseBranch(hour.branch);
  const horsePalace = branchPalace(horse);

  const palaces: PalaceState[] = [];
  for (let number = 1; number <= 9; number += 1) {
    const palace = number as PalaceNumber;
    const meta = PALACE_META[palace];
    const heavenStem = palace === 5 ? null : (starHeavenStem.get(palace) ?? null);
    const star = palace === 5 ? "天禽" : (starMap.get(palace) ?? null);
    const door = palace === 5 ? null : (doorMap.get(palace) ?? null);
    const deity = palace === 5 ? null : (deityMap.get(palace) ?? null);
    palaces.push({
      palace,
      trigram: meta.trigram,
      element: meta.element,
      earthStem: earth.get(palace) ?? "",
      heavenStem,
      star,
      door,
      deity,
      void: voidPalaces.has(palace),
      horse: horsePalace === palace,
      doorPressure: isDoorPressure(door, meta.element),
      stemTomb: isStemTomb(heavenStem, palace),
      instrumentPunishment: isInstrumentPunishment(heavenStem, palace),
    });
  }

  const uniqueEarthStems = new Set(palaces.map((palace) => palace.earthStem)).size === 9;
  const uniqueOuterStars = new Set(palaces.filter((palace) => palace.palace !== 5).map((palace) => palace.star)).size === 8;
  const uniqueOuterDoors = new Set(palaces.filter((palace) => palace.palace !== 5).map((palace) => palace.door)).size === 8;
  const uniqueOuterDeities = new Set(palaces.filter((palace) => palace.palace !== 5).map((palace) => palace.deity)).size === 8;

  return {
    engineVersion: MOOX_QIMEN_ENGINE_VERSION,
    method: "时家拆补·转盘法（MOOX可复现实现）",
    castAt: castAt.toISOString(),
    timezone,
    solarLongitude: round(longitude, 6),
    solarTerm,
    yinYang: config.mode,
    yuan,
    ju,
    pillars: { year, month, day, hour },
    xunHead,
    xunHeadInstrument,
    chiefStar,
    chiefDoor,
    chiefStarPalace,
    chiefDoorPalace: countedDoorPalace,
    voidBranches,
    horseBranch: horse,
    palaces,
    invariants: {
      uniqueEarthStems,
      uniqueOuterStars,
      uniqueOuterDoors,
      uniqueOuterDeities,
      valid: uniqueEarthStems && uniqueOuterStars && uniqueOuterDoors && uniqueOuterDeities,
    },
  };
}

function elementSeasonScore(palaceElement: string, monthBranch: string): number {
  const monthElement = BRANCH_ELEMENT[monthBranch] ?? "土";
  if (monthElement === palaceElement) return 0.9;
  if (GENERATES[monthElement] === palaceElement) return 0.7;
  if (GENERATES[palaceElement] === monthElement) return -0.25;
  if (CONTROLS[monthElement] === palaceElement) return -0.8;
  if (CONTROLS[palaceElement] === monthElement) return 0.15;
  return 0;
}

function palaceScore(palace: PalaceState, monthBranch: string, includeMarketStemSignal = true): number {
  let score = 0;
  if (palace.door) score += DOOR_SCORE[palace.door] ?? 0;
  if (palace.star) score += STAR_SCORE[palace.star] ?? 0;
  if (palace.deity) score += DEITY_SCORE[palace.deity] ?? 0;
  if (includeMarketStemSignal && palace.heavenStem) score += STEM_SCORE[palace.heavenStem] ?? 0;
  score += elementSeasonScore(palace.element, monthBranch);
  if (palace.horse) score += score >= 0 ? 0.4 : -0.4;
  if (palace.void) score -= 1.6;
  if (palace.doorPressure) score -= 1.1;
  if (palace.stemTomb) score -= 1.0;
  if (palace.instrumentPunishment) score -= 0.9;
  return score;
}

function findEarthPalace(chart: QimenChart, stem: string): PalaceNumber | null {
  const effective = stem === "甲" ? chart.xunHeadInstrument : stem;
  return chart.palaces.find((palace) => palace.earthStem === effective)?.palace ?? null;
}

function findHeavenPalace(chart: QimenChart, stem: string): PalaceNumber | null {
  const effective = stem === "甲" ? chart.xunHeadInstrument : stem;
  return chart.palaces.find((palace) => palace.heavenStem === effective)?.palace ?? null;
}

function resolveTeacherAnchor(asset: string): TeacherAssetAnchor | null {
  const code = asset.toUpperCase();
  if (TEACHER_ASSET_ANCHORS[code]) return TEACHER_ASSET_ANCHORS[code];
  if (/^BTC|BITCOIN|比特币/.test(code)) return TEACHER_ASSET_ANCHORS.BTC ?? null;
  if (/^SPX|S&P|标普/.test(code)) return TEACHER_ASSET_ANCHORS.SPX ?? null;
  if (/^NDX|NASDAQ|纳指/.test(code)) return TEACHER_ASSET_ANCHORS.NDX ?? null;
  if (/SHCOMP|SSEC|000001|上证|A股/.test(code)) return TEACHER_ASSET_ANCHORS.SHCOMP ?? null;
  if (/HSTECH|恒生科技/.test(code)) return TEACHER_ASSET_ANCHORS.HSTECH ?? null;
  if (/SOX|SOXX|费城半导体|PHLX/.test(code)) return TEACHER_ASSET_ANCHORS.SOX ?? null;
  if (/CSI.?A?500|A500|中证A500/.test(code)) return TEACHER_ASSET_ANCHORS.A500 ?? null;
  if (/STAR.?50|科创50|000688/.test(code)) return TEACHER_ASSET_ANCHORS.STAR50 ?? null;
  if (/^GOLD|XAU|GC=F/.test(code)) return TEACHER_ASSET_ANCHORS.GOLD ?? null;
  if (/^SILVER|XAG|SI=F|SLV/.test(code)) return TEACHER_ASSET_ANCHORS.SILVER ?? null;
  if (/^WTI|CL=F|BRENT|OIL/.test(code)) return TEACHER_ASSET_ANCHORS.WTI ?? null;
  return null;
}

type TeacherSemanticVolatility = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
type TeacherSemanticRisk = "NORMAL" | "ELEVATED" | "HIGH" | "EXTREME";
type TeacherSemanticPathOrder = "KNOWN" | "UNKNOWN";

interface TeacherSemanticCalibration {
  version: "WU_SEMANTIC_V1_20260820";
  directionOverride: QimenDirection | null;
  confidenceCap: number | null;
  volatility: TeacherSemanticVolatility;
  downsideTail: TeacherSemanticRisk;
  rescueSupport: TeacherSemanticRisk;
  pathOrder: TeacherSemanticPathOrder;
  notes: string[];
}

const VOLATILITY_RANK: Record<TeacherSemanticVolatility, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, EXTREME: 3 };
const RISK_RANK: Record<TeacherSemanticRisk, number> = { NORMAL: 0, ELEVATED: 1, HIGH: 2, EXTREME: 3 };

function maxVolatility(a: TeacherSemanticVolatility, b: TeacherSemanticVolatility): TeacherSemanticVolatility {
  return VOLATILITY_RANK[a] >= VOLATILITY_RANK[b] ? a : b;
}

function maxRisk(a: TeacherSemanticRisk, b: TeacherSemanticRisk): TeacherSemanticRisk {
  return RISK_RANK[a] >= RISK_RANK[b] ? a : b;
}

function palaceForHeavenStem(chart: QimenChart, stem: string): PalaceState | null {
  const palace = findHeavenPalace(chart, stem);
  return palace ? chart.palaces.find((item) => item.palace === palace) ?? null : null;
}

/**
 * Teacher-alignment layer learned from Wu Changye's 2026-08-24 weekly video.
 * It does not replace the standard chart calculation.  It only interprets
 * structures the teacher explicitly demonstrated, and only when the same
 * structure is actually present again.  Unknown branches stay unknown.
 */
function teacherSemanticCalibration(
  chart: QimenChart,
  asset: string,
  anchor: TeacherAssetAnchor | null,
): TeacherSemanticCalibration {
  const code = asset.toUpperCase();
  const result: TeacherSemanticCalibration = {
    version: "WU_SEMANTIC_V1_20260820",
    directionOverride: null,
    confidenceCap: null,
    volatility: "MEDIUM",
    downsideTail: "NORMAL",
    rescueSupport: "NORMAL",
    pathOrder: "KNOWN",
    notes: [],
  };

  const chief = chart.palaces.find((item) => item.palace === chart.chiefStarPalace) ?? null;
  if (chief?.horse && chief.heavenStem === "庚" && chief.earthStem === "癸" && chief.door === "开门") {
    result.volatility = "EXTREME";
    result.notes.push("值符临马且庚加癸大格配开门：先判趋势切换与大波动，不把开门机械等同单边上涨");
  }

  // 亥卯未/寅午戌 are TARGET-DAY event windows, not cast-day signals.
  // They are materialized by the weekly calendar layer; never infer them from chart.pillars.day.

  if (/^SPX|S&P|标普/.test(code)) {
    const dingEarth = findEarthPalace(chart, "丁");
    if (dingEarth === 5) {
      result.directionOverride = "SIDEWAYS";
      result.confidenceCap = 66;
      result.volatility = maxVolatility(result.volatility, "HIGH");
      result.notes.push("标普丁火居中：乙加丁可修复，但转坎又受水克，按老师处理为大分化/双向高波动而非单边");
    }
  }

  if (/SHCOMP|SSEC|000001|上证|A股/.test(code)) {
    const ji = palaceForHeavenStem(chart, "己");
    if (ji?.deity === "白虎" && ji.star === "天蓬") {
      result.directionOverride = "SIDEWAYS";
      result.confidenceCap = 65;
      result.volatility = maxVolatility(result.volatility, "HIGH");
      result.downsideTail = maxRisk(result.downsideTail, "ELEVATED");
      result.rescueSupport = maxRisk(result.rescueSupport, "ELEVATED");
      result.notes.push("A股己土上临白虎天蓬：上方承压；老师同时看到下方托底，合并为宽幅震荡而非强多");
    }
  }

  if (/HSTECH|恒生科技/.test(code)) {
    const geng = palaceForHeavenStem(chart, "庚");
    if (geng?.earthStem === "癸") {
      result.directionOverride = "DOWN";
      result.confidenceCap = 68;
      result.volatility = maxVolatility(result.volatility, "HIGH");
      result.notes.push("恒生科技庚下临癸：按老师解释为庚金泄气，短线轻微向下调整；不等同长期转空");
    }
  }

  if (/^BTC|BITCOIN|比特币/.test(code)) {
    const ren = palaceForHeavenStem(chart, "壬");
    if (ren?.earthStem === "辛" && ren.star === "天柱" && ren.deity === "九地") {
      result.directionOverride = "SIDEWAYS";
      result.confidenceCap = 64;
      result.volatility = maxVolatility(result.volatility, "HIGH");
      result.downsideTail = maxRisk(result.downsideTail, "EXTREME");
      result.pathOrder = "UNKNOWN";
      result.notes.push("BTC壬加辛、九地、天柱：先识别窄幅盘整和多空分化，同时保留单日暴跌尾部风险");
      result.notes.push("老师明确未判断暴跌前是否先上冲，因此路径顺序必须标记UNKNOWN，禁止系统补写");
    }
  }

  if (/^GOLD|XAU|GC=F|GLD|黄金/.test(code)) {
    const xin = palaceForHeavenStem(chart, "辛");
    if (xin?.element === "火") {
      result.directionOverride = "DOWN";
      result.confidenceCap = 68;
      result.notes.push("黄金辛金落离火宫受克且能量不足：按老师处理为近期小幅回调，而非机械判长期转空");
    }
  }

  if (/SOX|SOXX|费城半导体|PHLX/.test(code)) {
    const gui = palaceForHeavenStem(chart, "癸");
    if (gui?.earthStem === "乙" && gui.star === "天心") {
      result.directionOverride = "SIDEWAYS";
      result.confidenceCap = 63;
      result.volatility = maxVolatility(result.volatility, "HIGH");
      result.rescueSupport = maxRisk(result.rescueSupport, "ELEVATED");
      result.notes.push("SOX癸临乙并见天心：有保护/贵人意图但天心力量弱，按老师定义为火中取栗而非清晰多头");
    }
  }

  if (/CSI.?A?500|A500|中证A500/.test(code) && chart.xunHead === "甲申") {
    result.confidenceCap = 68;
    result.volatility = maxVolatility(result.volatility, "HIGH");
    result.downsideTail = maxRisk(result.downsideTail, "ELEVATED");
    result.notes.push("中证A500遇甲申庚结构：提高变化/短线退出敏感度；本期老师的‘短线可卖’只写入8/24周盘，不永久固化成DOWN");
  }

  if (/STAR.?50|科创50|000688/.test(code)) {
    const ji = palaceForHeavenStem(chart, "己");
    if (ji?.star === "天蓬") {
      result.confidenceCap = 68;
      result.rescueSupport = maxRisk(result.rescueSupport, "HIGH");
      result.notes.push("科创50己土遇天蓬：按老师案例提高下方承接/托底语义；1500仅为本期资料条件价位，不永久固化方向或价格");
    }
  }

  if (!anchor) result.notes.push("该资产缺少老师明确产品用神，本层仅保留宏观/日期语义，不补写专属口诀");
  return result;
}

function directionFromChart(chart: QimenChart, asset: string): {
  direction: QimenDirection;
  score: number;
  confidence: number;
  anchor: TeacherAssetAnchor | null;
  evidence: Array<{ role: string; palace: PalaceNumber; score: number }>;
  rawScore: number;
  rawDirection: QimenDirection;
  semantic: TeacherSemanticCalibration;
} {
  const teacherAnchor = resolveTeacherAnchor(asset);
  const roles: Array<{ role: string; palace: PalaceNumber | null; weight: number; objectRole?: boolean }> = [];

  if (teacherAnchor) {
    // Teacher product anchor dominates.  The stem identifies the object and must
    // NOT be treated as inherently bullish/bearish (e.g. A-share=庚, gold=辛).
    for (const stem of teacherAnchor.primary) {
      roles.push({ role: `老师对象用神${stem}天盘`, palace: findHeavenPalace(chart, stem), weight: 0.24, objectRole: true });
      roles.push({ role: `老师对象用神${stem}地盘`, palace: findEarthPalace(chart, stem), weight: 0.18, objectRole: true });
    }
    for (const stem of teacherAnchor.secondary ?? []) {
      roles.push({ role: `老师辅助用神${stem}天盘`, palace: findHeavenPalace(chart, stem), weight: 0.12, objectRole: true });
      roles.push({ role: `老师辅助用神${stem}地盘`, palace: findEarthPalace(chart, stem), weight: 0.08, objectRole: true });
    }
    roles.push(
      { role: "时干天盘（事件/当下）", palace: findHeavenPalace(chart, chart.pillars.hour.stem), weight: 0.08 },
      { role: "日干天盘（起念/事项）", palace: findHeavenPalace(chart, chart.pillars.day.stem), weight: 0.06 },
      { role: "值符宫（主趋势）", palace: chart.chiefStarPalace, weight: 0.07 },
      { role: "值使宫（阶段执行）", palace: chart.chiefDoorPalace, weight: 0.05 },
    );
  } else {
    roles.push(
      { role: "时干天盘（对象主用神）", palace: findHeavenPalace(chart, chart.pillars.hour.stem), weight: 0.28 },
      { role: "时干地盘（对象根基）", palace: findEarthPalace(chart, chart.pillars.hour.stem), weight: 0.22 },
      { role: "日干天盘（起念/事项）", palace: findHeavenPalace(chart, chart.pillars.day.stem), weight: 0.14 },
      { role: "日干地盘（事项根基）", palace: findEarthPalace(chart, chart.pillars.day.stem), weight: 0.11 },
      { role: "值符宫（主趋势权重）", palace: chart.chiefStarPalace, weight: 0.15 },
      { role: "值使宫（执行/阶段）", palace: chart.chiefDoorPalace, weight: 0.10 },
    );
  }

  const evidence: Array<{ role: string; palace: PalaceNumber; score: number }> = [];
  let weighted = 0;
  let totalWeight = 0;
  for (const item of roles) {
    if (!item.palace) continue;
    const palace = chart.palaces.find((candidate) => candidate.palace === item.palace);
    if (!palace) continue;
    const score = palaceScore(palace, chart.pillars.month.branch, !item.objectRole);
    evidence.push({ role: item.role, palace: item.palace, score: round(score) });
    weighted += score * item.weight;
    totalWeight += item.weight;
  }
  const rawScore = totalWeight > 0 ? weighted / totalWeight : 0;
  const rawDirection: QimenDirection = rawScore >= 0.65 ? "UP" : rawScore <= -0.65 ? "DOWN" : "SIDEWAYS";
  const semantic = teacherSemanticCalibration(chart, asset, teacherAnchor);
  const direction = semantic.directionOverride ?? rawDirection;
  let score = rawScore;
  if (semantic.directionOverride === "UP" && score < 0.65) score = 0.7;
  if (semantic.directionOverride === "DOWN" && score > -0.65) score = -0.7;
  if (semantic.directionOverride === "SIDEWAYS") score = clamp(score, -0.5, 0.5);
  const base = direction === "SIDEWAYS" ? 54 : 59;
  const anchorBonus = teacherAnchor?.basis === "TEACHER_EXPLICIT" ? 3 : teacherAnchor ? 1 : 0;
  let confidence = clamp(Math.round(base + Math.abs(score) * 7 + anchorBonus), 50, 90);
  if (semantic.confidenceCap != null) confidence = Math.min(confidence, semantic.confidenceCap);
  if (semantic.pathOrder === "UNKNOWN") confidence = Math.min(confidence, 64);
  return {
    direction,
    score: round(score),
    rawScore: round(rawScore),
    rawDirection,
    confidence,
    anchor: teacherAnchor,
    evidence,
    semantic,
  };
}

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function parseDateOnly(value: string): { year: number; month: number; day: number } | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function determineTargetDate(record: JsonRecord): string {
  const candidates = [record.forecastDate, record.forecastForDate, record.targetDate, record.sessionDate, record.tradeDate, record.date];
  for (const candidate of candidates) {
    const text = safeString(candidate);
    if (text && parseDateOnly(text)) return text.slice(0, 10);
  }
  const now = localParts(new Date());
  const fallback = new Date(Date.UTC(now.year, now.month - 1, now.day + 1));
  return fallback.toISOString().slice(0, 10);
}

function assetIdentity(record: JsonRecord): string {
  const keys = ["marketCode", "symbol", "ticker", "assetKey", "asset", "market", "name", "slug"];
  for (const key of keys) {
    const text = safeString(record[key]);
    if (text) return text.toUpperCase();
  }
  return "MARKET";
}

function inferAssetCategory(asset: string): keyof typeof FINANCIAL_YONGSHEN.categories {
  if (/BTC|ETH|SOL|HYPE|CRYPTO|USDT|SPCX|DOGE/.test(asset)) return "CRYPTO";
  if (/GLD|XAU|GOLD|GC=F|黄金|SILVER|SI=F|XAG|白银/.test(asset)) return "PRECIOUS_METAL";
  if (/WTI|BRENT|OIL|原油|能源/.test(asset)) return "ENERGY";
  if (/DXY|USD|JPY|EUR|GBP|FX|汇率|美元/.test(asset)) return "FX";
  if (/FED|RATE|YIELD|利率|美联储/.test(asset)) return "RATES_POLICY";
  return "EQUITY";
}

interface QimenDailyApplyOptions {
  liuyaoDirection?: string | null;
  previousQimenEvidence?: string | null;
  /** One-time/manual backfill only. Normal automation leaves this empty. */
  castAtOverride?: string | Date | null;
}

function castAtFromEvidence(value: unknown): Date | null {
  const text = safeString(value);
  if (!text) return null;
  const match = text.match(/起局=([^；\s]+)/);
  if (!match?.[1]) return null;
  const parsed = new Date(match[1]);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const MANUAL_DAILY_CAST_OVERRIDES: Record<string, string> = {
  // User-requested 2026-08-18 morning repair; records the actual repair cast
  // rather than pretending the missing forecast had been generated the night before.
  "2026-08-18": "2026-08-17T22:09:00.000Z", // Beijing 2026-08-18 06:09
};

function deterministicCastAt(
  record: JsonRecord,
  previousQimenEvidence?: string | null,
  castAtOverride?: string | Date | null,
): Date {
  if (castAtOverride) {
    const forced = castAtOverride instanceof Date ? castAtOverride : new Date(castAtOverride);
    if (!Number.isNaN(forced.getTime())) return forced;
  }
  // First reuse a previously persisted chart time for the same market/date.
  const previous = castAtFromEvidence(previousQimenEvidence) ?? castAtFromEvidence(record.qimenEvidence);
  if (previous) return previous;

  const existingQimen = asRecord(record.qimen);
  const persisted = safeString(existingQimen?.castAt);
  if (persisted) {
    const parsed = new Date(persisted);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const targetDate = determineTargetDate(record);
  const manualOverride = MANUAL_DAILY_CAST_OVERRIDES[targetDate];
  if (manualOverride) return new Date(manualOverride);

  // With no persisted chart, use a stable research-window time derived from
  // target date + asset. Retries therefore never silently recast the question.
  const parts = parseDateOnly(targetDate) ?? { year: 2026, month: 1, day: 1 };
  // One daily master chart is shared across assets; product differentiation comes
  // from product-specific yongshen, matching the teacher workflow more closely.
  const seed = hashText(`${targetDate}|DAILY_MASTER|${MOOX_QIMEN_CAST_SEED_VERSION}`);
  const hourChoices = [19, 20, 21, 22] as const;
  const minuteChoices = [7, 17, 29, 37, 49] as const;
  const hour = requiredAt(hourChoices, seed % hourChoices.length, "research-window hour");
  const minute = requiredAt(minuteChoices, Math.floor(seed / 7) % minuteChoices.length, "research-window minute");
  // Beijing time on the previous natural day, converted to UTC.
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day - 1, hour - 8, minute, 0));
}

function normalizeDirection(value: unknown): QimenDirection | null {
  const text = safeString(value);
  if (!text) return null;
  const upper = text.toUpperCase();
  if (["UP", "BULLISH", "LONG"].includes(upper)) return "UP";
  if (["DOWN", "BEARISH", "SHORT"].includes(upper)) return "DOWN";
  if (["SIDEWAYS", "NEUTRAL", "RANGE"].includes(upper)) return "SIDEWAYS";
  // Order matters for path-style Chinese formal directions.
  if (/先涨后跌|冲高回落|震荡下跌|看跌|下跌|偏空/.test(text)) return "DOWN";
  if (/先跌后涨|探底回升|震荡上涨|看涨|上涨|偏多/.test(text)) return "UP";
  if (/震荡|横盘|中性|观望/.test(text)) return "SIDEWAYS";
  return null;
}

function renderFormalDirection(direction: QimenDirection): "上涨" | "下跌" | "震荡" {
  if (direction === "UP") return "上涨";
  if (direction === "DOWN") return "下跌";
  return "震荡";
}

function palaceStatusText(palace: PalaceState): string {
  const states: string[] = [];
  if (palace.void) states.push("空");
  if (palace.horse) states.push("马");
  if (palace.doorPressure) states.push("门迫");
  if (palace.stemTomb) states.push("入墓");
  if (palace.instrumentPunishment) states.push("击刑");
  return states.length ? states.join("+") : "平";
}

type MethodAgreement = "NO_LIUYAO_SIGNAL" | "RESONANCE" | "DIVERGENCE";

function agreementLabel(agreement: MethodAgreement): string {
  if (agreement === "RESONANCE") return "共振";
  if (agreement === "DIVERGENCE") return "分歧并列";
  return "周卦派生观点未生成";
}

function renderQimenEvidence(input: {
  chart: QimenChart;
  direction: QimenDirection;
  confidence: number;
  score: number;
  category: keyof typeof FINANCIAL_YONGSHEN.categories;
  assetAnchor: TeacherAssetAnchor | null;
  agreement: MethodAgreement;
  rawScore?: number;
  semantic?: TeacherSemanticCalibration;
}): string {
  const { chart, direction, confidence, score, category, assetAnchor, agreement, rawScore, semantic } = input;
  const palaceText = chart.palaces.map((palace) => {
    const heaven = palace.heavenStem ?? "—";
    const star = palace.star ?? "—";
    const door = palace.door ?? "—";
    const deity = palace.deity ?? "—";
    return `${palace.palace}${palace.trigram}[地${palace.earthStem}|天${heaven}|${star}|${door}|${deity}|${palaceStatusText(palace)}]`;
  }).join("/");
  const mode = chart.yinYang === "YANG" ? "阳遁" : "阴遁";
  const directionText = renderFormalDirection(direction);
  return [
    `奇门独立观点=${directionText}`,
    `置信度=${confidence}%`,
    `评分=${score}`,
    `数字原始评分=${rawScore ?? score}`,
    `老师语义校准=${semantic ? `${semantic.version}|波动${semantic.volatility}|下行尾险${semantic.downsideTail}|托底${semantic.rescueSupport}|路径${semantic.pathOrder}${semantic.notes.length ? `|${semantic.notes.join("/")}` : ""}` : "未启用"}`,
    `起局=${chart.castAt}`,
    `体系=${chart.method}`,
    `四柱=${chart.pillars.year.text}/${chart.pillars.month.text}/${chart.pillars.day.text}/${chart.pillars.hour.text}`,
    `节气=${chart.solarTerm}`,
    `局=${mode}${chart.ju}局`,
    `值符=${chart.chiefStar}@${chart.chiefStarPalace}宫`,
    `值使=${chart.chiefDoor}@${chart.chiefDoorPalace}宫`,
    `旬首=${chart.xunHead}-${chart.xunHeadInstrument}`,
    `旬空=${chart.voidBranches.join("") || "—"}`,
    `驿马=${chart.horseBranch}`,
    `对象类别=${category}`,
    `金融用神=${assetAnchor ? `${assetAnchor.primary.join("/")}${assetAnchor.secondary?.length ? `+${assetAnchor.secondary.join("/")}` : ""}|${assetAnchor.basis}` : "通用时干/日干协议|GENERIC_FALLBACK"}`,
    `用神依据=${assetAnchor?.note ?? "现有老师资料未明确该产品专属奇门用神，不擅自补写"}`,
    `与周卦派生观点关系=${agreementLabel(agreement)}`,
    `九宫=${palaceText}`,
    "规则边界=老师六爻软优先-发布前严格三层共识可改选用户六爻-六爻与奇门独立预测-同向提高信心-分歧并列并降低信心-外部层不单独定方向",
    "来源边界=标准盘与老师明确象意分层-MOOX数字评分不冒充老师未公开取宫法",
  ].join("；");
}

function appendMethodSummary(record: JsonRecord, text: string): void {
  const keys = ["summary", "analysis", "reasoning", "logic", "conclusion"];
  for (const key of keys) {
    const current = safeString(record[key]);
    if (!current || current.includes("【双法并列】")) continue;
    record[key] = `【双法并列】${text}\n${current.replace(/【奇门主判】[^\n]*\n?/gu, "")}`;
    return;
  }
}

function looksLikeDailyForecast(record: JsonRecord): boolean {
  const hasDirection = ["direction", "trend", "bias", "view"].some((key) => key in record);
  const hasAsset = ["marketCode", "symbol", "ticker", "asset", "assetKey", "market", "name", "slug"].some((key) => key in record);
  const hasResearch = ["forecastDate", "expectedPath", "summary", "analysis", "reasoning", "logic", "conclusion", "support", "resistance", "supportLevels", "resistanceLevels"].some((key) => key in record);
  return hasDirection && hasAsset && hasResearch;
}

function resonanceStars(confidence: number, agreement: MethodAgreement): 1 | 2 | 3 | 4 | 5 {
  const base = Math.max(1, Math.min(5, Math.round(confidence / 20)));
  const adjusted = agreement === "RESONANCE" ? base + 1 : agreement === "DIVERGENCE" ? base - 1 : base;
  return Math.max(1, Math.min(5, adjusted)) as 1 | 2 | 3 | 4 | 5;
}


function qimenMysticLine(
  chart: QimenChart,
  signal: { direction: QimenDirection; anchor: TeacherAssetAnchor | null },
): string {
  const primaryStem = signal.anchor?.primary[0] ?? chart.pillars.hour.stem;
  const palaceNumber = findHeavenPalace(chart, primaryStem) ?? findEarthPalace(chart, primaryStem);
  const palace = palaceNumber
    ? chart.palaces.find((candidate) => candidate.palace === palaceNumber) ?? null
    : null;
  if (!palace) {
    return signal.direction === "UP"
      ? "气机渐聚，阳势有启；顺势而观，不逐躁动。"
      : signal.direction === "DOWN"
        ? "气机内收，阴势渐重；先守后看，不逆其锋。"
        : "气机未成一线，阴阳相持；静观其变，候门而动。";
  }
  const position = palace.palace === 5 ? `${primaryStem}居中宫` : `${primaryStem}落${palace.trigram}${palace.palace}宫`;
  const omens: string[] = [];
  if (palace.door && palace.deity) omens.push(`${palace.door}${palace.deity}同临`);
  else if (palace.door) omens.push(`${palace.door}临宫`);
  else if (palace.deity) omens.push(`${palace.deity}临宫`);
  if (palace.star) omens.push(`${palace.star}随势`);
  if (palace.horse) omens.push("驿马催行");
  if (palace.void) omens.push("旬空减力");
  if (palace.stemTomb) omens.push("入墓收气");
  if (palace.doorPressure) omens.push("门迫添折");
  if (palace.instrumentPunishment) omens.push("击刑生扰");
  const tail = signal.direction === "UP"
    ? "阳机渐聚，势取其升"
    : signal.direction === "DOWN"
      ? "阴势收束，先防回落"
      : "阴阳相持，宜观其变";
  return `${position}${omens.length ? `，${omens.slice(0, 3).join("、")}` : ""}；${tail}。`;
}

function agreementDisplayLabel(agreement: MethodAgreement): string {
  if (agreement === "RESONANCE") return "奇六共振";
  if (agreement === "DIVERGENCE") return "奇六分歧·两种观点并列";
  return "奇门独立验算";
}

function overlayForecast(record: JsonRecord, options: QimenDailyApplyOptions = {}): JsonRecord {
  const next: JsonRecord = { ...record };
  const asset = assetIdentity(record);
  const category = inferAssetCategory(asset);
  const castAt = deterministicCastAt(record, options.previousQimenEvidence, options.castAtOverride);
  const chart = buildQimenChart(castAt);
  const signal = directionFromChart(chart, asset);
  const directionKey = ["direction", "trend", "bias", "view"].find((key) => key in record) ?? "direction";
  const legacyRaw = record[directionKey];
  const liuyaoDirection = normalizeDirection(
    options.liuyaoDirection ?? record.liuyaoDirection ?? record.liuyaoEvidence ?? record.hexagramDirection ?? record.mysticDirection ?? legacyRaw,
  );
  const agreement = liuyaoDirection === null
    ? "NO_LIUYAO_SIGNAL" as const
    : liuyaoDirection === signal.direction
      ? "RESONANCE" as const
      : "DIVERGENCE" as const;
  const targetDate = determineTargetDate(record);
  const marketBaziRegime = getDailyMarketBaziRegime(asset, targetDate);
  const marketBaziRelation = !marketBaziRegime
    ? "NO_SIGNAL" as const
    : signal.direction === "SIDEWAYS"
      ? "QIMEN_SIDEWAYS" as const
      : marketBaziRegime.direction === signal.direction
        ? "ALIGN" as const
        : "CONFLICT" as const;
  const marketBaziAdjustment = marketBaziRelation === "ALIGN"
    ? Math.min(4, Math.round(marketBaziRegime!.weightPct / 2))
    : marketBaziRelation === "CONFLICT"
      ? -Math.min(7, Math.round(marketBaziRegime!.weightPct * 0.75))
      : marketBaziRelation === "QIMEN_SIDEWAYS"
        ? -2
        : 0;
  const weeklyTeacherCalibration = getWuWeeklyCalibration(asset, targetDate);
  const weeklyTeacherEvent = getWuWeeklyEventWindow(targetDate);
  let weeklyTeacherAdjustment = 0;
  if (weeklyTeacherCalibration) {
    if (weeklyTeacherCalibration.directionCode === signal.direction) weeklyTeacherAdjustment += 3;
    else if (weeklyTeacherCalibration.directionCode === "SIDEWAYS" && signal.direction !== "SIDEWAYS") weeklyTeacherAdjustment -= 4;
    else if (weeklyTeacherCalibration.directionCode !== "UNSPECIFIED" && signal.direction !== "SIDEWAYS") weeklyTeacherAdjustment -= 6;
    if (weeklyTeacherCalibration.pathOrder === "UNKNOWN") weeklyTeacherAdjustment -= 2;
  }
  if (weeklyTeacherEvent?.kind === "DOWNSIDE_BLACK_SWAN_RISK") {
    weeklyTeacherAdjustment += signal.direction === "DOWN" ? 2 : signal.direction === "UP" ? -3 : 0;
  } else if (weeklyTeacherEvent?.kind === "RESCUE_SUPPORT") {
    weeklyTeacherAdjustment += signal.direction === "UP" ? 2 : signal.direction === "DOWN" ? -3 : 0;
  }
  const qimenConfidence = clamp(
    signal.confidence
      + marketBaziAdjustment
      + weeklyTeacherAdjustment,
    42,
    92,
  );

  // A valid Qimen chart adds a coequal, independent forecast. The stored weekly
  // direction is preserved for version immutability; relationship fields expose
  // resonance or divergence without letting either method erase the other.
  if (chart.invariants.valid) {
    const baseConfidence = typeof record.confidence === "number" ? record.confidence : 60;
    const relationshipAdjustment = agreement === "RESONANCE" ? 5 : agreement === "DIVERGENCE" ? -9 : 0;
    const consensusConfidence = clamp(baseConfidence + relationshipAdjustment, 0, 100);
    if ("confidence" in record && agreement !== "NO_LIUYAO_SIGNAL") next.confidence = consensusConfidence;
    if ("consensusStars" in record) next.consensusStars = resonanceStars(baseConfidence, agreement);
    if ("consensusScore" in record) next.consensusScore = consensusConfidence;
    if ("consensusLabel" in record) {
      next.consensusLabel = agreement === "RESONANCE" ? "奇门六爻共振·信心提高" : agreement === "DIVERGENCE" ? "奇门六爻分歧·观点并列·信心降低" : "单方法观点·等待另一方法";
    }
    // GeneratedDailyForecastRecord persists this TEXT column, so the full audit
    // evidence survives DB writes without a schema migration.
    if ("qimenEvidence" in record || "marketCode" in record || "forecastDate" in record || "forecastForDate" in record) {
      const qimenEvidence = renderQimenEvidence({
        chart,
        direction: signal.direction,
        confidence: qimenConfidence,
        score: signal.score,
        category,
        assetAnchor: signal.anchor,
        agreement,
        rawScore: signal.rawScore,
        semantic: signal.semantic,
      });
      next.qimenEvidence = [
        qimenEvidence,
        marketBaziRegime
          ? `资产八字月度先验=${marketBaziRegime.direction === "UP" ? "上涨" : "下跌"}/${marketBaziRegime.weightPct}%/${marketBaziRelation === "ALIGN" ? "同向" : marketBaziRelation === "CONFLICT" ? "分歧" : "奇门震荡"}；八字不可单独改写奇门`
          : null,
        `吴老师周度校准=${weeklyTeacherCalibration ? `${weeklyTeacherCalibration.directionZh}|波动${weeklyTeacherCalibration.volatility}|尾险${weeklyTeacherCalibration.downsideTail}|路径${weeklyTeacherCalibration.pathOrder}|${weeklyTeacherCalibration.summaryZh}` : "本期无该资产专属结论"}`,
        `吴老师目标日窗口=${weeklyTeacherEvent ? `${weeklyTeacherEvent.ganzhi}|${weeklyTeacherEvent.kind}|${weeklyTeacherEvent.noteZh}` : "无"}`,
      ].filter((value): value is string => Boolean(value)).join("；");
    }
  } else if ("qimenEvidence" in record || "marketCode" in record || "forecastDate" in record || "forecastForDate" in record) {
    next.qimenEvidence = `奇门不可用=盘面结构校验失败；起局=${chart.castAt}；规则=保留原方向并禁止奇门覆盖`;
  }

  // Structured metadata remains available in-memory for admin/debug surfaces.
  next.qimen = {
    policyVersion: MOOX_QIMEN_POLICY_VERSION,
    engineVersion: chart.engineVersion,
    role: "PARALLEL_INDEPENDENT_FORECAST",
    available: chart.invariants.valid,
    direction: signal.direction,
    formalDirection: renderFormalDirection(signal.direction),
    confidence: qimenConfidence,
    score: signal.score,
    rawDigitalScore: signal.rawScore,
    rawDigitalDirection: signal.rawDirection,
    teacherSemanticCalibration: signal.semantic,
    weeklyTeacherCalibration,
    weeklyTeacherEvent,
    weeklyTeacherConfidenceAdjustment: weeklyTeacherAdjustment,
    assetCategory: category,
    yongshen: {
      primary: [...FINANCIAL_YONGSHEN.core.primary],
      secondary: [...FINANCIAL_YONGSHEN.core.secondary],
      categoryIndicators: [...FINANCIAL_YONGSHEN.categories[category]],
      teacherAssetAnchor: signal.anchor,
      personalBaziVote: "DISABLED_FOR_PUBLIC_MARKET_DIRECTION",
      assetBaziRegimeVote: "CAPPED_REGIME_PRIOR_NO_SOLO_QIMEN_OVERRIDE",
    },
    liuyaoAuthority: {
      direction: liuyaoDirection,
      role: "PARALLEL_INDEPENDENT_FORECAST_FROM_ACTIVE_WEEKLY_OR_STAGE_RECORD",
      agreement,
      canBeOverriddenByQimen: false,
      prePublicationSourceArbitration: "TEACHER_SOFT_PRIORITY_USER_ONLY_IF_QIMEN_ANALYST_MAJORITY_CHAN_ALL_ALIGN",
    },
    marketBaziRegime: marketBaziRegime
      ? {
          ...marketBaziRegime,
          relationToQimen: marketBaziRelation,
          role: "MONTHLY_REGIME_PRIOR_AND_CONVICTION_ADJUSTMENT",
          canOverrideQimen: false,
        }
      : null,
    technicalBoundary: "NO_SOLO_DIRECTION_VOTE_PREPUBLICATION_LIUYAO_ARBITRATION_ONLY",
    marketBaziBoundary: "ASSET_BAZI_ADJUSTS_REGIME_CONVICTION_AND_TACTICAL_RISK_NOT_OFFICIAL_QIMEN_DIRECTION",
    castTimePolicy: "ONE_DAILY_MASTER_CHART_PERSISTED_OR_DETERMINISTIC_RESEARCH_WINDOW",
    evidence: signal.evidence,
    chart,
    sourceBoundary: {
      teacherEvidence: "吴老师产品用神锚点 + 2026-08-24周度语义校准 + 金兔子日/时干、值符值使、门星神与旺衰象意",
      mooxDigitalProtocol: "数字评分仅作可复现底层；遇老师已明确示范的同结构时先走语义校准，仍不冒充老师未公开的人工取宫法",
    },
  };
  next.methodPriority = "CONDITIONAL_LIUYAO_SOURCE_AUTHORITY_QIMEN_PARALLEL_FORECAST_RESONANCE";
  next.qimenParallelDirection = signal.direction;
  next.liuyaoOfficialDirection = liuyaoDirection;
  // Deprecated aliases remain for legacy readers; they no longer describe authority.
  next.qimenPrimaryDirection = signal.direction;
  next.liuyaoAuxiliaryDirection = liuyaoDirection;
  next.directionConflict = agreement === "DIVERGENCE" || marketBaziRelation === "CONFLICT";
  next.marketBaziRegime = marketBaziRegime
    ? { ...marketBaziRegime, relationToQimen: marketBaziRelation, canOverrideQimen: false }
    : null;
  next.qimenMysticNote = signal.semantic.notes[0] ?? qimenMysticLine(chart, { direction: signal.direction, anchor: signal.anchor });
  const baziLabel = marketBaziRegime
    ? `；资产八字${marketBaziRegime.direction === "UP" ? "偏多" : "偏空"}${marketBaziRelation === "CONFLICT" ? "·与奇门分歧" : marketBaziRelation === "ALIGN" ? "·同向" : ""}`
    : "";
  next.qimenAgreementLabel = `${agreementDisplayLabel(agreement)}${baziLabel}`;

  const liuyaoText = liuyaoDirection ? renderFormalDirection(liuyaoDirection) : "未生成";
  const relationText = agreement === "RESONANCE" ? "同向，信心提高" : agreement === "DIVERGENCE" ? "分歧，两种观点并列" : "待核";
  const baziText = marketBaziRegime ? `；资产八字月度先验：${marketBaziRegime.direction === "UP" ? "上涨" : "下跌"}（${marketBaziRegime.weightPct}%）` : "";
  const summary = `六爻独立预测：${liuyaoText}；奇门独立预测：${renderFormalDirection(signal.direction)}（${qimenConfidence}%）；关系：${relationText}${baziText}`;
  appendMethodSummary(next, summary);
  return next;
}

export function applyQimenFirstToGeneratedDaily<T>(
  value: T,
  options: QimenDailyApplyOptions = {},
): T {
  const record = asRecord(value);
  if (!record || !looksLikeDailyForecast(record)) return value;
  return overlayForecast(record, options) as T;
}

function visit(value: unknown, depth: number): unknown {
  if (depth > 5) return value;
  if (Array.isArray(value)) return value.map((item) => visit(item, depth + 1));
  const record = asRecord(value);
  if (!record) return value;
  if (looksLikeDailyForecast(record)) return overlayForecast(record);

  let changed = false;
  const next: JsonRecord = { ...record };
  const containerKeys = ["rows", "items", "forecasts", "predictions", "data", "daily", "results", "assets"];
  for (const key of containerKeys) {
    if (!(key in record)) continue;
    const visited = visit(record[key], depth + 1);
    if (visited !== record[key]) {
      next[key] = visited;
      changed = true;
    }
  }
  return changed ? next : value;
}

export function applyQimenFirstDailyPolicy<T>(value: T): T {
  return visit(value, 0) as T;
}

export function getFinancialQimenYongshenRegistry(): typeof FINANCIAL_YONGSHEN {
  return FINANCIAL_YONGSHEN;
}

export function buildMooxQimenChartForAudit(castAt: string | Date): QimenChart {
  const date = castAt instanceof Date ? castAt : new Date(castAt);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid Qimen cast time");
  return buildQimenChart(date);
}

export type ExperimentalQimenSnapshot = {
  protocol: "MOOX_ALTCOIN_QIMEN_EXPERIMENT_V1";
  castAt: string;
  available: boolean;
  direction: "上涨" | "下跌" | "震荡";
  confidence: number;
  score: number;
  rawScore: number;
  volatility: TeacherSemanticVolatility;
  downsideTail: TeacherSemanticRisk;
  rescueSupport: TeacherSemanticRisk;
  pathOrder: TeacherSemanticPathOrder;
  teacherNotes: string[];
  noteZh: string;
  yongshenSource: "TEACHER_ASSET_ANCHOR" | "GENERIC_TIME_DAY_PROTOCOL";
};

/**
 * Research-only Qimen snapshot for experimental altcoin screening.
 * It never writes forecasts and never has execution authority.
 */
export function evaluateExperimentalQimenAt(asset: string, castAt: string | Date): ExperimentalQimenSnapshot {
  const date = castAt instanceof Date ? castAt : new Date(castAt);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid experimental Qimen cast time");
  const chart = buildQimenChart(date);
  const signal = directionFromChart(chart, asset);
  return {
    protocol: "MOOX_ALTCOIN_QIMEN_EXPERIMENT_V1",
    castAt: chart.castAt,
    available: chart.invariants.valid,
    direction: chart.invariants.valid ? renderFormalDirection(signal.direction) : "震荡",
    confidence: chart.invariants.valid ? signal.confidence : 0,
    score: signal.score,
    rawScore: signal.rawScore,
    volatility: signal.semantic.volatility,
    downsideTail: signal.semantic.downsideTail,
    rescueSupport: signal.semantic.rescueSupport,
    pathOrder: signal.semantic.pathOrder,
    teacherNotes: [...signal.semantic.notes],
    noteZh: chart.invariants.valid
      ? signal.semantic.notes[0] ?? qimenMysticLine(chart, { direction: signal.direction, anchor: signal.anchor })
      : "盘面结构校验未通过，本次实验信号不采用。",
    yongshenSource: signal.anchor ? "TEACHER_ASSET_ANCHOR" : "GENERIC_TIME_DAY_PROTOCOL",
  };
}
