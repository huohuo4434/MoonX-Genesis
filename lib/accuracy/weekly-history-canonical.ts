import type { WeeklyAnalysisRecord } from "@/types/weekly-analysis";

type VerificationRow = {
  weeklyAnalysisId: string;
  assetId: string;
  weekStart: string;
  weekEnd: string;
  updatedAt?: Date | string;
};

function cycleKey(row: Pick<VerificationRow, "assetId" | "weekStart" | "weekEnd">): string {
  return `${row.assetId}|${row.weekStart}|${row.weekEnd}`;
}

function versionFromId(id: string): number {
  const match = id.match(/-V(\d+)$/i);
  return match ? Number(match[1]) : 0;
}

/**
 * Public statistics use the last pre-window locked authority, never the
 * post-outcome result. Duplicate historical versions remain stored for audit.
 */
export function selectCanonicalWeeklyVerificationRows<T extends VerificationRow>(
  rows: readonly T[],
  authorities: readonly WeeklyAnalysisRecord[],
): T[] {
  const authorityByCycle = new Map(authorities.map((row) => [cycleKey(row), row.id] as const));
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = cycleKey(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return [...groups.values()].map((group) => {
    const authorityId = authorityByCycle.get(cycleKey(group[0]!));
    const exact = authorityId ? group.find((row) => row.weeklyAnalysisId === authorityId) : undefined;
    if (exact) return exact;
    return [...group].sort((a, b) =>
      versionFromId(b.weeklyAnalysisId) - versionFromId(a.weeklyAnalysisId) ||
      String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")) ||
      b.weeklyAnalysisId.localeCompare(a.weeklyAnalysisId)
    )[0]!;
  });
}
