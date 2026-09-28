// Owner retired automated trading on 2026-09-28 after confirming all exchange
// positions and order categories are empty. Re-enabling requires a reviewed release,
// fresh exchange checks and new explicit authority, never an old env flag or UI click.
export const AUTOMATED_TRADING_RETIRED = true;

export function assertTradingWriteAllowed(method: string): void {
  if (AUTOMATED_TRADING_RETIRED && method !== "GET") {
    throw new Error("AUTOMATED_TRADING_RETIRED");
  }
}
