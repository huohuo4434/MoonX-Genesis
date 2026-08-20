"use client";
// MOOX_V720107_ASSET_MATRIX_GUARD: never replace server-structured asset opinion matrix with legacy DOM reconstruction.

import { useEffect } from "react";
import {
  anonymizeMultiViewResearcher,
  buildMultiViewBrief,
  classifyMultiViewDirection,
  classifyMultiViewHorizon,
  classifyMultiViewTheory,
  extractMultiViewAssets,
  extractMultiViewLevels,
  guessMultiViewIdentitySeed,
  stripMultiViewIdentity,
  summarizeMultiView,
  type MultiViewBrief,
  type MultiViewDirection,
  type MultiViewHorizon,
  type MultiViewTheory,
} from "@/lib/research/member-multi-view-core";

// MOOX_SITE_CLARITY_V72093

type CoreSymbol =
  | "BTC"
  | "ETH"
  | "SPX"
  | "NDX"
  | "WTI"
  | "GOLD"
  | "SILVER"
  | "SHCOMP"
  | "HSTECH";

type LevelZone = { low: number; high: number };
type ActionableSnapshot = {
  symbol: CoreSymbol;
  support: LevelZone;
  resistance: LevelZone;
};

type ActionableResponse = {
  ok?: boolean;
  snapshot?: ActionableSnapshot;
};

const SYMBOL_MATCHERS: Array<{ symbol: CoreSymbol; patterns: readonly string[] }> = [
  { symbol: "BTC", patterns: ["比特币", " BTC"] },
  { symbol: "ETH", patterns: ["以太坊", " ETH"] },
  { symbol: "SPX", patterns: ["标普500", " SPX"] },
  { symbol: "NDX", patterns: ["纳斯达克100", " NDX"] },
  { symbol: "WTI", patterns: ["WTI原油", " WTI"] },
  { symbol: "GOLD", patterns: ["黄金", " GOLD"] },
  { symbol: "SILVER", patterns: ["白银", " SILVER"] },
  { symbol: "SHCOMP", patterns: ["上证A股", "上证指数", " SHCOMP"] },
  { symbol: "HSTECH", patterns: ["恒生科技", " HSTECH"] },
];

const DISPLAY_RULES: Record<CoreSymbol, { decimals: number; comma: boolean }> = {
  BTC: { decimals: 0, comma: true },
  ETH: { decimals: 1, comma: true },
  SPX: { decimals: 2, comma: true },
  NDX: { decimals: 2, comma: true },
  WTI: { decimals: 2, comma: false },
  GOLD: { decimals: 1, comma: true },
  SILVER: { decimals: 2, comma: false },
  SHCOMP: { decimals: 1, comma: true },
  HSTECH: { decimals: 1, comma: true },
};

const levelCache = new Map<CoreSymbol, ActionableSnapshot>();
const pending = new Map<CoreSymbol, Promise<ActionableSnapshot | null>>();

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function elementText(element: Element): string {
  return normalizeText(element.textContent);
}

function hideElement(element: HTMLElement): void {
  if (element.dataset.mooxV72093Hidden === "1") return;
  element.dataset.mooxV72093Hidden = "1";
  element.dataset.mooxV72093Display = element.style.display;
  element.style.display = "none";
}

function findExactText(root: ParentNode, expected: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("div,section,p,span,dt,dd,strong,h2,h3,h4"))
    .filter((element) => normalizeText(element.textContent) === expected);
}

