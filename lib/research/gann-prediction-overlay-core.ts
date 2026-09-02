import type { KeyDateRadarItem } from "@/lib/data/key-date-radar-core";
import type { ThreeHorizonDirection } from "@/types/three-horizon-strategy";

export const VERIFIED_GANN_RESEARCH_WEIGHT_PCT = 3 as const;

export type VerifiedGannSignal = {
  postId: string;
  postUrl: string;
  postedAt: string;
  symbol: string;
  direction: ThreeHorizonDirection;
  turnIntent: "TOP" | "BOTTOM" | "NEUTRAL";
  timeWindows: string[];
  supportLevels: number[];
  resistanceLevels: number[];
  targetLevels: number[];
  invalidationLevels: number[];
  summary: string;
};

type GannStatus = "ALIGNED" | "TIME_ONLY" | "CONFLICTED";

function isoDate(year: number, month: number, day: number) {
  const value = new Date(Date.UTC(year, month - 1, day));
  if (value.getUTCFullYear() !== year || value.getUTCMonth() !== month - 1 || value.getUTCDate() !== day) return null;
  return value.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const time = Date.parse(`${date}T00:00:00.000Z`);
  return Number.isFinite(time) ? new Date(time + days * 86_400_000).toISOString().slice(0, 10) : date;
}

function localPostedDate(postedAt: string) {
  const date = new Date(postedAt);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function containsDate(date: string, start: string | null, end: string | null = start) {
  return Boolean(start && end && start <= date && date <= end);
}

export function gannWindowContainsDate(window: string, focusDate: string, postedAt: string) {
  const postedDate = localPostedDate(postedAt);
  if (!postedDate) return false;
  const year = Number(postedDate.slice(0, 4));
  const normalized = window.replace(/\s+/g, "").replace(/[～~—–]/g, "-");

  const fullRange = normalized.match(/(20\d{2})[年/.\-](\d{1,2})[月/.\-](\d{1,2})(?:日|号)?(?:至|到|-)(?:(20\d{2})[年/.\-])?(\d{1,2})[月/.\-](\d{1,2})(?:日|号)?/);
  if (fullRange) return containsDate(focusDate, isoDate(Number(fullRange[1]), Number(fullRange[2]), Number(fullRange[3])), isoDate(Number(fullRange[4] ?? fullRange[1]), Number(fullRange[5]), Number(fullRange[6])));

  const shortRange = normalized.match(/(\d{1,2})[月/.\-](\d{1,2})(?:日|号)?(?:至|到|-)(?:(\d{1,2})[月/.\-])?(\d{1,2})(?:日|号)?/);
  if (shortRange) {
    const startMonth = Number(shortRange[1]);
    const endMonth = Number(shortRange[3] ?? shortRange[1]);
    if (startMonth <= 12 && endMonth <= 12) return containsDate(focusDate, isoDate(year, startMonth, Number(shortRange[2])), isoDate(year, endMonth, Number(shortRange[4])));
  }

  const monthEdge = normalized.match(/(\d{1,2})月底(?:至|到|-)?(\d{1,2})月初/);
  if (monthEdge) return containsDate(focusDate, isoDate(year, Number(monthEdge[1]), 24), isoDate(year, Number(monthEdge[2]), 7));

  const fullDate = normalized.match(/(20\d{2})[年/.\-](\d{1,2})[月/.\-](\d{1,2})(?:日|号)?/);
  if (fullDate) return focusDate === isoDate(Number(fullDate[1]), Number(fullDate[2]), Number(fullDate[3]));

  const shortDate = normalized.match(/(\d{1,2})[月/.\-](\d{1,2})(?:日|号)?/);
  if (shortDate && Number(shortDate[1]) <= 12) return focusDate === isoDate(year, Number(shortDate[1]), Number(shortDate[2]));

  if (/今天|今日/.test(normalized)) return focusDate === postedDate;
  if (/明天|明日/.test(normalized)) return focusDate === addDays(postedDate, 1);
  if (/后天/.test(normalized)) return focusDate === addDays(postedDate, 2);

  const posted = new Date(`${postedDate}T00:00:00.000Z`);
  const mondayOffset = (posted.getUTCDay() + 6) % 7;
  const thisMonday = addDays(postedDate, -mondayOffset);
  if (/^本周$/.test(normalized)) return containsDate(focusDate, thisMonday, addDays(thisMonday, 6));
  if (/^下周$/.test(normalized)) return containsDate(focusDate, addDays(thisMonday, 7), addDays(thisMonday, 13));
  if (/^本月$/.test(normalized)) return focusDate.slice(0, 7) === postedDate.slice(0, 7);
  if (/^下月$/.test(normalized)) return focusDate.slice(0, 7) === addDays(`${postedDate.slice(0, 7)}-28`, 4).slice(0, 7);
  return false;
}

function normalizeSymbol(value: string) {
  return value.toUpperCase().replace(/USDT$/, "");
}

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0))).sort((a, b) => a - b);
}

