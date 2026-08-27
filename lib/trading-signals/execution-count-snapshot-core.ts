export type ExecutionCountSnapshotCore<TStrategy extends string> = {
  executedToday: number;
  todayByStrategy: Map<TStrategy, number>;
  cadenceByStrategy: Map<TStrategy, number>;
  todayBySymbol: Map<string, number>;
  todayCountedDecisionIds: Set<string>;
};

/**
 * Adds a commissioning fill only when the prefetched database snapshot did not
 * already count the same decision. The decision id is the membership evidence;
 * created_at alone cannot distinguish a delayed SQL snapshot from a reused row.
 */
export function applyCommissioningExecutionCount<TStrategy extends string>(
  snapshot: ExecutionCountSnapshotCore<TStrategy>,
  decision: { id: string; strategyType: TStrategy; symbol: string },
): boolean {
  if (snapshot.todayCountedDecisionIds.has(decision.id)) return false;
  snapshot.todayCountedDecisionIds.add(decision.id);
  snapshot.executedToday += 1;
  snapshot.todayByStrategy.set(
    decision.strategyType,
    (snapshot.todayByStrategy.get(decision.strategyType) ?? 0) + 1,
  );
  snapshot.cadenceByStrategy.set(
    decision.strategyType,
    (snapshot.cadenceByStrategy.get(decision.strategyType) ?? 0) + 1,
  );
  const symbol = decision.symbol.toUpperCase();
  snapshot.todayBySymbol.set(symbol, (snapshot.todayBySymbol.get(symbol) ?? 0) + 1);
  return true;
}