function findCompactAncestor(
  start: HTMLElement,
  required: readonly string[],
  options: { maxDepth: number; maxTextLength: number; forbidden?: readonly string[] },
): HTMLElement | null {
  let current: HTMLElement | null = start;
  for (let depth = 0; current && depth <= options.maxDepth; depth += 1) {
    const text = elementText(current);
    const includesRequired = required.every((token) => text.includes(token));
    const includesForbidden = (options.forbidden ?? []).some((token) => text.includes(token));
    if (includesRequired && !includesForbidden && text.length <= options.maxTextLength) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function simplifyWeeklyPage(): void {
  const root = document.querySelector("main") ?? document.body;

  // Hide the lower repeated direction/scenario grid. The top coloured result card remains.
  for (const label of findExactText(root, "MOOX唯一方向")) {
    const block = findCompactAncestor(
      label,
      ["MOOX唯一方向", "上涨情景权重", "震荡情景权重", "下跌情景权重"],
      { maxDepth: 6, maxTextLength: 900, forbidden: ["原始版本研究说明"] },
    );
    if (block) {
      hideElement(block);
      continue;
    }
    const fallback = findCompactAncestor(label, ["MOOX唯一方向"], {
      maxDepth: 2,
      maxTextLength: 180,
    });
    if (fallback) hideElement(fallback);
  }

  for (const weightLabel of ["上涨情景权重", "震荡情景权重", "下跌情景权重"]) {
    for (const label of findExactText(root, weightLabel)) {
      const block = findCompactAncestor(label, [weightLabel], {
        maxDepth: 2,
        maxTextLength: 160,
      });
      if (block) hideElement(block);
    }
  }

  // The top result card already carries the weekly rhythm. Remove the second prose copy.
  for (const label of findExactText(root, "本周路径")) {
    const block = findCompactAncestor(label, ["本周路径"], {
      maxDepth: 3,
      maxTextLength: 650,
      forbidden: ["主要风险", "主要催化", "关键支撑", "关键压力"],
    });
    if (block) hideElement(block);
  }

  // One method note per page is enough; per-asset doctrine boxes are repetitive.
  for (const label of findExactText(root, "技术点位 · 只负责位置与风控")) {
    const block = findCompactAncestor(label, ["技术点位", "玄学负责方向"], {
      maxDepth: 5,
      maxTextLength: 1200,
    });
    if (block) hideElement(block);
  }
}

function parseRange(text: string): [number, number] | null {
  const values = Array.from(text.matchAll(/\d[\d,]*(?:\.\d+)?/g))
    .map((match) => Number(match[0]!.replace(/,/g, "")))
    .filter(Number.isFinite);
  if (values.length < 2) return null;
  const first = values[0]!;
  const second = values[1]!;
  return [Math.min(first, second), Math.max(first, second)];
}

function isOvertightPair(supportText: string, resistanceText: string): boolean {
  const support = parseRange(supportText);
  const resistance = parseRange(resistanceText);
  if (!support || !resistance) return true;
  const supportWidth = support[1] - support[0];
  const resistanceWidth = resistance[1] - resistance[0];
  const gap = resistance[0] - support[1];
  if (gap <= 0) return true;
  const reference = Math.max(1e-6, (support[1] + resistance[0]) / 2);
  const threshold = Math.max(reference * 0.0035, Math.max(supportWidth, resistanceWidth) * 1.2);
  return gap < threshold;
}

function formatNumber(value: number, symbol: CoreSymbol): string {
  const rule = DISPLAY_RULES[symbol];
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: rule.decimals,
    maximumFractionDigits: rule.decimals,
    useGrouping: rule.comma,
  }).format(value);
}

function formatZone(zone: LevelZone, symbol: CoreSymbol): string {
  return `${formatNumber(Math.min(zone.low, zone.high), symbol)}—${formatNumber(
    Math.max(zone.low, zone.high),
    symbol,
  )}`;
}

async function loadActionable(symbol: CoreSymbol): Promise<ActionableSnapshot | null> {
  const cached = levelCache.get(symbol);
  if (cached) return cached;
  const inFlight = pending.get(symbol);
  if (inFlight) return inFlight;

  const promise = fetch(`/api/public/actionable-levels?symbol=${encodeURIComponent(symbol)}`, {
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const body = (await response.json()) as ActionableResponse;
      if (!body.ok || !body.snapshot) return null;
      levelCache.set(symbol, body.snapshot);
      return body.snapshot;
    })
    .catch(() => null)
    .finally(() => pending.delete(symbol));

  pending.set(symbol, promise);
  return promise;
}

function findDailyLevelTable(): HTMLTableElement | null {
  const tables = Array.from(document.querySelectorAll<HTMLTableElement>("table"));
  return (
    tables.find((table) => {
      const text = elementText(table);
      const hasSupport = text.includes("关键支撑") || text.includes("支撑") || /support/i.test(text);
      const hasResistance = text.includes("关键压力") || text.includes("压力") || /resistance/i.test(text);
      return hasSupport && hasResistance && (text.includes("比特币") || text.includes("BTC"));
    }) ?? null
  );
}

function matchSymbol(rowText: string): CoreSymbol | null {
  for (const entry of SYMBOL_MATCHERS) {
    if (entry.patterns.some((pattern) => rowText.includes(pattern))) return entry.symbol;
  }
  return null;
}

