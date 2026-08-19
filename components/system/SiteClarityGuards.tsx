"use client";

import { useEffect } from "react";

// MOOX_SITE_CLARITY_V72092

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
  if (element.dataset.mooxV72092Hidden === "1") return;
  element.dataset.mooxV72092Hidden = "1";
  element.dataset.mooxV72092Display = element.style.display;
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
      if (supportCell.dataset.mooxV72092Level === "1") return;
      if (!isOvertightPair(elementText(supportCell), elementText(resistanceCell))) return;

      const snapshot = await loadActionable(symbol);
      if (!snapshot) return;
      supportCell.textContent = formatZone(snapshot.support, symbol);
      resistanceCell.textContent = formatZone(snapshot.resistance, symbol);
      supportCell.dataset.mooxV72092Level = "1";
      resistanceCell.dataset.mooxV72092Level = "1";
      supportCell.title = "1H有效结构支撑";
      resistanceCell.title = "1H有效结构压力";
    }),
  );
}

function applyCurrentRoute(): void {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
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
