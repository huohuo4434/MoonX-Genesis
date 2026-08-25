export type DailyChampionScoreInput = {
  focusPriority: number;
  confidence: number;
  technicalScore: number;
  forecastScore: number;
  conditionsMet: number;
  conditionsTotal: number;
  rewardRisk: number;
  entryTriggered: boolean;
  ready: boolean;
};

const finite = (value: number) => Number.isFinite(value) ? value : 0;

/** Keeps every independent size-reduction overlay; promotion may never reset one to full risk. */
export function dailyChampionRiskScale(scales: readonly number[]): number {
  const valid = scales.filter((value) => Number.isFinite(value)).map((value) => Math.max(0.1, Math.min(1, value)));
  return valid.length ? Math.min(...valid) : 1;
}

/**
 * One transparent score shared by the live executor and the member ranking.
 * It ranks already-directed candidates; it never creates or reverses direction.
 */
export function dailyChampionScore(input: DailyChampionScoreInput): number {
  const completion = input.conditionsTotal > 0
    ? Math.min(1, Math.max(0, input.conditionsMet / input.conditionsTotal))
    : 0;
  return finite(input.focusPriority) * 1.5
    + finite(input.confidence) * 2
    + finite(input.technicalScore)
    + finite(input.forecastScore) * 0.5
    + completion * 50
    + Math.min(5, Math.max(0, finite(input.rewardRisk))) * 10
    + (input.entryTriggered ? 25 : 0)
    + (input.ready ? 15 : 0);
}

export type DailyChampionBoardInput = {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  status: string;
  rejectionCode: string;
  confidence: number;
  technicalScore: number;
  forecastScore: number;
  conditionsMet: number;
  conditionsTotal: number;
  entryTriggered: boolean;
  rewardRisk: number;
  marketSessionAllowed: boolean;
  focusPriority: number;
  currentPrice: number | null;
  entryPrice: number | null;
  stopLoss: number | null;
  target1: number | null;
  target2: number | null;
  rejectionReason: string;
  updatedAt: string;
};

export type DailyChampionBoardRow = DailyChampionBoardInput & {
  rank: number;
  tier: "CHAMPION" | "RUNNER_UP" | "WATCH";
  score: number;
  qualified: boolean;
  suggestedRiskPct: number;
};

export function rankDailyChampionBoard(
  rows: readonly DailyChampionBoardInput[],
  limit = 3,
): DailyChampionBoardRow[] {
  const latestBySymbol = new Map<string, DailyChampionBoardInput>();
  for (const row of rows) {
    if (row.direction !== "LONG" && row.direction !== "SHORT") continue;
    const symbol = row.symbol.toUpperCase();
    const current = latestBySymbol.get(symbol);
    if (!current || Date.parse(row.updatedAt) > Date.parse(current.updatedAt)) {
      latestBySymbol.set(symbol, { ...row, symbol });
    }
  }
  return [...latestBySymbol.values()]
    .map((row) => {
      const qualified = row.entryTriggered
        && row.confidence >= 38
        && row.technicalScore >= 34
        && row.rewardRisk >= 1.05
        && row.conditionsTotal > 0
        && row.conditionsMet >= Math.max(2, Math.ceil(row.conditionsTotal * 0.25))
        && row.entryPrice != null
        && row.stopLoss != null
        && row.target1 != null
        && row.target2 != null
        && row.marketSessionAllowed
        && (row.status === "READY" || (row.status === "OBSERVING" && row.rejectionCode === "CONFIDENCE_LOW"));
      return {
        row,
        qualified,
        score: dailyChampionScore({
          focusPriority: row.focusPriority,
          confidence: row.confidence,
          technicalScore: row.technicalScore,
          forecastScore: row.forecastScore,
          conditionsMet: row.conditionsMet,
          conditionsTotal: row.conditionsTotal,
          rewardRisk: row.rewardRisk,
          entryTriggered: row.entryTriggered,
          ready: row.status === "READY",
        }),
      };
    })
    .sort((a, b) => Number(b.qualified) - Number(a.qualified)
      || b.score - a.score
      || Date.parse(b.row.updatedAt) - Date.parse(a.row.updatedAt)
      || a.row.symbol.localeCompare(b.row.symbol))
    .slice(0, Math.max(1, Math.floor(limit)))
    .map(({ row, score, qualified }, index) => ({
      ...row,
      rank: index + 1,
      tier: index === 0 ? "CHAMPION" : index === 1 ? "RUNNER_UP" : "WATCH",
      score: Math.round(score * 10) / 10,
      qualified,
      suggestedRiskPct: qualified ? 0.2 : 0,
    }));
}
