import "server-only";

import { listResearchRecords } from "@/lib/data/research-records";
import type { AdminCycleForecastRow } from "@/types/admin-full-cycle";
import type { ResearchRecord } from "@/types/research";

const ASSET_MAP: Record<string, string> = {
  bitcoin: "bitcoin",
  sp500: "sp500",
  "nasdaq-100": "nasdaq-100",
  "shanghai-composite": "shanghai-composite",
  "hang-seng-tech": "hang-seng",
  "hang-seng": "hang-seng",
  gold: "gold",
  "crude-oil": "wti-crude",
  "wti-crude": "wti-crude",
  ethereum: "eth",
  eth: "eth",
  cxmt: "cxmt",
  asteroid: "asteroid",
  mu: "mu",
  hype: "hype",
};

const RELIABILITY_SCORE: Record<string, number> = {
  高: 50,
  中高: 40,
  中: 30,
  中低: 20,
  低: 10,
};

const DIRECTNESS_SCORE: Record<string, number> = {
  直接: 15,
  半直接: 10,
  间接: 5,
};

function monthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function monthEnd(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function addMonths(dateKey: string, months: number): string {
  const [year, month] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1 + months, 1));
  return date.toISOString().slice(0, 7);
}

function currentMonthKey(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((item) => item.type === "year")?.value ?? String(now.getUTCFullYear());
  const month = parts.find((item) => item.type === "month")?.value ?? String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthsBetween(start: string, end: string): Array<{ year: number; month: number }> {
  const startDate = new Date(`${start.slice(0, 7)}-01T00:00:00Z`);
  const endDate = new Date(`${end.slice(0, 7)}-01T00:00:00Z`);
  const result: Array<{ year: number; month: number }> = [];
  const cursor = new Date(startDate);
  while (cursor.getTime() <= endDate.getTime() && result.length < 36) {
    result.push({ year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() + 1 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

function parseChineseMonthPeriod(period: string): Array<{ year: number; month: number }> {
  const normalized = period.replace(/\s+/g, "").replace(/附近|前后|左右/g, "");
  const crossYear = normalized.match(/(\d{4})年(\d{1,2})月至(\d{4})年(\d{1,2})月/);
  if (crossYear) {
    return monthsBetween(
      monthStart(Number(crossYear[1]), Number(crossYear[2])),
      monthEnd(Number(crossYear[3]), Number(crossYear[4]))
    );
  }
  const sameYear = normalized.match(/(\d{4})年(\d{1,2})月至(\d{1,2})月/);
  if (sameYear) {
    return monthsBetween(
      monthStart(Number(sameYear[1]), Number(sameYear[2])),
      monthEnd(Number(sameYear[1]), Number(sameYear[3]))
    );
  }
  const single = normalized.match(/(\d{4})年(\d{1,2})月/);
  if (single) return [{ year: Number(single[1]), month: Number(single[2]) }];
  return [];
}

function directionFromText(value: string): string {
  if (/主要高点|阶段高点|冲高|高位.*转折/.test(value)) return "冲高／转折观察";
  if (/上涨|走强|反弹|修复|偏强|抬升/.test(value)) return "偏强／修复";
  if (/低点|弱势|走弱|下跌|回落|下行|偏弱|低位/.test(value)) return "偏弱／低位";
  if (/震荡|反复|宽幅/.test(value)) return "震荡／不确定";
  return "不确定";
}

type Candidate = AdminCycleForecastRow & { score: number };

function activeMonthWindow(now: Date) {
  const start = currentMonthKey(now);
  return { start, end: addMonths(`${start}-01`, 12) };
}

function inWindow(year: number, month: number, window: { start: string; end: string }) {
  const key = `${year}-${String(month).padStart(2, "0")}`;
  return key >= window.start && key <= window.end;
}

function sourceName(record: ResearchRecord): string {
  return record.publicSourceLabel?.zhCN || "六爻研究";
}

function candidateFromActivation(
  record: ResearchRecord,
  item: NonNullable<ResearchRecord["monthlyActivation"]>[number],
  year: number,
  month: number
): Candidate {
  const uncertainty = ["中低", "低"].includes(item.reliability) ? " · 不确定" : "";
  return {
    id: `sixyao-${record.id}-${year}-${String(month).padStart(2, "0")}`,
    assetId: ASSET_MAP[record.assetId] ?? record.assetId,
    horizon: "MONTH",
    periodStart: monthStart(year, month),
    periodEnd: monthEnd(year, month),
    direction: directionFromText(item.expectedEffect),
    path: `${item.expectedEffect}；月令依据：${item.earthlyBranch}。${item.mechanism}`,
    probabilityLabel: `六爻月令：${item.reliability}（${item.signalDirectness}）${uncertainty}`,
    sourceLabel: `${sourceName(record)} · ${record.title.zhCN}`,
    status: "六爻月令推演",
    version: null,
    score:
      (RELIABILITY_SCORE[item.reliability] ?? 0) +
      (DIRECTNESS_SCORE[item.signalDirectness] ?? 0) +
      Math.round(record.editorialConfidence / 5),
  };
}

function rangeCandidates(record: ResearchRecord, now: Date): Candidate[] {
  const assetId = ASSET_MAP[record.assetId] ?? record.assetId;
  const window = activeMonthWindow(now);
  const rows: Candidate[] = [];

  for (const path of [...(record.annualPath ?? []), ...(record.expectedPath ?? [])]) {
    const start = path.start;
    const end = path.end;
    if (!start || !end) continue;
    for (const { year, month } of monthsBetween(start, end)) {
      if (!inWindow(year, month, window)) continue;
      rows.push({
        id: `sixyao-path-${record.id}-${year}-${String(month).padStart(2, "0")}`,
        assetId,
        horizon: "MONTH",
        periodStart: monthStart(year, month),
        periodEnd: monthEnd(year, month),
        direction: path.direction.zhCN || directionFromText(path.title.zhCN),
        path: `${path.title.zhCN}${path.description?.zhCN ? `；${path.description.zhCN}` : ""}`,
        probabilityLabel: `六爻路径 · 编辑置信${record.editorialConfidence}`,
        sourceLabel: `${sourceName(record)} · ${record.title.zhCN}`,
        status: "六爻路径推演",
        version: null,
        score: 35 + Math.round(record.editorialConfidence / 4),
      });
    }
  }

  for (const scenario of record.scenarios ?? []) {
    if (!scenario.start || !scenario.end) continue;
    for (const { year, month } of monthsBetween(scenario.start, scenario.end)) {
      if (!inWindow(year, month, window)) continue;
      rows.push({
        id: `sixyao-scenario-${record.id}-${year}-${String(month).padStart(2, "0")}`,
        assetId,
        horizon: "MONTH",
        periodStart: monthStart(year, month),
        periodEnd: monthEnd(year, month),
        direction: directionFromText(scenario.name.zhCN),
        path: `${scenario.name.zhCN}${scenario.description?.zhCN ? `；${scenario.description.zhCN}` : ""}`,
        probabilityLabel: `研究情景权重 ${scenario.probability}%`,
        sourceLabel: `${sourceName(record)} · ${record.title.zhCN}`,
        status: "六爻情景推演",
        version: null,
        score: 30 + Math.round(scenario.probability / 3),
      });
    }
  }

  return rows;
}

export async function buildSixYaoMonthlyFallbackRows(
  now = new Date()
): Promise<AdminCycleForecastRow[]> {
  const records = await listResearchRecords();
  const window = activeMonthWindow(now);
  const candidates: Candidate[] = [];

  for (const record of records) {
    if (record.framework !== "oracle-six-yao") continue;
    if (record.researchKind === "risk" || record.status === "archived") continue;
    if (!ASSET_MAP[record.assetId]) continue;

    for (const item of record.monthlyActivation ?? []) {
      for (const { year, month } of parseChineseMonthPeriod(item.period)) {
        if (!inWindow(year, month, window)) continue;
        candidates.push(candidateFromActivation(record, item, year, month));
      }
    }

    candidates.push(...rangeCandidates(record, now));
  }

  const best = new Map<string, Candidate>();
  for (const row of candidates) {
    const key = `${row.assetId}:${row.periodStart}`;
    const current = best.get(key);
    if (!current || row.score > current.score) best.set(key, row);
  }

  return [...best.values()]
    .sort((a, b) => `${a.assetId}:${a.periodStart}`.localeCompare(`${b.assetId}:${b.periodStart}`))
    .map(({ score: _score, ...row }) => row);
}