function headerIndexes(table: HTMLTableElement): { support: number; resistance: number } {
  const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"));
  const support = headers.findIndex((cell) => /关键支撑|支撑|support/i.test(elementText(cell)));
  const resistance = headers.findIndex((cell) => /关键压力|压力|resistance/i.test(elementText(cell)));
  return {
    support: support >= 0 ? support : 3,
    resistance: resistance >= 0 ? resistance : 4,
  };
}

async function repairDailyLevels(): Promise<void> {
  const table = findDailyLevelTable();
  if (!table) return;
  const indexes = headerIndexes(table);
  const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>("tbody tr"));

  await Promise.all(
    rows.map(async (row) => {
      const symbol = matchSymbol(elementText(row));
      if (!symbol) return;
      const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>("td"));
      const supportCell = cells[indexes.support];
      const resistanceCell = cells[indexes.resistance];
      if (!supportCell || !resistanceCell) return;
      if (supportCell.dataset.mooxV72093Level === "1") return;
      if (!isOvertightPair(elementText(supportCell), elementText(resistanceCell))) return;

      const snapshot = await loadActionable(symbol);
      if (!snapshot) return;
      supportCell.textContent = formatZone(snapshot.support, symbol);
      resistanceCell.textContent = formatZone(snapshot.resistance, symbol);
      supportCell.dataset.mooxV72093Level = "1";
      resistanceCell.dataset.mooxV72093Level = "1";
      supportCell.title = "1H有效结构支撑";
      resistanceCell.title = "1H有效结构压力";
    }),
  );
}


const MULTI_VIEW_PANEL_ID = "moox-member-multi-view-v72093";
const MULTI_VIEW_ORIGINAL_ATTR = "data-moox-multi-view-original";

type MultiViewCandidate = {
  element: HTMLElement;
  rawText: string;
  hrefs: string[];
  identitySeed: string | null;
  brief: MultiViewBrief;
};

type MultiViewResearcherGroup = {
  code: string;
  direction: MultiViewDirection;
  horizon: MultiViewHorizon;
  theories: Array<{ theory: MultiViewTheory; score: number; explanation: string }>;
  assets: string[];
  summaries: string[];
  levels: Array<{ label: "支撑" | "压力" | "目标" | "失效"; value: string }>;
};

function rawInnerTextOf(element: HTMLElement): string {
  return (element.innerText || element.textContent || "").replace(/\r/g, "").trim();
}

function collectHrefValues(element: HTMLElement): string[] {
  return Array.from(element.querySelectorAll<HTMLAnchorElement>("a[href]"))
    .map((anchorElement) => anchorElement.getAttribute("href") ?? "")
    .filter(Boolean)
    .slice(0, 12);
}

function hasAnalystSignal(text: string): boolean {
  return /看涨|看跌|偏多|偏空|多头|空头|上涨|下跌|反弹|回撤|震荡|支撑|压力|阻力|目标|失效|突破|跌破|财报|估值|周期|中枢|江恩|波浪|六爻|奇门|八字|宏观|利率|流动性/i.test(text);
}

function candidateScore(element: HTMLElement): number {
  const rawText = rawInnerTextOf(element);
  if (rawText.length < 70 || rawText.length > 3200) return -1;
  if (element.id === MULTI_VIEW_PANEL_ID || element.closest(`#${MULTI_VIEW_PANEL_ID}`)) return -1;
  const hrefs = collectHrefValues(element);
  const identity = guessMultiViewIdentitySeed(rawText, hrefs);
  const assets = extractMultiViewAssets(rawText);
  const theories = classifyMultiViewTheory(rawText);
  const levels = extractMultiViewLevels(rawText);
  const direction = classifyMultiViewDirection(rawText);
  let score = 0;
  if (identity) score += 5;
  if (assets.length) score += 2;
  if (direction !== "NEUTRAL") score += 2;
  if (theories[0]?.theory !== "综合技术") score += 1;
  if (levels.length) score += 1;
  if (hasAnalystSignal(rawText)) score += 1;
  return score;
}

