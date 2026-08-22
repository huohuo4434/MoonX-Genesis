/**
 * MOOX V7.20.2 — Focus/watchlist Qimen parallel research layer.
 *
 * This module deliberately does NOT rewrite Liuyao or any formal focus direction.
 * It builds an independent Qimen reading for the same date so members can compare
 * the two systems and later verify them separately.
 *
 * Source boundary:
 * - Teacher explicit/case mappings are labelled TEACHER_*.
 * - Unpublished ticker mappings are transparent MOOX industry overlays.
 * - Direction comes from the use-god palace's door/star/deity/season/status; the
 *   stem used to identify an asset is not itself treated as bullish or bearish.
 */
import { buildMooxQimenChartForAudit, evaluateExperimentalQimenAt } from "@/lib/forecasts/qimen-first-policy";
import { classifyDailyDirection } from "@/lib/forecasts/daily-direction-family";

export const MOOX_FOCUS_QIMEN_PARALLEL_VERSION = "FOCUS_QIMEN_PARALLEL_V2_WU_SEMANTIC_20260820";
export const MOOX_FOCUS_QIMEN_ACCURACY_BASELINE = "2026-08-18";

export type FocusQimenDirectionCode = "UP" | "DOWN" | "SIDEWAYS";
export type FocusQimenDirection = "上涨" | "下跌" | "震荡" | "休市观察" | "资料不足";
export type FocusQimenUseGodBasis =
  | "TEACHER_EXPLICIT"
  | "TEACHER_CASE"
  | "MOOX_INDUSTRY_OVERLAY"
  | "GENERIC_TIME_STEM";
export type FocusQimenRelation =
  | "RESONANCE"
  | "DIVERGENCE"
  | "LIUYAO_MISSING"
  | "NOT_COMPARABLE";
export type FocusQimenValidationStatus =
  | "PENDING"
  | "RETROACTIVE_BASELINE"
  | "NOT_ELIGIBLE"
  | "UNAVAILABLE";

export type FocusQimenUseGodDefinition = {
  assetId: string;
  displayName: string;
  assetClass: "CRYPTO" | "EQUITY";
  aliases: readonly string[];
  primary: readonly string[];
  secondary: readonly string[];
  basis: FocusQimenUseGodBasis;
  label: string;
  note: string;
};

export type FocusQimenParallelReading = {
  policyVersion: string;
  protocol: "PARALLEL_METHOD_NO_OVERRIDE";
  assetId: string;
  forecastDate: string;
  available: boolean;
  directionCode: FocusQimenDirectionCode | null;
  direction: FocusQimenDirection;
  confidence: number | null;
  score: number | null;
  summary: string;
  mysticNote: string;
  useGod: string;
  useGodBasis: FocusQimenUseGodBasis;
  useGodNote: string;
  castAt: string;
  chartSummary: string;
  evidence: string;
  relation: FocusQimenRelation;
  relationLabel: string;
  validationStatus: FocusQimenValidationStatus;
  verificationEligible: boolean;
  verificationKey: string;
};

type PalaceNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type PalaceState = {
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
};
type FocusQimenChart = {
  castAt: string;
  solarTerm: string;
  yinYang: "YANG" | "YIN";
  yuan: "UPPER" | "MIDDLE" | "LOWER";
  ju: number;
  pillars: {
    year: { stem: string; branch: string; text: string };
    month: { stem: string; branch: string; text: string };
    day: { stem: string; branch: string; text: string };
    hour: { stem: string; branch: string; text: string };
  };
  xunHeadInstrument: string;
  chiefStar: string;
  chiefDoor: string;
  chiefStarPalace: PalaceNumber;
  chiefDoorPalace: PalaceNumber;
  palaces: PalaceState[];
  invariants: { valid: boolean };
};