function countTerms(text: string, terms: string[]) {
  return terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
}

export function inferGannTurnIntent(text: string): VerifiedGannSignal["turnIntent"] {
  const normalized = text.toLowerCase();
  const top = countTerms(normalized, ["阶段高点", "高点", "顶部", "见顶", "冲高", "压力", "阻力", "上涨终点", "反弹结束", "回落"]);
  const bottom = countTerms(normalized, ["阶段低点", "低点", "底部", "见底", "探底", "支撑", "下跌终点", "回调结束", "止跌"]);
  if (top > bottom) return "TOP";
  if (bottom > top) return "BOTTOM";
  return "NEUTRAL";
}

function statusFor(item: KeyDateRadarItem, intents: VerifiedGannSignal["turnIntent"][]): { status: GannStatus; delta: number; note: string } {
  const directional = Array.from(new Set(intents.filter((intent) => intent !== "NEUTRAL")));
  const expected = item.action === "BOTTOM_WATCH" ? "BOTTOM" : item.action === "TOP_EXIT_WATCH" ? "TOP" : "NEUTRAL";
  if (directional.length > 1) return { status: "TIME_ONLY", delta: 0, note: "江恩时间窗重叠，但同一来源同时包含高点与低点分支，只保留时间观察。" };
  if (expected === "NEUTRAL" || directional.length === 0) return { status: "TIME_ONLY", delta: 1, note: "江恩时间窗与关键日重叠，但未形成同向高低点结论，只增加1点时间信心。" };
  if (directional[0] === expected) return { status: "ALIGNED", delta: VERIFIED_GANN_RESEARCH_WEIGHT_PCT, note: `江恩时间窗与${item.action === "BOTTOM_WATCH" ? "低点" : "高点"}观察方向一致，研究信心增加3点。` };
  return { status: "CONFLICTED", delta: -VERIFIED_GANN_RESEARCH_WEIGHT_PCT, note: "江恩高低点意图与当前关键日动作冲突，研究信心降低3点；不改写正式方向，也不机械交易。" };
}

export function applyVerifiedGannKeyDateOverlay(items: KeyDateRadarItem[], signals: readonly VerifiedGannSignal[]) {
  return items.map((item) => {
    const symbol = normalizeSymbol(item.symbol);
    const matched = signals.filter((signal) => normalizeSymbol(signal.symbol) === symbol
      && signal.timeWindows.some((window) => gannWindowContainsDate(window, item.focusDate, signal.postedAt)));
    if (!matched.length) return item;
    const result = statusFor(item, matched.map((signal) => signal.turnIntent));
    const sourceUrls = Array.from(new Set(matched.map((signal) => signal.postUrl))).slice(0, 3);
    const consensusNote = [item.consensusNote, result.note].filter(Boolean).join(" ");
    return {
      ...item,
      confidence: Math.max(0, Math.min(100, item.confidence + result.delta)),
      consensusLevel: item.consensusLevel ?? (result.status === "CONFLICTED" ? "CONFLICTED" : "PARTIAL_ALIGNMENT"),
      consensusNote,
      sourceIds: Array.from(new Set([...item.sourceIds, ...matched.map((signal) => `GANN:${signal.postId}`)])),
      gann: {
        status: result.status,
        appliedWeightPct: Math.abs(result.delta),
        note: result.note,
        matchedWindows: Array.from(new Set(matched.flatMap((signal) => signal.timeWindows.filter((window) => gannWindowContainsDate(window, item.focusDate, signal.postedAt))))),
        supportLevels: uniqueNumbers(matched.flatMap((signal) => signal.supportLevels)),
        resistanceLevels: uniqueNumbers(matched.flatMap((signal) => signal.resistanceLevels)),
        targetLevels: uniqueNumbers(matched.flatMap((signal) => signal.targetLevels)),
        invalidationLevels: uniqueNumbers(matched.flatMap((signal) => signal.invalidationLevels)),
        sourceUrls,
        newestPostedAt: matched.map((signal) => signal.postedAt).sort().at(-1)!,
      },
    };
  });
}
