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
}): Promise<{ management: M; selected: T[] }> {
  const management = await dependencies.manage();
  const selected = selectRotatingScanBatch(input.symbols, input.maxItems, input.nowMs);
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