const USE_GOD_REGISTRY: Readonly<Record<string, FocusQimenUseGodDefinition>> = Object.freeze({
  btc: {
    assetId: "btc", displayName: "比特币", assetClass: "CRYPTO", aliases: ["BTC", "BTCUSDT"],
    primary: ["戊"], secondary: ["壬"], basis: "TEACHER_EXPLICIT", label: "戊为体，壬为流",
    note: "吴老师BTC案例明确以戊土为对象，并结合壬水观察资金与流动关系。",
  },
  eth: {
    assetId: "eth", displayName: "以太坊", assetClass: "CRYPTO", aliases: ["ETH", "ETHUSDT"],
    primary: ["壬"], secondary: ["戊"], basis: "MOOX_INDUSTRY_OVERLAY", label: "壬为网，戊为资",
    note: "MOOX对象层：以网络流动与生态承载识别ETH；这不是老师公开的固定ticker口诀。",
  },
  sol: {
    assetId: "sol", displayName: "Solana", assetClass: "CRYPTO", aliases: ["SOL", "SOLUSDT"],
    primary: ["丙"], secondary: ["壬"], basis: "MOOX_INDUSTRY_OVERLAY", label: "丙主疾，壬主流",
    note: "MOOX对象层：高速链以丙火速度、壬水网络流动作为识别辅助。",
  },
  hype: {
    assetId: "hype", displayName: "HYPE", assetClass: "CRYPTO", aliases: ["HYPE", "HYPEUSDT"],
    primary: ["丁"], secondary: ["壬"], basis: "MOOX_INDUSTRY_OVERLAY", label: "丁主盘，壬主流",
    note: "MOOX对象层：交易平台与衍生品以丁火信息盘面、壬水流动作为识别辅助。",
  },
  asteroid: {
    assetId: "asteroid", displayName: "太空狗", assetClass: "CRYPTO", aliases: ["ASTEROID", "太空狗"],
    primary: ["癸"], secondary: ["丙"], basis: "MOOX_INDUSTRY_OVERLAY", label: "癸察微流，丙观声势",
    note: "MOOX实验对象层：小市值币以微流动与传播热度识别；标记为高不确定性。",
  },
  sandisk: {
    assetId: "sandisk", displayName: "闪迪", assetClass: "EQUITY", aliases: ["SNDK", "SNDKUSDT", "SANDISK", "闪迪"],
    primary: ["辛"], secondary: ["丁"], basis: "MOOX_INDUSTRY_OVERLAY", label: "辛为精芯，丁为数火",
    note: "MOOX对象层：闪存/SSD属于精密半导体硬件，辅看电子与AI数据需求；公开资料未发现老师固定SNDK用神表。",
  },
  mu: {
    assetId: "mu", displayName: "美光", assetClass: "EQUITY", aliases: ["MU", "MUUSDT", "MICRON", "美光"],
    primary: ["辛"], secondary: ["丁"], basis: "MOOX_INDUSTRY_OVERLAY", label: "辛为存储，丁为算力",
    note: "MOOX对象层：DRAM/NAND/HBM以精密芯片为体、AI电子需求为辅。",
  },
  cxmt: {
    assetId: "cxmt", displayName: "长鑫科技", assetClass: "EQUITY", aliases: ["CXMT", "688825", "长鑫科技"],
    primary: ["辛"], secondary: ["丁"], basis: "MOOX_INDUSTRY_OVERLAY", label: "辛为芯体，丁为智用",
    note: "MOOX对象层：DRAM制造以精密芯片为体、服务器与智能终端需求为辅。",
  },
  nbis: {
    assetId: "nbis", displayName: "Nebius", assetClass: "EQUITY", aliases: ["NBIS", "NBISUSDT", "NEBIUS"],
    primary: ["丙"], secondary: ["丁"], basis: "MOOX_INDUSTRY_OVERLAY", label: "丙为算力，丁为模型",
    note: "MOOX对象层：AI云/GPU基础设施以算力扩张与数字应用识别。",
  },
  googl: {
    assetId: "googl", displayName: "谷歌", assetClass: "EQUITY", aliases: ["GOOGL", "GOOG", "ALPHABET", "谷歌"],
    primary: ["丙"], secondary: ["丁"], basis: "MOOX_INDUSTRY_OVERLAY", label: "丙照云算，丁主信息",
    note: "MOOX对象层：互联网、AI与云平台以丙丁信息/算力象识别。",
  },
  msft: {
    assetId: "msft", displayName: "微软", assetClass: "EQUITY", aliases: ["MSFT", "MSFTUSDT", "MICROSOFT", "微软"],
    primary: ["丙"], secondary: ["丁"], basis: "MOOX_INDUSTRY_OVERLAY", label: "丙主云算，丁主软件",
    note: "MOOX对象层：云、软件与AI平台以丙丁信息/算力象识别。",
  },
  tencent: {
    assetId: "tencent", displayName: "腾讯", assetClass: "EQUITY", aliases: ["TENCENT", "0700", "腾讯"],
    primary: ["丁"], secondary: ["丙"], basis: "MOOX_INDUSTRY_OVERLAY", label: "丁主网络，丙主扩张",
    note: "MOOX对象层：社交、游戏、云与数字内容以丁火信息象为体。",
  },
  "kingsoft-office": {
    assetId: "kingsoft-office", displayName: "金山办公", assetClass: "EQUITY", aliases: ["KINGSOFT-OFFICE", "688111", "金山办公"],
    primary: ["丁"], secondary: ["丙"], basis: "MOOX_INDUSTRY_OVERLAY", label: "丁为文软，丙为AI",
    note: "MOOX对象层：办公软件与AI应用以丁火文字信息象为体。",
  },
  lite: {
    assetId: "lite", displayName: "Lumentum", assetClass: "EQUITY", aliases: ["LITE", "LUMENTUM"],
    primary: ["丁"], secondary: ["丙"], basis: "MOOX_INDUSTRY_OVERLAY", label: "丁为光讯，丙为传速",
    note: "MOOX对象层：光通信/光子器件以光、电、信息传输象识别。",
  },
  tsla: {
    assetId: "tsla", displayName: "特斯拉", assetClass: "EQUITY", aliases: ["TSLA", "TESLA", "特斯拉"],
    primary: ["丙"], secondary: ["庚"], basis: "MOOX_INDUSTRY_OVERLAY", label: "丙为能源智火，庚为车机",
    note: "MOOX对象层：电动车、能源与AI为用，机械制造为辅。",
  },
  spcx: {
    assetId: "spcx", displayName: "SpaceX / SPCX", assetClass: "EQUITY", aliases: ["SPCX", "SPACEX"],
    primary: ["丙"], secondary: ["庚"], basis: "MOOX_INDUSTRY_OVERLAY", label: "丙观动能，庚观制造",
    note: "MOOX对象层：航天、卫星网络与高端制造并看。",
  },
  intel: {
    assetId: "intel", displayName: "英特尔", assetClass: "EQUITY", aliases: ["INTC", "INTEL", "英特尔"],
    primary: [], secondary: [], basis: "GENERIC_TIME_STEM", label: "等待老师用神依据",
    note: "当前未提供老师针对INTC的固定用神或可追溯案例，因此不生成奇门方向，也不参与六爻共振比较。",
  },
  "lexin-medical": {
    assetId: "lexin-medical", displayName: "乐心医疗", assetClass: "EQUITY", aliases: ["300562", "乐心医疗"],
    primary: ["乙"], secondary: ["丁"], basis: "MOOX_INDUSTRY_OVERLAY", label: "乙为医护，丁为电子",
    note: "MOOX对象层：医疗健康为体，智能穿戴/电子数据为辅。",
  },
  "lian-tech": {
    assetId: "lian-tech", displayName: "利安科技", assetClass: "EQUITY", aliases: ["300784", "利安科技"],
    primary: ["己"], secondary: ["庚"], basis: "MOOX_INDUSTRY_OVERLAY", label: "己为模塑，庚为精工",
    note: "MOOX对象层：模具、注塑与精密制造以土金生产象识别。",
  },
  "ganfeng-lithium": {
    assetId: "ganfeng-lithium", displayName: "赣锋锂业", assetClass: "EQUITY", aliases: ["002460", "GANFENG", "赣锋锂业"],
    primary: ["庚"], secondary: ["辛"], basis: "MOOX_INDUSTRY_OVERLAY", label: "庚辛为矿金",
    note: "MOOX对象层：锂资源、材料与金属产业以庚辛金象识别。",
  },
});

