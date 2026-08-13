export function selectRotatingScanBatch<T>(
  values: readonly T[],
  maxItems: number,
  nowMs: number
): T[] {
  if (!values.length) return [];
  const batchSize = Math.min(Math.max(1, Math.floor(maxItems)), values.length);
  const batchCount = Math.max(1, Math.ceil(values.length / batchSize));
  const minute = Math.floor(nowMs / 60_000);
  const rotationSlot = ((minute % batchCount) + batchCount) % batchCount;
  return values.slice(rotationSlot * batchSize, rotationSlot * batchSize + batchSize);
}

export type LiveScanOpportunityHint = {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  entryZoneLow: number;
  entryZoneHigh: number;
  forecastLockedAt: string | null;
  forecastValidFrom: string | null;
  forecastValidUntil: string | null;
  lastCheckedAt: string | null;
  updatedAt: string;
};

export type LiveScanOpportunityQuote = {
  symbol: string;
  price: number;
  capturedAt: string;
};

const OPPORTUNITY_QUOTE_MAX_AGE_MS = 180_000;
const OPPORTUNITY_PLAN_MAX_AGE_MS = 30 * 60_000;
const OPPORTUNITY_MAX_ZONE_DISTANCE_PCT = 1;
const FAIRNESS_CYCLE_INTERVAL = 3;

