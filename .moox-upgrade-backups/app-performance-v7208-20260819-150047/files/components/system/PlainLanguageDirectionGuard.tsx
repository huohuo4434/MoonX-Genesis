"use client";

import { useEffect } from "react";

const EXACT: Record<string, string> = {
  整固: "震荡",
  盘整: "震荡",
  横盘: "震荡",
  区间整理: "震荡",
  偏强: "震荡上涨",
  修复上行: "震荡上涨",
  偏强确认: "震荡上涨",
  偏弱: "震荡下跌",
  回踩观察: "震荡下跌",
  探底回升: "先跌后涨",
  冲高回落: "先涨后跌",
  "Chan UNAVAILABLE": "缠论数据暂不可用",
  "UNAVAILABLE": "暂不可用",
};

const STOCK_SLUGS = new Set(["spcx", "googl", "google", "sndk", "nbis", "tsla", "lite", "mu", "skhy", "rklb", "asts", "cxmt"]);

function shouldSkip(element: Element | null): boolean {
  return Boolean(element?.closest("script,style,pre,code,textarea,input,select,option,[data-keep-raw-copy]"));
}

function normalizeTextNode(node: Text): void {
  const parent = node.parentElement;
  if (shouldSkip(parent)) return;
  const original = node.nodeValue ?? "";
  const trimmed = original.trim();
  const replacement = EXACT[trimmed];
  if (replacement && replacement !== trimmed) {
    node.nodeValue = original.replace(trimmed, replacement);
    return;
  }
  if (original.includes("Chan UNAVAILABLE")) node.nodeValue = original.replaceAll("Chan UNAVAILABLE", "缠论数据暂不可用");
}

function normalizeTree(root: ParentNode): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach(normalizeTextNode);
}

function hideLegacyAndWeekendCards(): void {
  const slug = window.location.pathname.match(/\/featured-stocks\/([^/?#]+)/)?.[1]?.toLowerCase() ?? "";
  const universal = document.querySelector('[data-weekly-derived-daily-panel="true"]');
  if (universal) {
    for (const heading of document.querySelectorAll("h1,h2,h3,h4")) {
      if (!heading.closest('[data-weekly-derived-daily-panel="true"]') && /下一期逐日路径|下一周逐日路径/.test(heading.textContent ?? "")) {
        const section = heading.closest("section") ?? heading.parentElement;
        if (section instanceof HTMLElement) section.style.display = "none";
      }
    }
  }
  if (!STOCK_SLUGS.has(slug)) return;
  for (const el of document.querySelectorAll("article,li,[class*='card'],[class*='rounded']")) {
    const text = el.textContent ?? "";
    const match = text.match(/20\d{2}-\d{2}-\d{2}/);
    if (!match || !/MOOX_WEEK_DERIVED|待验证|周末复核/.test(text)) continue;
    const day = new Date(`${match[0]}T12:00:00Z`).getUTCDay();
    if ((day === 0 || day === 6) && el instanceof HTMLElement) el.style.display = "none";
  }
}

export function PlainLanguageDirectionGuard() {
  useEffect(() => {
    normalizeTree(document.body);
    hideLegacyAndWeekendCards();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData" && mutation.target instanceof Text) normalizeTextNode(mutation.target);
        for (const node of mutation.addedNodes) {
          if (node instanceof Text) normalizeTextNode(node);
          else if (node instanceof HTMLElement) normalizeTree(node);
        }
      }
      hideLegacyAndWeekendCards();
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
