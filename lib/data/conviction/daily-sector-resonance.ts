import { isFocusTradingDay } from "@/lib/data/conviction/focus-market-session";
import {
  SECTOR_RESONANCE_GROUP_ORDER,
  buildSectorResonanceBoard,
  type SectorResonanceCell,
  type SectorResonanceGroup,
  type SectorResonanceRow,
  type SectorResonanceWeek,
  type SectorTimingMarker,
} from "@/lib/data/conviction/sector-resonance-board";

export type DailySectorSide = "BULL" | "NEUTRAL" | "BEAR";
export type DailySectorState = DailySectorSide | "TURN" | "CLOSED" | "MISSING";

export type DailySectorDay = {
  date: string;
  label: string;
  weekday: string;
  isAsOf: boolean;
  isWeekend: boolean;
};

export type DailySectorCell = {
  date: string;
  state: DailySectorState;
  side: DailySectorSide | null;
  label: string;
  sourceLabel: string;
  summary: string;
  weeklyDirection: string;
  marker: SectorTimingMarker | null;
  counted: boolean;
};

export type DailySectorRow = Pick<SectorResonanceRow, "assetId" | "name" | "symbol" | "group"> & {
  cells: DailySectorCell[];
};

export type DailySectorSummary = {
  group: SectorResonanceGroup;
  date: string;
  status: "HIGH" | "MEDIUM" | "DIVERGENT" | "INSUFFICIENT" | "CLOSED";
  label: string;
  bull: number;
  neutral: number;
  bear: number;
  covered: number;
};

export type DailySectorWeek = SectorResonanceWeek & {
  days: DailySectorDay[];
};

function utcDay(value: string): number {
  return Date.parse(`${value}T12:00:00Z`) / 86_400_000;
}

function datesInWindow(start: string, end: string): string[] {
  const first = utcDay(start);
  const last = utcDay(end);
  return Array.from({ length: Math.round(last - first) + 1 }, (_, index) =>
    new Date((first + index) * 86_400_000).toISOString().slice(0, 10)
  );
}

function dayMeta(date: string, asOf: string): DailySectorDay {
  const parsed = new Date(`${date}T12:00:00Z`);
  const weekdayIndex = parsed.getUTCDay();
  return {
    date,
    label: `${parsed.getUTCMonth() + 1}/${parsed.getUTCDate()}`,
    weekday: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][weekdayIndex]!,
    isAsOf: date === asOf,
    isWeekend: weekdayIndex === 0 || weekdayIndex === 6,
  };
}

function plainDirection(direction: string): { side: DailySectorSide; label: string; state: DailySectorState } {
  if (direction === "上涨") return { side: "BULL", label: "看涨", state: "BULL" };
  if (direction === "震荡上涨") return { side: "BULL", label: "震荡偏强", state: "BULL" };
  if (direction === "下跌") return { side: "BEAR", label: "看跌", state: "BEAR" };
  if (direction === "震荡下跌") return { side: "BEAR", label: "震荡偏弱", state: "BEAR" };
  return { side: "NEUTRAL", label: "震荡", state: "NEUTRAL" };
}

function turningMarker(cell: SectorResonanceCell): SectorTimingMarker | null {
  return cell.timingMarkers.find((item) => item.strength === "EXACT" || item.strength === "DERIVED") ?? null;
}

function markerSource(marker: SectorTimingMarker): string {
  if (marker.strength === "EXACT") return `${marker.sourceLabel}关键日`;
  if (marker.strength === "DERIVED") return "周内转折窗";
  return "日干支观察";
}

/**
 * A daily cell is an explicit projection of the locked weekly path. It is not a
 * daily hexagram: monthly context never becomes a daily direction, closed
 * sessions are excluded, and soft Ganzhi markers cannot reverse the path.
 */