const DOOR_SCORE: Readonly<Record<string, number>> = Object.freeze({
  生门: 2.7, 开门: 2.2, 景门: 1.0, 休门: 0.5, 杜门: -0.4, 惊门: -1.0, 伤门: -1.5, 死门: -2.2,
});
const STAR_SCORE: Readonly<Record<string, number>> = Object.freeze({
  天冲: 1.5, 天英: 1.0, 天辅: 0.6, 天任: 0.5, 天心: 0.5, 天禽: 0.2, 天蓬: -0.4, 天柱: -0.9, 天芮: -1.3,
});
const DEITY_SCORE: Readonly<Record<string, number>> = Object.freeze({
  九天: 1.8, 值符: 1.0, 六合: 0.6, 太阴: 0.3, 腾蛇: -0.5, 玄武: -0.9, 九地: -1.0, 白虎: -1.8,
});
const STEM_SCORE: Readonly<Record<string, number>> = Object.freeze({
  丙: 1.8, 丁: 1.5, 戊: 0.5, 乙: 0.3, 壬: 0.1, 癸: -0.1, 己: -0.2, 庚: -1.4, 辛: -1.7, 甲: 0,
});
const BRANCH_ELEMENT: Readonly<Record<string, string>> = Object.freeze({
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
});
const GENERATES: Readonly<Record<string, string>> = Object.freeze({ 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" });
const CONTROLS: Readonly<Record<string, string>> = Object.freeze({ 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" });

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function requiredAt<T>(items: readonly T[], index: number, label: string): T {
  const value = items[index];
  if (value === undefined) throw new Error(`Missing ${label}`);
  return value;
}
function parseDate(value: string): { year: number; month: number; day: number } | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match?.[1] || !match[2] || !match[3]) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  if (new Date(timestamp).toISOString().slice(0, 10) !== value) return null;
  return { year, month, day };
}
function isWeekend(value: string): boolean {
  const parsed = parseDate(value);
  if (!parsed) return false;
  const weekday = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
  return weekday === 0 || weekday === 6;
}
function castAtForDate(forecastDate: string, salt = "DAILY_MASTER|QIMEN_PRIMARY_TEACHER_YONGSHEN_LIUYAO_AUX_V2"): Date {
  if (forecastDate === "2026-08-18" && salt.startsWith("DAILY_MASTER")) return new Date("2026-08-17T22:09:00.000Z");
  const parsed = parseDate(forecastDate);
  if (!parsed) throw new Error(`Invalid focus Qimen forecast date: ${forecastDate}`);
  const seed = hashText(`${forecastDate}|${salt}`);
  const hours = [19, 20, 21, 22] as const;
  const minutes = [7, 17, 29, 37, 49] as const;
  const hour = requiredAt(hours, seed % hours.length, "focus research hour");
  const minute = requiredAt(minutes, Math.floor(seed / 7) % minutes.length, "focus research minute");
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day - 1, hour - 8, minute, 0));
}
function palaceByNumber(chart: FocusQimenChart, number: PalaceNumber | null): PalaceState | null {
  if (number == null) return null;
  return chart.palaces.find((item) => item.palace === number) ?? null;
}
function effectiveStem(chart: FocusQimenChart, stem: string): string {
  return stem === "甲" ? chart.xunHeadInstrument : stem;
}
function heavenPalace(chart: FocusQimenChart, stem: string): PalaceNumber | null {
  const target = effectiveStem(chart, stem);
  return chart.palaces.find((item) => item.heavenStem === target)?.palace ?? null;
}
function earthPalace(chart: FocusQimenChart, stem: string): PalaceNumber | null {
  const target = effectiveStem(chart, stem);
  return chart.palaces.find((item) => item.earthStem === target)?.palace ?? null;
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
function palaceScore(palace: PalaceState, monthBranch: string, includeMarketStemSignal: boolean): number {
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
function resolveUseGod(assetId: string, symbol?: string | null): FocusQimenUseGodDefinition {
  const direct = USE_GOD_REGISTRY[assetId.toLowerCase()];
  if (direct) return direct;
  const candidate = `${assetId} ${symbol ?? ""}`.toUpperCase();
  for (const definition of Object.values(USE_GOD_REGISTRY)) {
    if (definition.aliases.some((alias) => candidate.includes(alias.toUpperCase()))) return definition;
  }
  return {
    assetId, displayName: symbol || assetId, assetClass: /BTC|ETH|SOL|HYPE|USDT|CRYPTO/.test(candidate) ? "CRYPTO" : "EQUITY",
    aliases: [], primary: [], secondary: [], basis: "GENERIC_TIME_STEM", label: "时干为物，日干为问",
    note: "资料未提供固定产品用神，按日干、时干、值符和值使的通用金融读盘协议。",
  };
}
function normalizeDirection(value: string | null | undefined): FocusQimenDirectionCode | null {
  const family = classifyDailyDirection(value);
  return family === "UP" ? "UP" : family === "DOWN" ? "DOWN" : family === "SIDEWAYS" ? "SIDEWAYS" : null;
}
function directionLabel(direction: FocusQimenDirectionCode): Exclude<FocusQimenDirection, "休市观察"> {
  if (direction === "UP") return "上涨";
  if (direction === "DOWN") return "下跌";
  return "震荡";
}
function relationFor(qimen: FocusQimenDirectionCode | null, liuyao: string | null | undefined, comparable: boolean): FocusQimenRelation {
  if (!comparable) return "NOT_COMPARABLE";
  const liuyaoCode = normalizeDirection(liuyao);
  if (!liuyaoCode || !qimen) return "LIUYAO_MISSING";
  return liuyaoCode === qimen ? "RESONANCE" : "DIVERGENCE";
}
function relationLabel(relation: FocusQimenRelation): string {
  if (relation === "RESONANCE") return "两法同向";
  if (relation === "DIVERGENCE") return "两法分歧";
  if (relation === "NOT_COMPARABLE") return "休市不比较";
  return "双观点数据链异常";
}
function palacePhrase(palace: PalaceState | null, stem: string, direction: FocusQimenDirectionCode): string {
  if (!palace) return direction === "UP" ? "阳机渐聚，势有启处。" : direction === "DOWN" ? "阴气内收，先防回落。" : "阴阳相持，静候破局。";
  const position = palace.palace === 5 ? `${stem}居中宫` : `${stem}落${palace.trigram}${palace.palace}宫`;
  const omens: string[] = [];
  if (palace.door && palace.deity) omens.push(`${palace.door}${palace.deity}同临`);
  else if (palace.door) omens.push(`${palace.door}临宫`);
  if (palace.star) omens.push(`${palace.star}随势`);
  if (palace.horse) omens.push("驿马催行");
  if (palace.void) omens.push("旬空减力");
  if (palace.stemTomb) omens.push("入墓收气");
  if (palace.doorPressure) omens.push("门迫添折");
  if (palace.instrumentPunishment) omens.push("击刑生扰");
  const tail = direction === "UP" ? "阳机渐聚，势取其升" : direction === "DOWN" ? "阴势收束，先防回落" : "阴阳相持，宜观其变";
  return `${position}${omens.length ? `，${omens.slice(0, 3).join("、")}` : ""}；${tail}。`;
}
function scoreChart(chart: FocusQimenChart, definition: FocusQimenUseGodDefinition): {
  direction: FocusQimenDirectionCode;
  score: number;
  confidence: number;
  evidenceRows: Array<{ role: string; palace: PalaceNumber; score: number }>;
  primaryPalace: PalaceState | null;
} {
  const roles: Array<{ role: string; palace: PalaceNumber | null; weight: number; objectRole: boolean }> = [];
  if (definition.primary.length) {
    for (const stem of definition.primary) {
      roles.push({ role: `对象用神${stem}天盘`, palace: heavenPalace(chart, stem), weight: 0.26, objectRole: true });
      roles.push({ role: `对象用神${stem}地盘`, palace: earthPalace(chart, stem), weight: 0.18, objectRole: true });
    }
    for (const stem of definition.secondary) {
      roles.push({ role: `辅助用神${stem}天盘`, palace: heavenPalace(chart, stem), weight: 0.12, objectRole: true });
      roles.push({ role: `辅助用神${stem}地盘`, palace: earthPalace(chart, stem), weight: 0.08, objectRole: true });
    }
    roles.push(
      { role: "时干天盘", palace: heavenPalace(chart, chart.pillars.hour.stem), weight: 0.08, objectRole: false },
      { role: "日干天盘", palace: heavenPalace(chart, chart.pillars.day.stem), weight: 0.06, objectRole: false },
      { role: "值符宫", palace: chart.chiefStarPalace, weight: 0.07, objectRole: false },
      { role: "值使宫", palace: chart.chiefDoorPalace, weight: 0.05, objectRole: false },
    );
  } else {
    roles.push(
      { role: "时干天盘（对象）", palace: heavenPalace(chart, chart.pillars.hour.stem), weight: 0.28, objectRole: false },
      { role: "时干地盘（根基）", palace: earthPalace(chart, chart.pillars.hour.stem), weight: 0.22, objectRole: false },
      { role: "日干天盘（所问）", palace: heavenPalace(chart, chart.pillars.day.stem), weight: 0.14, objectRole: false },
      { role: "日干地盘（事项根基）", palace: earthPalace(chart, chart.pillars.day.stem), weight: 0.11, objectRole: false },
      { role: "值符宫", palace: chart.chiefStarPalace, weight: 0.15, objectRole: false },
      { role: "值使宫", palace: chart.chiefDoorPalace, weight: 0.10, objectRole: false },
    );
  }
  let weighted = 0;
  let totalWeight = 0;
  const evidenceRows: Array<{ role: string; palace: PalaceNumber; score: number }> = [];
  for (const role of roles) {
    const palace = palaceByNumber(chart, role.palace);
    if (!palace) continue;
    const score = palaceScore(palace, chart.pillars.month.branch, !role.objectRole);
    weighted += score * role.weight;
    totalWeight += role.weight;
    evidenceRows.push({ role: role.role, palace: palace.palace, score: round(score) });
  }
  const score = totalWeight > 0 ? weighted / totalWeight : 0;
  const direction: FocusQimenDirectionCode = score >= 0.65 ? "UP" : score <= -0.65 ? "DOWN" : "SIDEWAYS";
  const basisBonus = definition.basis === "TEACHER_EXPLICIT" ? 3 : definition.basis === "TEACHER_CASE" ? 1 : 0;
  const confidence = clamp(Math.round((direction === "SIDEWAYS" ? 54 : 59) + Math.abs(score) * 7 + basisBonus), 50, 88);
  const primaryStem = definition.primary[0] ?? chart.pillars.hour.stem;
  const primaryPalace = palaceByNumber(chart, heavenPalace(chart, primaryStem) ?? earthPalace(chart, primaryStem));
  return { direction, score: round(score), confidence, evidenceRows, primaryPalace };
}
function validationFor(definition: FocusQimenUseGodDefinition, forecastDate: string, available: boolean): {
  status: FocusQimenValidationStatus;
  eligible: boolean;
} {
  if (!available) return { status: "UNAVAILABLE", eligible: false };
  if (definition.assetClass === "EQUITY" && isWeekend(forecastDate)) return { status: "NOT_ELIGIBLE", eligible: false };
  if (forecastDate <= MOOX_FOCUS_QIMEN_ACCURACY_BASELINE) return { status: "RETROACTIVE_BASELINE", eligible: false };
  return { status: "PENDING", eligible: true };
}
function chartSummary(chart: FocusQimenChart): string {
  const mode = chart.yinYang === "YIN" ? "阴遁" : "阳遁";
  const yuan = chart.yuan === "UPPER" ? "上元" : chart.yuan === "MIDDLE" ? "中元" : "下元";
  return `${chart.pillars.year.text}·${chart.pillars.month.text}·${chart.pillars.day.text}·${chart.pillars.hour.text}｜${chart.solarTerm}·${mode}${chart.ju}局·${yuan}｜值符${chart.chiefStar}${chart.chiefStarPalace}宫｜值使${chart.chiefDoor}${chart.chiefDoorPalace}宫`;
}

export function getFocusQimenUseGodRegistry(): Readonly<Record<string, FocusQimenUseGodDefinition>> {
  return USE_GOD_REGISTRY;
}

export function getFocusQimenUseGodDefinition(assetId: string, symbol?: string | null): FocusQimenUseGodDefinition {
  return resolveUseGod(assetId, symbol);
}

export type FocusQimenParallelBuildOptions = {
  castSalt?: string;
  forceComparable?: boolean;
  validationStatus?: FocusQimenValidationStatus;
  verificationEligible?: boolean;
  verificationKey?: string;
  contextLabel?: string;
};

export function buildFocusQimenParallelReadingWithOptions(input: {
  assetId: string;
  symbol?: string | null;
  forecastDate: string;
  liuyaoDirection?: string | null;
}, options: FocusQimenParallelBuildOptions = {}): FocusQimenParallelReading {
  const definition = resolveUseGod(input.assetId, input.symbol);
  if (definition.basis === "GENERIC_TIME_STEM") {
    return {
      policyVersion: MOOX_FOCUS_QIMEN_PARALLEL_VERSION,
      protocol: "PARALLEL_METHOD_NO_OVERRIDE",
      assetId: input.assetId,
      forecastDate: input.forecastDate,
      available: false,
      directionCode: null,
      direction: "资料不足",
      confidence: null,
      score: null,
      summary: "奇门：老师用神依据不足，暂不生成方向。",
      mysticNote: definition.note,
      useGod: "未建立老师用神",
      useGodBasis: definition.basis,
      useGodNote: definition.note,
      castAt: "",
      chartSummary: "未起局：老师用神依据不足",
      evidence: `协议=${MOOX_FOCUS_QIMEN_PARALLEL_VERSION}；奇门不可用=老师用神依据不足；保留六爻原始方向`,
      relation: "NOT_COMPARABLE",
      relationLabel: "奇门证据不足",
      validationStatus: "UNAVAILABLE",
      verificationEligible: false,
      verificationKey: options.verificationKey ?? `focus-qimen:${MOOX_FOCUS_QIMEN_PARALLEL_VERSION}:${input.assetId}:${input.forecastDate}`,
    };
  }
  const castAt = castAtForDate(input.forecastDate, options.castSalt);
  const chart = buildMooxQimenChartForAudit(castAt) as FocusQimenChart;
  const available = Boolean(chart.invariants.valid);
  const scored = scoreChart(chart, definition);
  const teacherSemantic = definition.basis === "TEACHER_EXPLICIT" || definition.basis === "TEACHER_CASE"
    ? evaluateExperimentalQimenAt(input.symbol ?? input.assetId, castAt)
    : null;
  const effectiveDirection: FocusQimenDirectionCode = teacherSemantic?.available
    ? teacherSemantic.direction === "上涨" ? "UP" : teacherSemantic.direction === "下跌" ? "DOWN" : "SIDEWAYS"
    : scored.direction;
  const effectiveConfidence = teacherSemantic?.available ? teacherSemantic.confidence : scored.confidence;
  const effectiveScore = teacherSemantic?.available ? teacherSemantic.score : scored.score;
  const equityWeekend = !options.forceComparable && definition.assetClass === "EQUITY" && isWeekend(input.forecastDate);
  const formalDirection: FocusQimenDirection = equityWeekend ? "休市观察" : directionLabel(effectiveDirection);
  const relation = relationFor(effectiveDirection, input.liuyaoDirection, !equityWeekend && available);
  const defaultValidation = validationFor(definition, input.forecastDate, available);
  const validation = {
    status: options.validationStatus ?? defaultValidation.status,
    eligible: options.verificationEligible ?? defaultValidation.eligible,
  };
  const primaryStem = definition.primary[0] ?? chart.pillars.hour.stem;
  const semanticMysticNote = teacherSemantic?.teacherNotes[0] ?? palacePhrase(scored.primaryPalace, primaryStem, effectiveDirection);
  const mysticNote = equityWeekend
    ? `${semanticMysticNote} 休市日仅作气机观察，不计正式走势验证。`
    : semanticMysticNote;
  const useGod = definition.primary.length
    ? `${definition.primary.join("/")}${definition.secondary.length ? `（辅${definition.secondary.join("/")}）` : ""}`
    : `时干${chart.pillars.hour.stem}（辅日干${chart.pillars.day.stem}）`;
  const contextLabel = options.contextLabel ? `；周期=${options.contextLabel}` : "";
  const evidence = available
    ? `协议=${MOOX_FOCUS_QIMEN_PARALLEL_VERSION}；角色=奇门独立观点${contextLabel}；起局=${chart.castAt}；对象=${definition.displayName}；用神=${useGod}；依据=${definition.basis}；得分=${effectiveScore}；置信=${effectiveConfidence}；老师语义=${teacherSemantic?.teacherNotes.join("/") ?? "无专属老师语义，沿用MOOX对象层"}；证据=${scored.evidenceRows.map((row) => `${row.role}@${row.palace}宫:${row.score}`).join("|")}`
    : `协议=${MOOX_FOCUS_QIMEN_PARALLEL_VERSION}；奇门不可用=盘面结构校验失败；保留六爻原始方向`;
  return {
    policyVersion: MOOX_FOCUS_QIMEN_PARALLEL_VERSION,
    protocol: "PARALLEL_METHOD_NO_OVERRIDE",
    assetId: input.assetId,
    forecastDate: input.forecastDate,
    available,
    directionCode: available ? effectiveDirection : null,
    direction: available ? formalDirection : "震荡",
    confidence: available ? effectiveConfidence : null,
    score: available ? effectiveScore : null,
    summary: equityWeekend
      ? "交易所休市：奇门保留为周末气机观察，不生成可验证的正式涨跌结论。"
      : `奇门：${formalDirection}${available ? `，置信度${effectiveConfidence}%` : ""}。`,
    mysticNote,
    useGod,
    useGodBasis: definition.basis,
    useGodNote: definition.note,
    castAt: chart.castAt,
    chartSummary: chartSummary(chart),
    evidence,
    relation,
    relationLabel: relationLabel(relation),
    validationStatus: validation.status,
    verificationEligible: validation.eligible,
    verificationKey: options.verificationKey ?? `focus-qimen:${MOOX_FOCUS_QIMEN_PARALLEL_VERSION}:${input.assetId}:${input.forecastDate}`,
  };
}

export function buildFocusQimenParallelReading(input: {
  assetId: string;
  symbol?: string | null;
  forecastDate: string;
  liuyaoDirection?: string | null;
}): FocusQimenParallelReading {
  return buildFocusQimenParallelReadingWithOptions(input);
}
