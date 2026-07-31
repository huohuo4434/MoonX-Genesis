/**
 * Deterministic Gregorian ↔ sexagenary-day helper.
 * Reference verified from the user's Liu Yao chart: 2026-07-30 = 乙巳日.
 * Never ask an LLM to guess a stem/branch date.
 */
const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
const DAY_MS = 86_400_000;
const REFERENCE_UTC = Date.UTC(2026, 6, 30);
const REFERENCE_INDEX = 41; // 乙巳 in the 60-day cycle, zero-based.

export type SexagenaryDay = {
  date: string;
  index: number;
  stem: (typeof STEMS)[number];
  branch: (typeof BRANCHES)[number];
  label: string;
};

function parseDateKey(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid date key: ${date}`);
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year!, month! - 1, day!);
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function getSexagenaryDay(date: string): SexagenaryDay {
  const delta = Math.round((parseDateKey(date) - REFERENCE_UTC) / DAY_MS);
  const index = mod(REFERENCE_INDEX + delta, 60);
  const stem = STEMS[index % 10]!;
  const branch = BRANCHES[index % 12]!;
  return { date, index, stem, branch, label: `${stem}${branch}日` };
}

export function listDatesByBranches(input: {
  startDate: string;
  endDate: string;
  branches: string[];
}): SexagenaryDay[] {
  const start = parseDateKey(input.startDate);
  const end = parseDateKey(input.endDate);
  if (end < start) throw new Error("endDate must not be before startDate");
  const wanted = new Set(input.branches);
  const result: SexagenaryDay[] = [];
  for (let utc = start; utc <= end; utc += DAY_MS) {
    const date = new Date(utc).toISOString().slice(0, 10);
    const item = getSexagenaryDay(date);
    if (wanted.has(item.branch)) result.push(item);
  }
  return result;
}

export function expandBranchWindows(input: {
  startDate: string;
  endDate: string;
  branches: string[];
  effect: string;
  source: "QIMEN" | "LIUYAO" | "BAZI";
}) {
  return listDatesByBranches(input).map((item) => ({
    date: item.date,
    ganzhi: item.label,
    effect: input.effect,
    source: input.source,
  }));
}