function collectMultiViewCandidates(root: HTMLElement): MultiViewCandidate[] {
  const pool = Array.from(root.querySelectorAll<HTMLElement>("article,li,section,div"))
    .filter((element) => !element.hasAttribute(MULTI_VIEW_ORIGINAL_ATTR))
    .map((element) => ({ element, score: candidateScore(element), length: rawInnerTextOf(element).length }))
    .filter((item) => item.score >= 5)
    .sort((a, b) => a.length - b.length || b.score - a.score);

  const selected: HTMLElement[] = [];
  for (const item of pool) {
    if (selected.some((existing) => item.element.contains(existing))) continue;
    const rawText = rawInnerTextOf(item.element);
    if (selected.some((existing) => rawInnerTextOf(existing) === rawText)) continue;
    selected.push(item.element);
    if (selected.length >= 80) break;
  }

  return selected.map((element, index) => {
    const rawText = rawInnerTextOf(element);
    const hrefs = collectHrefValues(element);
    const identitySeed = guessMultiViewIdentitySeed(rawText, hrefs);
    return {
      element,
      rawText,
      hrefs,
      identitySeed,
      brief: buildMultiViewBrief(rawText, hrefs, index),
    };
  });
}

function directionLabel(direction: MultiViewDirection, english: boolean): string {
  if (english) return direction === "BULLISH" ? "Bullish" : direction === "BEARISH" ? "Bearish" : "Neutral / Wait";
  return direction === "BULLISH" ? "偏多" : direction === "BEARISH" ? "偏空" : "震荡 / 等待";
}

function horizonLabel(horizon: MultiViewHorizon, english: boolean): string {
  if (english) {
    return horizon === "SHORT" ? "Short term" : horizon === "MEDIUM" ? "Medium term" : horizon === "LONG" ? "Long term" : "Timeframe not stated";
  }
  return horizon === "SHORT" ? "短线" : horizon === "MEDIUM" ? "中期" : horizon === "LONG" ? "长期" : "周期未明确";
}

function mergeMultiViewGroups(candidates: MultiViewCandidate[]): MultiViewResearcherGroup[] {
  const groups = new Map<string, MultiViewResearcherGroup>();
  candidates.forEach((candidate, index) => {
    const code = anonymizeMultiViewResearcher(candidate.identitySeed, index);
    const existing = groups.get(code);
    if (!existing) {
      groups.set(code, {
        code,
        direction: candidate.brief.direction,
        horizon: candidate.brief.horizon,
        theories: [...candidate.brief.theories],
        assets: [...candidate.brief.assets],
        summaries: [candidate.brief.summary],
        levels: [...candidate.brief.levels],
      });
      return;
    }
    if (existing.direction === "NEUTRAL" && candidate.brief.direction !== "NEUTRAL") existing.direction = candidate.brief.direction;
    if (existing.horizon === "UNSPECIFIED" && candidate.brief.horizon !== "UNSPECIFIED") existing.horizon = candidate.brief.horizon;
    for (const theory of candidate.brief.theories) {
      const matched = existing.theories.find((item) => item.theory === theory.theory);
      if (matched) matched.score += theory.score;
      else existing.theories.push({ ...theory });
    }
    existing.theories.sort((a, b) => b.score - a.score || a.theory.localeCompare(b.theory, "zh-CN"));
    existing.theories = existing.theories.slice(0, 3);
    for (const asset of candidate.brief.assets) if (!existing.assets.includes(asset)) existing.assets.push(asset);
    if (!existing.summaries.includes(candidate.brief.summary) && existing.summaries.length < 2) existing.summaries.push(candidate.brief.summary);
    for (const level of candidate.brief.levels) {
      if (!existing.levels.some((item) => item.label === level.label && item.value === level.value)) existing.levels.push(level);
    }
    existing.assets = existing.assets.slice(0, 6);
    existing.levels = existing.levels.slice(0, 4);
  });
  return [...groups.values()].sort((a, b) => {
    const aSpecific = a.theories[0]?.theory === "综合技术" ? 0 : 1;
    const bSpecific = b.theories[0]?.theory === "综合技术" ? 0 : 1;
    return bSpecific - aSpecific || b.assets.length - a.assets.length || a.code.localeCompare(b.code);
  });
}

function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  style?: Partial<CSSStyleDeclaration>,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (text != null) element.textContent = text;
  if (style) Object.assign(element.style, style);
  return element;
}

function addPill(parent: HTMLElement, text: string, active = false): HTMLButtonElement {
  const button = createEl("button", text, {
    border: active ? "1px solid rgba(139,92,246,.8)" : "1px solid rgba(148,163,184,.25)",
    borderRadius: "999px",
    padding: "7px 11px",
    background: active ? "rgba(124,58,237,.22)" : "rgba(15,23,42,.35)",
    color: "inherit",
    cursor: "pointer",
    fontSize: "13px",
  });
  parent.appendChild(button);
  return button;
}

