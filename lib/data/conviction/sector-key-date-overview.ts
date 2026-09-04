import type { KeyDateAction, KeyDateEvidence, KeyDateLevel, KeyDateRadarItem } from "@/lib/data/key-date-radar-core";
import type {
  SectorResonanceRow,
  SectorResonanceWeek,
} from "@/lib/data/conviction/sector-resonance-board";

export type SectorKeyDateBrief = {
  id: string;
  assetId: string;
  assetName: string;
  symbol: string;
  group: SectorResonanceRow["group"];
  focusDate: string;
  action: KeyDateAction;
  title: string;
  levels: KeyDateLevel[];
  evidence: KeyDateEvidence[];
};

export type SectorKeyDateWindow = {
  week: SectorResonanceWeek;
  items: SectorKeyDateBrief[];
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function selectCurrentAndNextSectorWeeks(
  weeks: readonly SectorResonanceWeek[],
  asOfDate: string,
): SectorResonanceWeek[] {
  return labelSectorWeeks(weeks, asOfDate).filter((week) => week.badge !== null);
}

// Calendar labels describe today, never the selected tab or the research cutoff.
export function labelSectorWeeks(weeks: readonly SectorResonanceWeek[], today: string): SectorResonanceWeek[] {
  const date = new Date(`${today}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return weeks.map((week) => ({ ...week, badge: null }));
  date.setUTCDate(date.getUTCDate() + 7);
  const nextWeekDate = date.toISOString().slice(0, 10);
  return weeks.map((week) => ({ ...week, badge:
    today >= week.start && today <= week.end ? "本周"
      : nextWeekDate >= week.start && nextWeekDate <= week.end ? "下周" : null,
  }));
}

export function buildSectorKeyDateWindows(input: {
  weeks: readonly SectorResonanceWeek[];
  rows: readonly SectorResonanceRow[];
  keyDates: readonly KeyDateRadarItem[];
  asOfDate: string;
}): SectorKeyDateWindow[] {
  const assetRows = new Map(input.rows.map((row) => [row.assetId, row]));
  return selectCurrentAndNextSectorWeeks(input.weeks, input.asOfDate).map((week) => {
    const grouped = new Map<string, SectorKeyDateBrief>();
    for (const item of input.keyDates) {
      const asset = assetRows.get(item.assetId);
      if (!asset || item.focusDate < input.asOfDate || item.focusDate < week.start || item.focusDate > week.end) continue;
      const key = `${item.assetId}:${item.focusDate}:${item.action}`;
      const current = grouped.get(key);
      if (current) {
        current.levels = unique([...current.levels, item.level]);
        current.evidence = unique([...current.evidence, item.evidence]);
        if (!current.title.includes(item.title)) current.title = `${current.title}；${item.title}`;
        continue;
      }
      grouped.set(key, {
        id: key,
        assetId: item.assetId,
        assetName: item.assetName,
        symbol: item.symbol,
        group: asset.group,
        focusDate: item.focusDate,
        action: item.action,
        title: item.title,
        levels: [item.level],
        evidence: [item.evidence],
      });
    }
    return {
      week,
      items: [...grouped.values()].sort((left, right) =>
        left.focusDate.localeCompare(right.focusDate)
        || left.group.localeCompare(right.group, "zh-CN")
        || left.assetName.localeCompare(right.assetName, "zh-CN")
      ),
    };
  });
}
