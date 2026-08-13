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
