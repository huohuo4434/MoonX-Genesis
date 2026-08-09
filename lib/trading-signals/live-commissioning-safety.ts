export const LIVE_COMMISSIONING_RISK_PCT = 0.05;
export const LIVE_COMMISSIONING_MAX_HOLDING_MINUTES = 30;

export function getLiveCommissioningSafetyLimits() {
  return {
    riskPerTradePct: LIVE_COMMISSIONING_RISK_PCT,
    maxHoldingMinutes: LIVE_COMMISSIONING_MAX_HOLDING_MINUTES,
  } as const;
}