function cardTheoryNames(group: MultiViewResearcherGroup): string[] {
  return group.theories.map((item) => item.theory);
}

function buildConsensusText(groups: MultiViewResearcherGroup[], english: boolean): { consensus: string; divergence: string } {
  const counts = groups.reduce(
    (acc, group) => {
      acc[group.direction] += 1;
      return acc;
    },
    { BULLISH: 0, BEARISH: 0, NEUTRAL: 0 } as Record<MultiViewDirection, number>,
  );
  const ranked = (Object.entries(counts) as Array<[MultiViewDirection, number]>).sort((a, b) => b[1] - a[1]);
  const leader = ranked[0];
  const consensus = leader && leader[1] > 0
    ? english
      ? `Largest camp: ${directionLabel(leader[0], true)} (${leader[1]}/${groups.length}).`
      : `当前最大阵营：${directionLabel(leader[0], false)}（${leader[1]}/${groups.length}）。`
    : english
      ? "No clear consensus yet."
      : "暂未形成清晰共识。";
  const divergence = counts.BULLISH > 0 && counts.BEARISH > 0
    ? english
      ? `Material disagreement remains: ${counts.BULLISH} bullish vs ${counts.BEARISH} bearish researchers.`
      : `多空仍有明显分歧：${counts.BULLISH} 位偏多、${counts.BEARISH} 位偏空。`
    : english
      ? "No direct bull-vs-bear split in the current sample."
      : "当前样本没有形成直接的多空对立。";
  return { consensus, divergence };
}

