/**
 * Configurable moving-line → week progress mapping.
 * Yao 1..6 map onto trading-day progress; never hard-bind to weekday names.
 */

export type MovingLinePhase =
  | "week_start_earliest"
  | "week_start_to_day2"
  | "day2_to_day3"
  | "mid_to_day4"
  | "late_week"
  | "final_or_weekend";

const DEFAULT_PHASE_BY_YAO: Record<number, MovingLinePhase> = {
  1: "week_start_earliest",
  2: "week_start_to_day2",
  3: "day2_to_day3",
  4: "mid_to_day4",
  5: "late_week",
  6: "final_or_weekend",
};

const PHASE_LABEL_ZH: Record<MovingLinePhase, string> = {
  week_start_earliest: "周初最早阶段",
  week_start_to_day2: "周初至第二交易日",
  day2_to_day3: "第二至第三交易日",
  mid_to_day4: "周中至第四交易日",
  late_week: "周后段",
  final_or_weekend: "最后阶段或周末前后",
};

/** Progress 0..1 across trading days in the week window. */
export function tradingDayProgressIndex(
  tradingDays: string[],
  forecastDate: string
): { index: number; total: number; progress: number } {
  const total = Math.max(1, tradingDays.length);
  const index = Math.max(0, tradingDays.indexOf(forecastDate));
  if (tradingDays.indexOf(forecastDate) < 0) {
    return { index: 0, total, progress: 0 };
  }
  return { index, total, progress: total <= 1 ? 0.5 : index / (total - 1) };
}

export function phaseForYao(yao: number): MovingLinePhase {
  return DEFAULT_PHASE_BY_YAO[yao] ?? "mid_to_day4";
}

export function phaseLabelZh(phase: MovingLinePhase): string {
  return PHASE_LABEL_ZH[phase];
}

/** Ideal progress band for a yao (0..1). */
export function progressBandForYao(yao: number): { lo: number; hi: number } {
  const map: Record<number, { lo: number; hi: number }> = {
    1: { lo: 0, hi: 0.2 },
    2: { lo: 0.1, hi: 0.35 },
    3: { lo: 0.25, hi: 0.55 },
    4: { lo: 0.45, hi: 0.7 },
    5: { lo: 0.65, hi: 0.9 },
    6: { lo: 0.8, hi: 1 },
  };
  return map[yao] ?? { lo: 0.4, hi: 0.6 };
}

export function movingLinesActiveNearDate(input: {
  movingLines: number[];
  tradingDays: string[];
  forecastDate: string;
}): { active: number[]; labels: string[]; hasMovingLines: boolean } {
  const hasMovingLines = input.movingLines.length > 0;
  if (!hasMovingLines) {
    return {
      active: [],
      labels: ["无动爻：不编造具体变盘日，按周卦整体方向与技术结构逐日修正"],
      hasMovingLines: false,
    };
  }
  const { progress } = tradingDayProgressIndex(input.tradingDays, input.forecastDate);
  const active = input.movingLines.filter((yao) => {
    const band = progressBandForYao(yao);
    return progress >= band.lo - 0.08 && progress <= band.hi + 0.08;
  });
  const labels = (active.length ? active : input.movingLines).map(
    (yao) => `${yao}爻偏${phaseLabelZh(phaseForYao(yao))}`
  );
  return { active, labels, hasMovingLines: true };
}

/** List ISO trading days between periodStart..periodEnd inclusive for a market. */
export function listTradingDaysInPeriod(
  periodStart: string,
  periodEnd: string,
  isTradingDay: (iso: string) => boolean
): string[] {
  const out: string[] = [];
  const start = new Date(`${periodStart}T12:00:00Z`);
  const end = new Date(`${periodEnd}T12:00:00Z`);
  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
    const iso = new Date(t).toISOString().slice(0, 10);
    if (isTradingDay(iso)) out.push(iso);
  }
  return out;
}
