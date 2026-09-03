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
  if (!weeks.length) return [];
  let currentIndex = weeks.findIndex((week) => asOfDate >= week.start && asOfDate <= week.end);
  if (currentIndex < 0) currentIndex = weeks.findIndex((week) => week.end >= asOfDate);
  if (currentIndex < 0) currentIndex = weeks.length - 1;
  return weeks.slice(currentIndex, currentIndex + 2).map((week, index) => ({
    ...week,
    badge: index === 0 ? "本周" : "下周",
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
