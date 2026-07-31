import { listDatesByBranches } from "@/lib/calendar/sexagenary-calendar";
import type { WeeklyKeyDate } from "@/types/weekly-analysis";

export type BranchSignalInput = {
  startDate: string;
  endDate: string;
  branches: string[];
  expectedEffect: WeeklyKeyDate["expectedEffect"];
  source: Extract<WeeklyKeyDate["sources"][number], "LIUYAO" | "QIMEN" | "BAZI">;
  label: string;
  confidence?: number;
  note?: string;
};

/**
 * Convert a teacher's branch-day signal into exact Gregorian dates.
 * The returned member-facing data never exposes only "亥日/卯日/未日".
 */
export function expandBranchSignalToWeeklyKeyDates(input: BranchSignalInput): WeeklyKeyDate[] {
  return listDatesByBranches({
    startDate: input.startDate,
    endDate: input.endDate,
    branches: input.branches,
  }).map((item) => ({
    date: item.date,
    label: input.label,
    expectedEffect: input.expectedEffect,
    sources: [input.source],
    confidence: input.confidence,
    note: input.note ? `${input.note}（历法校验：${item.label}）` : `历法校验：${item.label}`,
  }));
}

export function mergeWeeklyKeyDates(...groups: WeeklyKeyDate[][]): WeeklyKeyDate[] {
  const map = new Map<string, WeeklyKeyDate>();
  for (const item of groups.flat()) {
    const key = `${item.date}:${item.expectedEffect}:${item.label}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      continue;
    }
    map.set(key, {
      ...existing,
      sources: [...new Set([...existing.sources, ...item.sources])],
      confidence: Math.max(existing.confidence ?? 0, item.confidence ?? 0) || undefined,
      note: [existing.note, item.note].filter(Boolean).join("；") || undefined,
    });
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}