function finiteTimestamp(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function zoneDistancePct(price: number, low: number, high: number): number {
  if (price >= low && price <= high) return 0;
  const edge = price < low ? low : high;
  return Math.abs(price - edge) / price * 100;
}

/**
 * Chooses which already-allowed symbol to inspect; it never changes a signal,
 * execution gate, or order parameter. Every third complete universe cycle is
 * reserved for the original round-robin order so proximity cannot starve the
 * rest of the allowlist.
 */
export function selectOpportunityAwareScanBatch<T extends string>(input: {
  symbols: readonly T[];
  maxItems: number;
  nowMs: number;
  hints: readonly LiveScanOpportunityHint[];
  quotes: readonly LiveScanOpportunityQuote[];
}): T[] {
  const fallback = selectRotatingScanBatch(input.symbols, input.maxItems, input.nowMs);
  if (fallback.length !== 1 || input.symbols.length < 2) return fallback;

  const minute = Math.floor(input.nowMs / 60_000);
  const cycle = Math.floor(minute / input.symbols.length);
  if (((cycle % FAIRNESS_CYCLE_INTERVAL) + FAIRNESS_CYCLE_INTERVAL) % FAIRNESS_CYCLE_INTERVAL === FAIRNESS_CYCLE_INTERVAL - 1) {
    return fallback;
  }

  const quoteBySymbol = new Map(input.quotes.map((quote) => [quote.symbol.toUpperCase(), quote] as const));
  const symbolIndex = new Map(input.symbols.map((symbol, index) => [symbol.toUpperCase(), index] as const));
  const fallbackSymbol = fallback[0];
  if (fallbackSymbol == null) return fallback;
  const baselineIndex = symbolIndex.get(fallbackSymbol.toUpperCase()) ?? 0;
  const hintsBySymbol = new Map<string, LiveScanOpportunityHint[]>();
  for (const hint of input.hints) {
    const symbol = hint.symbol.toUpperCase();
    if (!symbolIndex.has(symbol)) continue;
    const list = hintsBySymbol.get(symbol) ?? [];
    list.push(hint);
    hintsBySymbol.set(symbol, list);
  }

  const candidates: Array<{ symbol: T; distancePct: number; rotationDistance: number }> = [];
  for (const symbol of input.symbols) {
    const normalized = symbol.toUpperCase();
    const quote = quoteBySymbol.get(normalized);
    const quoteAt = finiteTimestamp(quote?.capturedAt ?? null);
    if (!quote || !Number.isFinite(quote.price) || quote.price <= 0 || quoteAt == null || quoteAt > input.nowMs || input.nowMs - quoteAt > OPPORTUNITY_QUOTE_MAX_AGE_MS) continue;
    const validHints = (hintsBySymbol.get(normalized) ?? []).filter((hint) => {
      const lockedAt = finiteTimestamp(hint.forecastLockedAt);
      const validFrom = finiteTimestamp(hint.forecastValidFrom);
      const validUntil = finiteTimestamp(hint.forecastValidUntil);
      const lastCheckedAt = finiteTimestamp(hint.lastCheckedAt);
      return hint.direction !== "NEUTRAL"
        && lockedAt != null && lockedAt <= input.nowMs
        && validFrom != null && validFrom <= input.nowMs
        && validUntil != null && validUntil >= input.nowMs
        && lastCheckedAt != null && lastCheckedAt <= input.nowMs
        && input.nowMs - lastCheckedAt <= OPPORTUNITY_PLAN_MAX_AGE_MS
        && Number.isFinite(hint.entryZoneLow) && hint.entryZoneLow > 0
        && Number.isFinite(hint.entryZoneHigh) && hint.entryZoneHigh >= hint.entryZoneLow;
    });
    if (!validHints.length || new Set(validHints.map((hint) => hint.direction)).size !== 1) continue;
    const latest = [...validHints].sort((a, b) => {
      const byUpdated = (finiteTimestamp(b.updatedAt) ?? 0) - (finiteTimestamp(a.updatedAt) ?? 0);
      return byUpdated || a.id.localeCompare(b.id);
    })[0];
    if (!latest) continue;
    const distancePct = zoneDistancePct(quote.price, latest.entryZoneLow, latest.entryZoneHigh);
    if (distancePct > OPPORTUNITY_MAX_ZONE_DISTANCE_PCT) continue;
    const index = symbolIndex.get(normalized) ?? 0;
    candidates.push({ symbol, distancePct, rotationDistance: (index - baselineIndex + input.symbols.length) % input.symbols.length });
  }
  candidates.sort((a, b) => a.distancePct - b.distancePct || a.rotationDistance - b.rotationDistance || a.symbol.localeCompare(b.symbol));
  return candidates[0] ? [candidates[0].symbol] : fallback;
}

export async function selectOpportunityBatchWithinDeadline<T extends string>(input: {
  symbols: readonly T[];
  maxItems: number;
  nowMs: number;
  quotes: readonly LiveScanOpportunityQuote[];
  deadlineMs: number;
  loadHints: (signal: AbortSignal) => Promise<readonly LiveScanOpportunityHint[]>;
}): Promise<T[]> {
  const fallback = selectRotatingScanBatch(input.symbols, input.maxItems, input.nowMs);
  try {
    const hints = await readWithinLiveScanDeadline(input.loadHints, input.deadlineMs);
    return selectOpportunityAwareScanBatch({ ...input, hints });
  } catch {
    // Opportunity hints are advisory scheduling evidence only. A timeout or read
    // failure restores the existing fair rotation and must not consume the scan.
    return fallback;
  }
}

export class LiveScanReadDeadlineError extends Error {
  constructor() {
    super("LIVE_SCAN_READ_DEADLINE_EXCEEDED");
    this.name = "LiveScanReadDeadlineError";
  }
}

/**
 * Bounds strictly read-only discovery work inside the shared live-scan wall-clock
 * budget. The current market-data clients do not propagate AbortSignal, so the
 * losing promise is not cancelled; its late rejection is observed and it must be
 * safe to finish later. Never wrap orders, DDL, or other writes with this helper.
 */
export async function readWithinLiveScanDeadline<T>(
  factory: (signal: AbortSignal) => Promise<T>,
  deadlineMs: number,
  now: () => number = Date.now
): Promise<T> {
  if (!Number.isFinite(deadlineMs)) return factory(new AbortController().signal);
  const remainingMs = Math.floor(deadlineMs - now());
  if (remainingMs <= 0) throw new LiveScanReadDeadlineError();
  const work = factory(new AbortController().signal);
  // Promise.race installs a rejection handler, and this explicit observer also
  // guarantees a late rejection from a non-cancellable read is consumed.
  void work.catch(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new LiveScanReadDeadlineError());
        }, remainingMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Production round entry: management always completes before symbol rotation. */
export async function beginLiveScanRound<M, T>(input: {
  symbols: readonly T[];
  maxItems: number;
  nowMs: number;
}, dependencies: {
  manage: () => Promise<M>;
  canSelect?: (management: M) => boolean;
  select?: (fallback: T[]) => Promise<T[]> | T[];
}): Promise<{ management: M; selected: T[] }> {
  const management = await dependencies.manage();
  const fallback = selectRotatingScanBatch(input.symbols, input.maxItems, input.nowMs);
  const selected = dependencies.select && (dependencies.canSelect?.(management) ?? true)
    ? await dependencies.select(fallback)
    : fallback;
  return { management, selected };
}

/**
 * Executes one real production scan step without converting a deadline into an
 * ERROR decision. Non-deadline failures remain delegated to the existing error
 * writer. The caller must avoid marking the profile scanned when timedOut=true.
 */
export async function runLiveScanSymbolStep(
  scan: () => Promise<void>,
  onError: (error: unknown) => Promise<void>
): Promise<{ timedOut: boolean }> {
  try {
    await scan();
  } catch (error) {
    if (error instanceof LiveScanReadDeadlineError) return { timedOut: true };
    await onError(error);
  }
  return { timedOut: false };
}