export function buildDailySectorCell(input: {
  assetId: string;
  date: string;
  weeklyCell: SectorResonanceCell;
}): DailySectorCell {
  const { assetId, date, weeklyCell } = input;
  if (!isFocusTradingDay(assetId, date)) {
    return {
      date,
      state: "CLOSED",
      side: null,
      label: "休市",
      sourceLabel: "交易日历",
      summary: "该市场休市，不生成正式日方向，也不计入当日板块共振。",
      weeklyDirection: weeklyCell.direction,
      marker: null,
      counted: false,
    };
  }

  if (weeklyCell.sourceKind === "MONTHLY_CONTEXT") {
    return {
      date,
      state: "NEUTRAL",
      side: null,
      label: `月卦${weeklyCell.direction}`,
      sourceLabel: weeklyCell.sourceLabel,
      summary: `${weeklyCell.summary} 仅作月卦路径观察，不计入正式周卦共振。`,
      weeklyDirection: weeklyCell.direction,
      marker: null,
      counted: false,
    };
  }

  if (weeklyCell.sourceKind === "MISSING") {
    return {
      date,
      state: "MISSING",
      side: null,
      label: "待补",
      sourceLabel: "待补完整周卦",
      summary: "没有可追溯的完整周卦，不从年卦或月卦硬拆日方向。",
      weeklyDirection: weeklyCell.direction,
      marker: null,
      counted: false,
    };
  }

  const marker = weeklyCell.timingMarkers.find((item) => item.date === date) ?? null;
  const turn = turningMarker(weeklyCell);
  let resolved = plainDirection(weeklyCell.direction);

  if (weeklyCell.direction === "先涨后跌" && turn) {
    resolved = date < turn.date
      ? { side: "BULL", label: "转折前偏强", state: "BULL" }
      : date === turn.date
        ? { side: "NEUTRAL", label: "见高转弱", state: "TURN" }
        : { side: "BEAR", label: "转折后偏弱", state: "BEAR" };
  } else if (weeklyCell.direction === "先跌后涨" && turn) {
    resolved = date < turn.date
      ? { side: "BEAR", label: "转折前偏弱", state: "BEAR" }
      : date === turn.date
        ? { side: "NEUTRAL", label: "探底转强", state: "TURN" }
        : { side: "BULL", label: "转折后偏强", state: "BULL" };
  } else if (marker && marker.strength !== "SOFT") {
    resolved = { ...resolved, label: "关键日观察", state: "TURN" };
  }

  const sourceLabel = marker ? markerSource(marker) : "周卦路径派生";
  return {
    date,
    state: resolved.state,
    side: resolved.side,
    label: resolved.label,
    sourceLabel,
    summary: marker
      ? `${weeklyCell.direction}周路径；${marker.label}（${marker.sourceLabel}）。`
      : `${weeklyCell.direction}周路径在该交易日的分段表达。`,
    weeklyDirection: weeklyCell.direction,
    marker,
    counted: true,
  };
}

function summaryFor(group: SectorResonanceGroup, date: string, cells: DailySectorCell[]): DailySectorSummary {
  const counted = cells.filter((cell) => cell.counted && cell.side);
  const bull = counted.filter((cell) => cell.side === "BULL").length;
  const neutral = counted.filter((cell) => cell.side === "NEUTRAL").length;
  const bear = counted.filter((cell) => cell.side === "BEAR").length;
  const covered = counted.length;
  if (!covered && cells.every((cell) => cell.state === "CLOSED")) {
    return { group, date, status: "CLOSED", label: "休市", bull, neutral, bear, covered };
  }
  const dominant = Math.max(bull, neutral, bear);
  const share = covered ? dominant / covered : 0;
  const status: DailySectorSummary["status"] = covered < 2
    ? "INSUFFICIENT"
    : share >= 0.75 && covered >= 3
      ? "HIGH"
      : share >= 0.6
        ? "MEDIUM"
        : "DIVERGENT";
  const sideLabel = dominant === bull ? "偏多" : dominant === bear ? "偏空" : "震荡";
  const label = status === "HIGH"
    ? `强共振·${sideLabel}`
    : status === "MEDIUM"
      ? `中等共振·${sideLabel}`
      : status === "DIVERGENT"
        ? "明显分化"
        : "有效样本不足";
  return { group, date, status, label, bull, neutral, bear, covered };
}

export function buildDailySectorResonanceBoard(
  weeklyBoard: ReturnType<typeof buildSectorResonanceBoard> = buildSectorResonanceBoard()
): {
  asOf: string;
  weeks: DailySectorWeek[];
  rows: DailySectorRow[];
  summaries: DailySectorSummary[];
} {
  const weeks = weeklyBoard.weeks.map((week) => ({
    ...week,
    days: datesInWindow(week.start, week.end).map((date) => dayMeta(date, weeklyBoard.asOf)),
  }));
  const allDates = weeks.flatMap((week) => week.days.map((day) => day.date));
  const rows = weeklyBoard.rows.map((row) => ({
    assetId: row.assetId,
    name: row.name,
    symbol: row.symbol,
    group: row.group,
    cells: allDates.map((date) => {
      const weekIndex = weeklyBoard.weeks.findIndex((week) => date >= week.start && date <= week.end);
      return buildDailySectorCell({ assetId: row.assetId, date, weeklyCell: row.cells[weekIndex]! });
    }),
  }));
  const summaries = SECTOR_RESONANCE_GROUP_ORDER.flatMap((group) =>
    allDates.map((date) => summaryFor(
      group,
      date,
      rows.filter((row) => row.group === group).map((row) => row.cells.find((cell) => cell.date === date)!)
    ))
  );
  return { asOf: weeklyBoard.asOf, weeks, rows, summaries };
}
