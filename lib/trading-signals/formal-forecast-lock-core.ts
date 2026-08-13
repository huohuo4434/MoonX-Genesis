export function isFormalForecastStatus(status: unknown): boolean {
  const normalized = String(status ?? "").trim().toUpperCase();
  return normalized === "LOCKED" || normalized === "PUBLISHED";
}

export function selectFormallyLockedForecast<T extends {
  status: unknown;
  publishedAt?: string | null;
  lockedAt?: string | null;
  periodStart: string;
  periodEnd: string;
  version?: number | null;
}>(input: {
  rows: readonly T[];
  today: string;
  nowMs: number;
  score: (row: T) => number;
}): T | null {
  const eligible = input.rows.filter((row) =>
    row.periodEnd >= input.today &&
    isFormallyLockedForecast({
      status: row.status,
      publishedAt: row.publishedAt ?? null,
      lockedAt: row.lockedAt ?? null,
      nowMs: input.nowMs,
    })
  );
  return eligible.sort((a, b) => {
    const aCurrent = a.periodStart <= input.today && a.periodEnd >= input.today ? 1 : 0;
    const bCurrent = b.periodStart <= input.today && b.periodEnd >= input.today ? 1 : 0;
    if (aCurrent !== bCurrent) return bCurrent - aCurrent;
    if (a.periodStart !== b.periodStart) return a.periodStart.localeCompare(b.periodStart);
    const versionDelta = Number(b.version ?? 0) - Number(a.version ?? 0);
    if (versionDelta !== 0) return versionDelta;
    const publishedDelta = Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? "");
    if (Number.isFinite(publishedDelta) && publishedDelta !== 0) return publishedDelta;
    return input.score(b) - input.score(a);
  })[0] ?? null;
}

export function isFormallyLockedForecast(input: {
  status: unknown;
  publishedAt: string | null;
  lockedAt: string | null;
  nowMs: number;
}): boolean {
  if (!isFormalForecastStatus(input.status)) return false;
  const publishedAt = input.publishedAt ? Date.parse(input.publishedAt) : Number.NaN;
  const lockedAt = input.lockedAt ? Date.parse(input.lockedAt) : Number.NaN;
  return Number.isFinite(publishedAt) && publishedAt <= input.nowMs &&
    Number.isFinite(lockedAt) && lockedAt <= input.nowMs;
}
