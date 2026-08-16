"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { WeeklyDerivedDailyPanel } from "@/components/watchlist/WeeklyDerivedDailyPanel";

const DIRECTION_WORDS = ["先跌后涨", "先涨后跌", "震荡上涨", "震荡下跌", "上涨", "下跌", "震荡", "整固", "偏强", "偏弱", "探底回升", "冲高回落"];

function detectPeriodFromPage(): unknown[] {
  const text = document.body.innerText;
  const ranges = [...text.matchAll(/(20\d{2}-\d{2}-\d{2})\s*(?:至|—|–|-)\s*(20\d{2}-\d{2}-\d{2})/g)];
  for (const range of ranges) {
    const index = range.index ?? 0;
    const nearby = text.slice(Math.max(0, index - 700), Math.min(text.length, index + 1400));
    const direction = DIRECTION_WORDS.find((word) => nearby.includes(word));
    if (direction) return [{ periodStart: range[1], periodEnd: range[2], direction, path: nearby.slice(0, 500) }];
  }
  return [];
}

export function WatchlistDailyDomFallback() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [periods, setPeriods] = useState<unknown[]>([]);
  const slug = useMemo(() => typeof window === "undefined" ? "" : (window.location.pathname.match(/\/featured-stocks\/([^/?#]+)/)?.[1] ?? ""), []);

  useEffect(() => {
    if (!slug) return;
    const timer = window.setTimeout(() => {
      if (document.querySelector('[data-weekly-derived-daily-panel="true"]')) return;
      const found = detectPeriodFromPage();
      if (!found.length) return;
      const node = document.createElement("div");
      node.dataset.watchlistDailyDomFallback = "true";
      const footer = document.querySelector("footer");
      if (footer?.parentElement) footer.parentElement.insertBefore(node, footer);
      else document.body.appendChild(node);
      setPeriods(found);
      setHost(node);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [slug]);

  if (!host || !periods.length) return null;
  return createPortal(<WeeklyDerivedDailyPanel assetSlug={slug} periods={periods} />, host);
}
