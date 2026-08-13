export async function loadForecastSourcesForScope<TBase, TDaily, TWeekly>(input: {
  requestedSymbols?: readonly string[];
}, dependencies: {
  loadBroadBase: () => Promise<TBase[]>;
  loadBoundedBase: (symbols: readonly string[]) => Promise<TBase[]>;
  loadDaily: (symbols?: readonly string[]) => Promise<TDaily[]>;
  loadWeekly: (symbols?: readonly string[]) => Promise<TWeekly[]>;
}): Promise<{ base: TBase[]; daily: TDaily[]; weekly: TWeekly[]; bounded: boolean }> {
  const requested = input.requestedSymbols?.length
    ? Array.from(new Set(input.requestedSymbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)))
    : undefined;
  const [base, daily, weekly] = await Promise.all([
    requested ? dependencies.loadBoundedBase(requested) : dependencies.loadBroadBase(),
    dependencies.loadDaily(requested),
    dependencies.loadWeekly(requested),
  ]);
  return { base, daily, weekly, bounded: Boolean(requested) };
}
