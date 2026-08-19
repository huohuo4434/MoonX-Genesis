export type CryptoDirection = "LONG" | "SHORT" | "NEUTRAL";

export type CryptoCrossAssetGuard = {
  applicable: boolean;
  divergent: boolean;
  peerSymbol: "BTCUSDT" | "ETHUSDT" | null;
  riskScale: number;
  blockTrade: false;
  note: string;
};

/**
 * BTC and ETH are correlated but not interchangeable. A directional conflict
 * between them must never veto an otherwise valid trade in the other asset.
 * Divergence only reduces size until the asset's own 30m/5m structure confirms.
 */
export function evaluateCryptoCrossAssetGuard(input: {
  symbol: string;
  selfDirection: CryptoDirection;
  peerDirection: CryptoDirection;
  selfEntryConfirmed: boolean;
}): CryptoCrossAssetGuard {
  const symbol = input.symbol.toUpperCase();
  const peerSymbol = symbol === "BTCUSDT" ? "ETHUSDT" : symbol === "ETHUSDT" ? "BTCUSDT" : null;
  if (!peerSymbol) {
    return { applicable: false, divergent: false, peerSymbol: null, riskScale: 1, blockTrade: false, note: "非BTC/ETH配对资产" };
  }
  const divergent = input.selfDirection !== "NEUTRAL" && input.peerDirection !== "NEUTRAL" && input.selfDirection !== input.peerDirection;
  if (!divergent) {
    return { applicable: true, divergent: false, peerSymbol, riskScale: 1, blockTrade: false, note: "BTC/ETH方向未形成冲突" };
  }
  return {
    applicable: true,
    divergent: true,
    peerSymbol,
    riskScale: input.selfEntryConfirmed ? 0.65 : 0.5,
    blockTrade: false,
    note: `BTC/ETH方向分歧：不互相否决；${input.selfEntryConfirmed ? "本资产30m/5m已确认，允许缩仓执行" : "本资产尚未完成入场确认，继续等待"}`,
  };
}