function buildMultiViewPanel(groups: MultiViewResearcherGroup[], english: boolean): HTMLElement {
  const panel = createEl("section");
  panel.id = MULTI_VIEW_PANEL_ID;
  panel.dataset.mooxMultiView = "72093";
  Object.assign(panel.style, {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "24px 0 48px",
    color: "inherit",
  });

  const header = createEl("div", undefined, {
    border: "1px solid rgba(148,163,184,.20)",
    borderRadius: "22px",
    padding: "22px",
    background: "rgba(15,23,42,.28)",
    marginBottom: "18px",
  });
  header.appendChild(createEl("div", english ? "MEMBER MULTI-VIEW" : "MEMBER MULTI-VIEW", {
    letterSpacing: ".22em",
    fontSize: "12px",
    opacity: ".72",
    marginBottom: "8px",
  }));
  header.appendChild(createEl("h1", english ? "Multi-View · Today" : "多方观点｜今日", {
    margin: "0 0 8px",
    fontSize: "30px",
    lineHeight: "1.2",
  }));
  header.appendChild(createEl("p", english
    ? "Names, usernames and source links are hidden. Only the important view, horizon, levels and analytical method are retained."
    : "博主名称、用户名和原帖链接全部隐藏；只保留重要观点、时间周期、关键点位与分析理论。", {
    margin: "0",
    opacity: ".78",
    lineHeight: "1.75",
  }));
  header.appendChild(createEl("p", english
    ? "External viewpoints are supplementary intelligence only. They cannot override MOOX Qimen direction and do not trigger live trading."
    : "外部观点只作为辅助情报：不能覆盖 MOOX 奇门正式方向，也不能单独触发实盘交易。", {
    margin: "10px 0 0",
    opacity: ".62",
    fontSize: "13px",
    lineHeight: "1.65",
  }));
  panel.appendChild(header);

  const consensus = buildConsensusText(groups, english);
  const summaryGrid = createEl("div", undefined, {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
    gap: "12px",
    marginBottom: "18px",
  });
  for (const [title, text] of [
    [english ? "Today's consensus" : "今日共识", consensus.consensus],
    [english ? "Main disagreement" : "主要分歧", consensus.divergence],
  ] as const) {
    const box = createEl("div", undefined, {
      border: "1px solid rgba(148,163,184,.18)",
      borderRadius: "16px",
      padding: "16px",
      background: "rgba(15,23,42,.22)",
    });
    box.appendChild(createEl("strong", title, { display: "block", marginBottom: "7px" }));
    box.appendChild(createEl("span", text, { opacity: ".78", lineHeight: "1.65" }));
    summaryGrid.appendChild(box);
  }
  panel.appendChild(summaryGrid);

  if (groups.length === 0) {
    panel.appendChild(createEl("div", english
      ? "No structured researcher view is available yet. The panel will fill automatically after the next X intelligence scan."
      : "当前还没有可结构化的研究者观点；下一轮 X 情报扫描后会自动补充。", {
      border: "1px dashed rgba(148,163,184,.35)",
      borderRadius: "16px",
      padding: "22px",
      opacity: ".75",
    }));
    return panel;
  }

  const theorySet = new Set<MultiViewTheory>();
  groups.forEach((group) => group.theories.forEach((theory) => theorySet.add(theory.theory)));
  const filters = createEl("div", undefined, {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "16px",
  });
  const filterButtons: Array<{ theory: string; button: HTMLButtonElement }> = [];
  filterButtons.push({ theory: "ALL", button: addPill(filters, english ? "All methods" : "全部方法", true) });
  [...theorySet].slice(0, 10).forEach((theory) => filterButtons.push({ theory, button: addPill(filters, theory) }));
  panel.appendChild(filters);

  const grid = createEl("div", undefined, {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))",
    gap: "14px",
  });
  const cards: Array<{ element: HTMLElement; theories: string[] }> = [];

  for (const group of groups) {
    const card = createEl("article", undefined, {
      border: "1px solid rgba(148,163,184,.18)",
      borderRadius: "18px",
      padding: "18px",
      background: "rgba(15,23,42,.24)",
      minWidth: "0",
    });
    const top = createEl("div", undefined, {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "12px",
      marginBottom: "10px",
    });
    top.appendChild(createEl("strong", group.code, { fontSize: "17px" }));
    top.appendChild(createEl("span", `${directionLabel(group.direction, english)} · ${horizonLabel(group.horizon, english)}`, {
      fontSize: "12px",
      opacity: ".78",
      whiteSpace: "nowrap",
    }));
    card.appendChild(top);

    const methodRow = createEl("div", undefined, { display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" });
    group.theories.forEach((item) => {
      const tag = createEl("span", item.theory, {
        border: "1px solid rgba(148,163,184,.22)",
        borderRadius: "999px",
        padding: "4px 8px",
        fontSize: "12px",
        opacity: ".88",
      });
      methodRow.appendChild(tag);
    });
    if (group.assets.length) {
      group.assets.forEach((asset) => methodRow.appendChild(createEl("span", asset, {
        borderRadius: "999px",
        padding: "4px 8px",
        fontSize: "12px",
        background: "rgba(59,130,246,.12)",
        opacity: ".88",
      })));
    }
    card.appendChild(methodRow);

    card.appendChild(createEl("div", english ? "Key view" : "核心观点", {
      fontSize: "12px",
      letterSpacing: ".08em",
      opacity: ".55",
      marginBottom: "5px",
    }));
    card.appendChild(createEl("p", group.summaries.join(" "), {
      margin: "0 0 12px",
      lineHeight: "1.75",
      fontSize: "14px",
    }));

    if (group.levels.length) {
      const levelLine = createEl("div", undefined, { display: "flex", flexWrap: "wrap", gap: "7px", marginBottom: "12px" });
      group.levels.forEach((level) => levelLine.appendChild(createEl("span", `${level.label} ${level.value}`, {
        fontSize: "12px",
        borderRadius: "8px",
        padding: "5px 7px",
        background: "rgba(148,163,184,.08)",
      })));
      card.appendChild(levelLine);
    }

    const primaryTheory = group.theories[0];
    if (primaryTheory) {
      card.appendChild(createEl("div", english ? "Method" : "理论 / 方法", {
        fontSize: "12px",
        letterSpacing: ".08em",
        opacity: ".55",
        marginBottom: "5px",
      }));
      card.appendChild(createEl("p", primaryTheory.explanation, {
        margin: "0",
        lineHeight: "1.65",
        fontSize: "13px",
        opacity: ".76",
      }));
    }

    grid.appendChild(card);
    cards.push({ element: card, theories: cardTheoryNames(group) });
  }
  panel.appendChild(grid);

  const setFilter = (theory: string) => {
    filterButtons.forEach((item) => {
      const active = item.theory === theory;
      item.button.style.background = active ? "rgba(124,58,237,.22)" : "rgba(15,23,42,.35)";
      item.button.style.borderColor = active ? "rgba(139,92,246,.8)" : "rgba(148,163,184,.25)";
    });
    cards.forEach((card) => {
      card.element.style.display = theory === "ALL" || card.theories.includes(theory) ? "block" : "none";
    });
  };
  filterButtons.forEach((item) => item.button.addEventListener("click", () => setFilter(item.theory)));

  return panel;
}

function fingerprintCandidates(candidates: MultiViewCandidate[]): string {
  return candidates
    .map((candidate) => `${candidate.brief.researcherCode}:${candidate.rawText.slice(0, 120)}`)
    .join("|")
    .slice(0, 6000);
}

function hideOriginalAlphaFeedContent(main: HTMLElement, panel: HTMLElement): void {
  Array.from(main.children).forEach((child) => {
    if (child === panel || !(child instanceof HTMLElement)) return;
    child.setAttribute(MULTI_VIEW_ORIGINAL_ATTR, "1");
    child.setAttribute("aria-hidden", "true");
    hideElement(child);
  });
}

function renameMultiViewNavigation(english: boolean): void {
  const label = english ? "Multi-View" : "多方观点";
  document.querySelectorAll<HTMLAnchorElement>('a[href*="/member/alpha-feed"]').forEach((anchorElement) => {
    const currentLabel = normalizeText(anchorElement.textContent);
    if (currentLabel.length <= 48 && currentLabel !== label) anchorElement.textContent = label;
    anchorElement.title = english ? "Daily anonymized analyst viewpoints" : "每日匿名多方观点";
  });
}

function enhanceMemberMultiView(): void {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const english = path.startsWith("/en/") || path === "/en";
  renameMultiViewNavigation(english);
  if (path !== "/member/alpha-feed" && path !== "/en/member/alpha-feed") return;

  const main = document.querySelector<HTMLElement>("main");
  if (!main) return;
  // V7.20.10.6: the member page now renders privacy-safe researcher cards on the server.
  // Do not scrape/rebuild that page in the browser; the old DOM reconstruction lost
  // researcher identity after public-attribution redaction and produced an empty panel.
  if (main.dataset.mooxServerMultiView === "1" || main.dataset.mooxAssetOpinionMatrix === "v720107" || main.querySelector('[data-moox-server-multi-view="1"], [data-moox-asset-opinion-matrix="v720107"]')) return;

  const originals = Array.from(main.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.id !== MULTI_VIEW_PANEL_ID,
  );
  const staging = createEl("div");
  originals.forEach((child) => staging.appendChild(child.cloneNode(true)));
  const candidates = collectMultiViewCandidates(staging);
  const groups = mergeMultiViewGroups(candidates);
  const fingerprint = fingerprintCandidates(candidates);
  const current = document.getElementById(MULTI_VIEW_PANEL_ID) as HTMLElement | null;
  if (current?.dataset.fingerprint === fingerprint) {
    hideOriginalAlphaFeedContent(main, current);
    return;
  }

  const panel = buildMultiViewPanel(groups, english);
  panel.dataset.fingerprint = fingerprint;
  current?.remove();
  main.prepend(panel);
  hideOriginalAlphaFeedContent(main, panel);

  // A final privacy scrub ensures the newly-rendered member panel cannot contain handles/URLs,
  // even if the upstream report format later changes unexpectedly.
  const visible = panel.innerText;
  if (/@[A-Za-z0-9_]{2,30}/.test(visible) || /(?:x\.com|twitter\.com)\//i.test(visible)) {
    panel.querySelectorAll<HTMLElement>("p,span,div,strong").forEach((element) => {
      if (!element.children.length) element.textContent = stripMultiViewIdentity(element.textContent ?? "");
    });
  }
}

// Keep these references in the client bundle intentionally: they are regression-protected pure helpers
// and document that identity stripping happens before member summaries are rendered.
void classifyMultiViewHorizon;
void summarizeMultiView;
void classifyMultiViewDirection;
void classifyMultiViewTheory;
void extractMultiViewLevels;

function applyCurrentRoute(): void {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  enhanceMemberMultiView();
  if (path === "/member/weekly" || path === "/en/member/weekly") {
    simplifyWeeklyPage();
  }
  if (path === "/" || path === "/en" || path === "/member/daily" || path === "/en/member/daily") {
    void repairDailyLevels();
  }
}

export default function SiteClarityGuards() {
  useEffect(() => {
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        applyCurrentRoute();
      });
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("popstate", schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", schedule);
    };
  }, []);

  return null;
}
